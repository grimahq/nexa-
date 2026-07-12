import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateProductDescription(productName: string, category: string, brandColor?: string) {
  const prompt = `Generate a compelling, concise, and professional product description for a product named "${productName}" in the category "${category}". 
  The tone should be persuasive and suitable for social commerce (WhatsApp/Facebook). 
  Keep it under 300 characters. 
  Include some relevant emojis. 
  Do not include placeholders like [Price] or [Link].`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Failed to generate description");
  }
}
