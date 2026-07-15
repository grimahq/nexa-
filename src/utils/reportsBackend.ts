import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, Firestore } from "firebase/firestore";

export interface ReportPreferences {
  frequency: "daily" | "weekly" | "monthly" | "off";
  lastSentAt?: string;
  recipientEmail: string;
}

export interface ReportDeliveryRecord {
  id: string;
  storeId: string;
  recipientEmail: string;
  frequency: string;
  status: "pending" | "delivered" | "failed";
  sentAt: string;
  error?: string;
  summary: {
    revenueNgn: number;
    transactionCount: number;
    averageTransactionNgn: number;
    topSellingItem: string;
    lowStockCount: number;
  };
  gmailQuotaUsedThisDay: number;
  simulated?: boolean;
}

export interface EmailProvider {
  send(
    to: string,
    subject: string,
    htmlBody: string,
    attachments: Array<{ filename: string; content: Buffer }>
  ): Promise<{ success: boolean; simulated: boolean; error?: string }>;
}

export class GmailApiEmailProvider implements EmailProvider {
  private accessToken: string | null = null;

  constructor() {
    // Attempt to read from environment variables first
    this.accessToken = process.env.GMAIL_ACCESS_TOKEN || null;
  }

  async send(
    to: string,
    subject: string,
    htmlBody: string,
    attachments: Array<{ filename: string; content: Buffer }>
  ): Promise<{ success: boolean; simulated: boolean; error?: string }> {
    if (!this.accessToken) {
      console.warn(
        "[Gmail API]: GMAIL_ACCESS_TOKEN environment variable not set. Falling back to sandbox delivery simulation."
      );
      return { success: true, simulated: true };
    }

    try {
      const mimeMessage = this.buildMimeMessage(to, subject, htmlBody, attachments);

      const response = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            raw: mimeMessage,
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gmail API returned status ${response.status}: ${errText}`);
      }

      console.log(`[Gmail API]: Email successfully sent to ${to}`);
      return { success: true, simulated: false };
    } catch (error) {
      console.error("[Gmail API]: Send failed:", error);
      return { success: false, simulated: false, error: (error as Error).message };
    }
  }

  private buildMimeMessage(
    to: string,
    subject: string,
    htmlBody: string,
    attachments: Array<{ filename: string; content: Buffer }>
  ): string {
    const boundary = "----=_Part_" + Date.now().toString(16);
    const nl = "\r\n";

    let mime = "";
    mime += `To: ${to}${nl}`;
    mime += `Subject: ${subject}${nl}`;
    mime += `MIME-Version: 1.0${nl}`;
    mime += `Content-Type: multipart/mixed; boundary="${boundary}"${nl}${nl}`;

    // HTML body
    mime += `--${boundary}${nl}`;
    mime += `Content-Type: text/html; charset="UTF-8"${nl}`;
    mime += `Content-Transfer-Encoding: 7bit${nl}${nl}`;
    mime += `${htmlBody}${nl}${nl}`;

    // Attachments
    for (const att of attachments) {
      mime += `--${boundary}${nl}`;
      mime += `Content-Type: application/pdf; name="${att.filename}"${nl}`;
      mime += `Content-Disposition: attachment; filename="${att.filename}"${nl}`;
      mime += `Content-Transfer-Encoding: base64${nl}${nl}`;
      mime += `${att.content.toString("base64")}${nl}${nl}`;
    }

    mime += `--${boundary}--`;

    return Buffer.from(mime)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
}

export interface ReportSummary {
  revenueNgn: number;
  transactionCount: number;
  averageTransactionNgn: number;
  topSellingItem: string;
  lowStockCount: number;
}

// PDF Generation and Data Aggregation Logic
export async function generateReportDataAndPDF(
  db: Firestore,
  store: { id: string; storeSlug?: string; storeName?: string; name?: string },
  frequency: "daily" | "weekly" | "monthly"
): Promise<{ summary: ReportSummary; pdfBuffer: Buffer; htmlBody: string }> {
  const { jsPDF } = await import("jspdf");

  const storeId = store.id;
  const storeSlug = store.storeSlug || storeId;
  const storeName = store.storeName || store.name || "Nexa OS Merchant";

  // Calculate dates
  const now = new Date();
  const startDate = new Date();
  if (frequency === "daily") {
    startDate.setDate(now.getDate() - 1);
  } else if (frequency === "weekly") {
    startDate.setDate(now.getDate() - 7);
  } else {
    startDate.setMonth(now.getMonth() - 1);
  }

  // Query sales
  const salesQuery = query(
    collection(db, "sales"),
    where("storeId", "==", storeId),
    where("createdAt", ">=", startDate.toISOString())
  );
  const salesSnap = await getDocs(salesQuery);

  let revenueNgn = 0;
  let transactionCount = 0;
  const itemsSoldMap: Record<string, number> = {};

  salesSnap.forEach((doc) => {
    const sale = doc.data();
    revenueNgn += sale.totalNgn || 0;
    transactionCount++;

    if (Array.isArray(sale.items)) {
      sale.items.forEach((item: { itemName: string; quantity?: number }) => {
        const qty = item.quantity || 0;
        itemsSoldMap[item.itemName] = (itemsSoldMap[item.itemName] || 0) + qty;
      });
    }
  });

  // Top selling item
  let topSellingItem = "None";
  let maxQty = 0;
  for (const [name, qty] of Object.entries(itemsSoldMap)) {
    if (qty > maxQty) {
      maxQty = qty;
      topSellingItem = name;
    }
  }

  // Average transaction size
  const averageTransactionNgn = transactionCount > 0 ? revenueNgn / transactionCount : 0;

  // Query low stock items
  const itemsQuery = query(collection(db, "items"), where("storeId", "==", storeId));
  const itemsSnap = await getDocs(itemsQuery);

  let lowStockCount = 0;
  const lowStockList: { name: string; sku: string; quantity: number; reorderPoint: number }[] = [];

  itemsSnap.forEach((doc) => {
    const item = doc.data();
    const qty = item.quantity || 0;
    const reorderPoint = item.reorderPoint !== undefined ? item.reorderPoint : 5;

    if (qty <= reorderPoint) {
      lowStockCount++;
      if (lowStockList.length < 5) {
        lowStockList.push({
          name: item.name,
          sku: item.sku || "N/A",
          quantity: qty,
          reorderPoint,
        });
      }
    }
  });

  // Query referral details for Agent signature/footer
  let referralNote = "";
  try {
    const referralsQuery = query(collection(db, "referrals"), where("storeId", "==", storeId));
    const referralsSnap = await getDocs(referralsQuery);
    if (!referralsSnap.empty) {
      const referralData = referralsSnap.docs[0].data();
      const agentId = referralData.agentId;

      const agentSnap = await getDoc(doc(db, "agents", agentId));
      if (agentSnap.exists()) {
        const agentData = agentSnap.data();
        const code = agentData.referralCode || agentId.slice(0, 6).toUpperCase();
        referralNote = `This report was prepared for you by Agent ${agentData.fullName || agentData.name} (Code: ${code}). Need assistance with your NEXAOS store? Contact your agent!`;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch referral details for report footer:", err);
  }

  const fmtCurrency = (val: number) => {
    return "₦" + Math.round(val).toLocaleString("en-NG");
  };

  // Generate HTML Email Body
  const htmlBody = `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
      <div style="background-color: #0d9488; padding: 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em; text-transform: uppercase;">NEXAOS BUSINESS INSIGHTS</h1>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">${frequency.toUpperCase()} PERFORMANCE SUMMARY</p>
      </div>
      <div style="padding: 24px; color: #1e293b; line-height: 1.5;">
        <h2 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0f172a;">Hello ${storeName},</h2>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569;">
          Here is your business performance summary for the period of <strong>${startDate.toLocaleDateString()}</strong> to <strong>${now.toLocaleDateString()}</strong>. Your full analytics PDF is attached.
        </p>
        
        <!-- KPIs -->
        <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
          <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 4px;">Total Revenue</div>
            <div style="font-size: 18px; font-weight: 700; color: #0d9488;">${fmtCurrency(revenueNgn)}</div>
          </div>
          <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 4px;">Transactions</div>
            <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${transactionCount}</div>
          </div>
        </div>

        <div style="margin-bottom: 24px; font-size: 14px; background-color: #f0fdfa; border: 1px solid #ccfbf1; padding: 16px; border-radius: 8px;">
          <ul style="margin: 0; padding-left: 20px; color: #115e59;">
            <li style="margin-bottom: 6px;"><strong>Top Selling Item:</strong> ${topSellingItem}</li>
            <li style="margin-bottom: 6px;"><strong>Avg. Ticket Value:</strong> ${fmtCurrency(averageTransactionNgn)}</li>
            <li><strong>Low Stock Alerts:</strong> ${lowStockCount} items need attention</li>
          </ul>
        </div>

        ${
          referralNote
            ? `<p style="margin: 0 0 20px 0; font-size: 12px; color: #2563eb; background-color: #eff6ff; padding: 12px; border-radius: 8px; border: 1px solid #bfdbfe; font-style: italic;">💡 ${referralNote}</p>`
            : ""
        }

        ${
          store.subscriptionTier === "starter" || !store.subscriptionTier
            ? `<p style="margin: 0 0 20px 0; font-size: 12px; color: #0f766e; background-color: #f0fdf4; padding: 10px 14px; border-radius: 8px; font-weight: 500; text-align: center; border: 1px solid #bbf7d0;">📈 Want Daily Performance Reports? <a href="#" style="color: #115e59; font-weight: 700; text-decoration: underline;">Upgrade to Nexa Professional</a> for daily automated analytics deliverable right to your inbox!</p>`
            : ""
        }

        <p style="margin: 0 0 24px 0; font-size: 13px; color: #64748b;">
          Please find the attached PDF report for the complete breakdown, low stock items warning, and transaction registries.
        </p>

        <!-- Brand Signature (Part D) -->
        <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; align-items: center; gap: 12px;">
          <!-- Hosted Light Animated GIF (< 500KB) -->
          <img src="https://i.imgur.com/8Qp4R3T.gif" alt="Nexa Technologies Logo" width="100" style="display: block; border-radius: 6px;" />
          <div>
            <div style="font-weight: 700; font-size: 14px; color: #0f172a;">Nexa Technologies Team</div>
            <div style="font-size: 12px; color: #0d9488; font-weight: 600;">NEXAOS — Intelligent Operations Suite</div>
            <div style="font-size: 11px; color: #94a3b8;">Email Support: nexatechnologies.dev@gmail.com</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Create jsPDF Report Document
  const docPdf = new jsPDF({ unit: "mm", format: "a4" });

  // Branded margins & variables
  const marginX = 20;
  let y = 20;

  // Header Title
  docPdf.setFillColor(13, 148, 136); // Teal #0d9488
  docPdf.rect(0, 0, 210, 40, "F");

  docPdf.setTextColor(255, 255, 255);
  docPdf.setFontSize(22);
  docPdf.setFont("helvetica", "bold");
  docPdf.text("NEXAOS PERFORMANCE REPORT", marginX, 18);

  docPdf.setFontSize(10);
  docPdf.setFont("helvetica", "normal");
  docPdf.text(
    `Store: ${storeName} | Period: ${startDate.toLocaleDateString()} - ${now.toLocaleDateString()}`,
    marginX,
    26
  );
  docPdf.text(`Generation Frequency: ${frequency.toUpperCase()}`, marginX, 32);

  y = 55;

  // Section 1: KPI Dashboard
  docPdf.setTextColor(15, 23, 42); // slate-900
  docPdf.setFontSize(14);
  docPdf.setFont("helvetica", "bold");
  docPdf.text("Business Performance Highlights", marginX, y);
  y += 8;

  docPdf.setDrawColor(226, 232, 240); // border-slate-200
  docPdf.line(marginX, y, 190, y);
  y += 12;

  // Draw KPI Boxes
  const boxW = 50;
  const boxH = 22;

  // Revenue Box
  docPdf.setFillColor(248, 250, 252); // slate-50
  docPdf.rect(marginX, y, boxW, boxH, "F");
  docPdf.setDrawColor(241, 245, 249);
  docPdf.rect(marginX, y, boxW, boxH, "S");
  docPdf.setFontSize(9);
  docPdf.setTextColor(100, 116, 139); // slate-500
  docPdf.text("TOTAL REVENUE", marginX + 5, y + 6);
  docPdf.setFontSize(13);
  docPdf.setFont("helvetica", "bold");
  docPdf.setTextColor(13, 148, 136); // Teal
  docPdf.text(fmtCurrency(revenueNgn), marginX + 5, y + 15);

  // Transactions Box
  docPdf.setFillColor(248, 250, 252);
  docPdf.rect(marginX + boxW + 10, y, boxW, boxH, "F");
  docPdf.rect(marginX + boxW + 10, y, boxW, boxH, "S");
  docPdf.setFontSize(9);
  docPdf.setFont("helvetica", "normal");
  docPdf.setTextColor(100, 116, 139);
  docPdf.text("TRANSACTIONS", marginX + boxW + 15, y + 6);
  docPdf.setFontSize(13);
  docPdf.setFont("helvetica", "bold");
  docPdf.setTextColor(15, 23, 42);
  docPdf.text(transactionCount.toString(), marginX + boxW + 15, y + 15);

  // Average Ticket Box
  docPdf.setFillColor(248, 250, 252);
  docPdf.rect(marginX + (boxW + 10) * 2, y, boxW, boxH, "F");
  docPdf.rect(marginX + (boxW + 10) * 2, y, boxW, boxH, "S");
  docPdf.setFontSize(9);
  docPdf.setFont("helvetica", "normal");
  docPdf.setTextColor(100, 116, 139);
  docPdf.text("AVG ORDER VALUE", marginX + (boxW + 10) * 2 + 5, y + 6);
  docPdf.setFontSize(13);
  docPdf.setFont("helvetica", "bold");
  docPdf.setTextColor(15, 23, 42);
  docPdf.text(fmtCurrency(averageTransactionNgn), marginX + (boxW + 10) * 2 + 5, y + 15);

  y += boxH + 15;

  // Section 2: Summary Stats List
  docPdf.setFontSize(11);
  docPdf.setTextColor(15, 23, 42);
  docPdf.setFont("helvetica", "bold");
  docPdf.text("Key Product and Stock Insights", marginX, y);
  y += 6;
  docPdf.line(marginX, y, 190, y);
  y += 10;

  docPdf.setFontSize(10);
  docPdf.setFont("helvetica", "normal");
  docPdf.text(`• Top-Performing Catalog Product (by sales count):  ${topSellingItem}`, marginX + 5, y);
  y += 6;
  docPdf.text(
    `• Average Customer Ticket spend on Nexa POS:          ${fmtCurrency(averageTransactionNgn)}`,
    marginX + 5,
    y
  );
  y += 6;
  docPdf.text(`• Total low stock items requiring immediate reorder:    ${lowStockCount} products`, marginX + 5, y);
  y += 15;

  // Section 3: Low Stock Warning Table
  docPdf.setFontSize(12);
  docPdf.setFont("helvetica", "bold");
  docPdf.text("Urgent Reorder Alert Desk", marginX, y);
  y += 6;
  docPdf.line(marginX, y, 190, y);
  y += 10;

  if (lowStockList.length === 0) {
    docPdf.setFontSize(10);
    docPdf.setFont("helvetica", "italic");
    docPdf.setTextColor(13, 148, 136);
    docPdf.text("✔ All items are currently well-stocked. Great job!", marginX + 5, y);
    y += 10;
  } else {
    docPdf.setFontSize(9);
    docPdf.setFont("helvetica", "bold");
    docPdf.setTextColor(100, 116, 139);
    docPdf.text("Product Name", marginX, y);
    docPdf.text("SKU", marginX + 70, y);
    docPdf.text("Stock Qty", marginX + 110, y);
    docPdf.text("Reorder Point", marginX + 140, y);
    y += 4;
    docPdf.line(marginX, y, 190, y);
    y += 6;

    docPdf.setFont("helvetica", "normal");
    docPdf.setTextColor(15, 23, 42);

    lowStockList.forEach((li) => {
      docPdf.text(li.name.length > 32 ? li.name.slice(0, 30) + "..." : li.name, marginX, y);
      docPdf.text(li.sku, marginX + 70, y);
      docPdf.text(li.quantity.toString(), marginX + 110, y);
      docPdf.text(li.reorderPoint.toString(), marginX + 140, y);
      y += 6;
    });
  }

  y += 15;

  // Footer & Referral Banner
  docPdf.setFillColor(241, 245, 249);
  docPdf.rect(marginX, y, 170, 24, "F");

  docPdf.setFontSize(8.5);
  docPdf.setTextColor(30, 41, 59);
  docPdf.setFont("helvetica", "bold");
  docPdf.text("NEXA REFERRAL PROGRAM", marginX + 5, y + 6);
  docPdf.setFont("helvetica", "normal");
  docPdf.setTextColor(71, 85, 105);
  docPdf.text(
    "Earn 15% recurring commission on premium licenses for merchants you onboard.",
    marginX + 5,
    y + 11
  );
  docPdf.text(
    referralNote ? referralNote.slice(0, 95) + "..." : "Share NexaOS and scale together!",
    marginX + 5,
    y + 16
  );

  y += 35;

  // Document Signature line
  docPdf.setFontSize(8);
  docPdf.setTextColor(148, 163, 184); // Slate 400
  docPdf.text(
    "CONFIDENTIAL — Prepared exclusively for the recipient store by Nexa Technologies. Generated in Nigeria.",
    105,
    285,
    { align: "center" }
  );

  const pdfOutput = docPdf.output("arraybuffer");
  const pdfBuffer = Buffer.from(pdfOutput);

  return { summary: { revenueNgn, transactionCount, averageTransactionNgn, topSellingItem, lowStockCount }, pdfBuffer, htmlBody };
}

// Scheduled Trigger Evaluation logic
export async function runScheduledReportsEvaluation(db: Firestore): Promise<{
  status: string;
  processedCount: number;
  sentCount: number;
  skippedCount: number;
  quotaExceeded: boolean;
}> {
  try {
    const storesSnap = await getDocs(collection(db, "stores"));
    let processedCount = 0;
    let sentCount = 0;
    let skippedCount = 0;
    let quotaExceeded = false;

    // Determine total deliveries sent on the current date (Volume Guard)
    const todayStr = new Date().toISOString().split("T")[0];
    const deliveriesQuery = query(
      collection(db, "reportDeliveries"),
      where("status", "==", "delivered"),
      where("sentAt", ">=", todayStr)
    );
    const deliveriesSnap = await getDocs(deliveriesQuery);
    let runningQuotaToday = deliveriesSnap.size;

    const emailProvider = new GmailApiEmailProvider();

    for (const storeDoc of storesSnap.docs) {
      const storeData = storeDoc.data();
      const storeId = storeDoc.id;
      const prefs = storeData.reportPreferences as ReportPreferences | undefined;

      if (!prefs || !prefs.frequency || prefs.frequency === "off") {
        skippedCount++;
        continue;
      }

      const freq = prefs.frequency;
      const lastSentStr = prefs.lastSentAt;

      // Tier gating validation: Daily reports require premium subscription
      if (freq === "daily" && storeData.subscriptionTier === "starter") {
        console.log(`[Scheduled Reports]: Gating Daily reports for Starter Store ${storeId}`);
        skippedCount++;
        continue;
      }

      // Check date diff
      const lastSent = lastSentStr ? new Date(lastSentStr) : new Date(0);
      const now = new Date();
      const diffMs = now.getTime() - lastSent.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      let due = false;
      if (freq === "daily" && diffDays >= 0.95) due = true;
      else if (freq === "weekly" && diffDays >= 6.9) due = true;
      else if (freq === "monthly" && diffDays >= 28) due = true;

      if (!due) {
        skippedCount++;
        continue;
      }

      processedCount++;

      // HARD VOLUME GUARD: 450 emails safety line
      if (runningQuotaToday >= 450) {
        console.warn(
          `[Scheduled Reports]: Volume guard triggered. Hard quota of 450 emails/day approached (current successful sent today: ${runningQuotaToday}). Delaying delivery for ${storeId}.`
        );
        quotaExceeded = true;

        // Log delayed/pending delivery in DB
        await addDoc(collection(db, "reportDeliveries"), {
          storeId,
          recipientEmail: prefs.recipientEmail || "merchant@nexaos.io",
          frequency: freq,
          status: "pending",
          sentAt: new Date().toISOString(),
          error: "Volume guard limit of 450 daily emails reached. Paused for user account safety.",
          summary: {
            revenueNgn: 0,
            transactionCount: 0,
            averageTransactionNgn: 0,
            topSellingItem: "N/A",
            lowStockCount: 0,
          },
          gmailQuotaUsedThisDay: runningQuotaToday,
        });

        continue;
      }

      // Generate Report Data & PDF
      try {
        const recipient = prefs.recipientEmail || "merchant@nexaos.io";
        const { summary, pdfBuffer, htmlBody } = await generateReportDataAndPDF(
          db,
          { id: storeId, ...storeData },
          freq as "daily" | "weekly" | "monthly"
        );

        // Send Email
        const subject = `[NEXAOS] ${freq.toUpperCase()} Business Performance & Stock Report - ${storeData.storeName || storeId}`;
        const pdfFilename = `nexaos_${freq}_report_${storeData.storeSlug || storeId}.pdf`;

        const res = await emailProvider.send(recipient, subject, htmlBody, [
          { filename: pdfFilename, content: pdfBuffer },
        ]);

        runningQuotaToday++;

        // Save delivery record
        await addDoc(collection(db, "reportDeliveries"), {
          storeId,
          recipientEmail: recipient,
          frequency: freq,
          status: res.success ? "delivered" : "failed",
          sentAt: new Date().toISOString(),
          error: res.error || null,
          summary,
          gmailQuotaUsedThisDay: runningQuotaToday,
          simulated: res.simulated,
        });

        if (res.success) {
          sentCount++;
          // Update store lastSentAt
          const storeRef = doc(db, "stores", storeId);
          await setDoc(
            storeRef,
            {
              reportPreferences: {
                ...prefs,
                lastSentAt: new Date().toISOString(),
              },
            },
            { merge: true }
          );
        }
      } catch (err) {
        console.error(`[Scheduled Reports]: Failed processing store ${storeId}:`, err);
        await addDoc(collection(db, "reportDeliveries"), {
          storeId,
          recipientEmail: prefs.recipientEmail || "merchant@nexaos.io",
          frequency: freq,
          status: "failed",
          sentAt: new Date().toISOString(),
          error: (err as Error).message,
          summary: {
            revenueNgn: 0,
            transactionCount: 0,
            averageTransactionNgn: 0,
            topSellingItem: "N/A",
            lowStockCount: 0,
          },
          gmailQuotaUsedThisDay: runningQuotaToday,
        });
      }
    }

    return {
      status: "success",
      processedCount,
      sentCount,
      skippedCount,
      quotaExceeded,
    };
  } catch (error) {
    console.error("[Scheduled Reports Manager error]:", error);
    throw error;
  }
}
