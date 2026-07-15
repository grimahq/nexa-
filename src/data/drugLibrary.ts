export interface DrugLibraryItem {
  id: string;
  name: string;
  category: string;
  description: string;
  manufacturer: string;
  activeIngredient: string;
  dosageForm: string;
  requiresPrescription: boolean;
  imageUrl: string | null;
  emoji: string;
  symptoms: string[];
}

export const DRUG_LIBRARY: DrugLibraryItem[] = [
  {
    id: "med-001",
    name: "Paracetamol 500mg",
    category: "Analgesics & Antipyretics",
    description: "For rapid relief of mild to moderate pain including headache, toothache, and lowering fever.",
    manufacturer: "Emzor Pharmaceuticals",
    activeIngredient: "Paracetamol 500mg",
    dosageForm: "Tablet",
    requiresPrescription: false,
    imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=60",
    emoji: "💊",
    symptoms: ["pain", "headache", "fever", "body pain", "toothache"]
  },
  {
    id: "med-002",
    name: "Amartem Softgel",
    category: "Antimalarials",
    description: "Artemisinin-based combination therapy (ACT) designed for fast action in treating acute uncomplicated malaria infections.",
    manufacturer: "Fidson Healthcare Plc",
    activeIngredient: "Artemether 80mg + Lumefantrine 480mg",
    dosageForm: "Capsule",
    requiresPrescription: false,
    imageUrl: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=300&auto=format&fit=crop&q=60",
    emoji: "🟩",
    symptoms: ["malaria", "fever", "chills", "body weakness", "sweating"]
  },
  {
    id: "med-003",
    name: "Coartem 80/480",
    category: "Antimalarials",
    description: "Premium antimalarial medication. Highly effective multi-dose therapy for malaria fever clearance.",
    manufacturer: "Novartis Nigeria",
    activeIngredient: "Artemether 20mg + Lumefantrine 120mg",
    dosageForm: "Tablet",
    requiresPrescription: false,
    imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=60",
    emoji: "💊",
    symptoms: ["malaria", "high fever", "shivering", "joint pain"]
  },
  {
    id: "med-004",
    name: "Amoxil 500mg",
    category: "Antibiotics",
    description: "Broad-spectrum penicillin antibiotic used to treat various bacterial infections of the ear, throat, and lungs.",
    manufacturer: "GlaxoSmithKline (GSK)",
    activeIngredient: "Amoxicillin 500mg",
    dosageForm: "Capsule",
    requiresPrescription: true,
    imageUrl: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300&auto=format&fit=crop&q=60",
    emoji: "💊",
    symptoms: ["infection", "bacterial infection", "sore throat", "cough", "pneumonia"]
  },
  {
    id: "med-005",
    name: "Augmentin 625mg",
    category: "Antibiotics",
    description: "Co-amoxiclav formulation. Combines amoxicillin and clavulanate potassium to overcome resistant bacterial strains.",
    manufacturer: "GlaxoSmithKline (GSK)",
    activeIngredient: "Amoxicillin + Clavulanic Acid 625mg",
    dosageForm: "Tablet",
    requiresPrescription: true,
    imageUrl: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300&auto=format&fit=crop&q=60",
    emoji: "💊",
    symptoms: ["severe infection", "chest infection", "bacterial infection", "sinusitis"]
  },
  {
    id: "med-006",
    name: "Gaviscon Double Action",
    category: "Antacids & Gastrointestinal",
    description: "Rapidly neutralizes excess stomach acid and forms a protective raft over stomach contents to prevent acid reflux.",
    manufacturer: "Reckitt Benckiser",
    activeIngredient: "Sodium Alginate + Calcium Carbonate",
    dosageForm: "Liquid/Suspension",
    requiresPrescription: false,
    imageUrl: "https://images.unsplash.com/photo-1550572017-edd951b55104?w=300&auto=format&fit=crop&q=60",
    emoji: "🧪",
    symptoms: ["heartburn", "acid reflux", "indigestion", "stomach burn", "bloating"]
  },
  {
    id: "med-007",
    name: "Panadol Extra",
    category: "Analgesics & Antipyretics",
    description: "Advanced formulation combining paracetamol and caffeine for enhanced, tough pain relief.",
    manufacturer: "GlaxoSmithKline (GSK)",
    activeIngredient: "Paracetamol 500mg + Caffeine 65mg",
    dosageForm: "Tablet",
    requiresPrescription: false,
    imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=60",
    emoji: "🟥",
    symptoms: ["severe headache", "backache", "muscle pain", "migraine", "fever"]
  },
  {
    id: "med-008",
    name: "Ventolin Inhaler",
    category: "Antiasthmatics",
    description: "Salbutamol inhaler providing rapid relief from asthma symptoms, bronchospasms, and chest tightness.",
    manufacturer: "GlaxoSmithKline (GSK)",
    activeIngredient: "Salbutamol 100mcg",
    dosageForm: "Inhaler",
    requiresPrescription: true,
    imageUrl: "https://images.unsplash.com/photo-1550572017-4f3b241c8f02?w=300&auto=format&fit=crop&q=60",
    emoji: "💨",
    symptoms: ["asthma", "wheezing", "shortness of breath", "chest tightness"]
  },
  {
    id: "med-009",
    name: "Insulin Lantus SoloSTAR",
    category: "Antidiabetics & Insulin",
    description: "Long-acting basal insulin for the treatment of diabetes mellitus to regulate blood sugar levels.",
    manufacturer: "Sanofi-Aventis",
    activeIngredient: "Insulin Glargine 100 U/mL",
    dosageForm: "Injection Pen",
    requiresPrescription: true,
    imageUrl: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=300&auto=format&fit=crop&q=60",
    emoji: "💉",
    symptoms: ["diabetes", "high blood sugar", "insulin deficiency"]
  },
  {
    id: "med-010",
    name: "Loratadine 10mg",
    category: "Antihistamines & Allergy",
    description: "Non-drowsy antihistamine for 24-hour relief from sneezing, runny nose, itchy eyes, and skin allergies.",
    manufacturer: "Shalina Healthcare",
    activeIngredient: "Loratadine 10mg",
    dosageForm: "Tablet",
    requiresPrescription: false,
    imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=60",
    emoji: "💊",
    symptoms: ["allergy", "sneezing", "runny nose", "itching", "hay fever", "rashes"]
  },
  {
    id: "med-011",
    name: "Loxagyl 400mg",
    category: "Antiprotozoal & Antibacterial",
    description: "Metronidazole tablets for anaerobic bacterial infections, amoebiasis, and giardiasis.",
    manufacturer: "May & Baker Nigeria Plc",
    activeIngredient: "Metronidazole 400mg",
    dosageForm: "Tablet",
    requiresPrescription: true,
    imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=60",
    emoji: "💊",
    symptoms: ["diarrhea", "infection", "stomach infection", "amoebiasis"]
  },
  {
    id: "med-012",
    name: "Lonart DS",
    category: "Antimalarials",
    description: "Double strength artemether-lumefantrine malaria treatment for fast eradication of plasmodium parasites.",
    manufacturer: "Greenlife Pharmaceuticals",
    activeIngredient: "Artemether 80mg + Lumefantrine 480mg",
    dosageForm: "Tablet",
    requiresPrescription: false,
    imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=60",
    emoji: "💊",
    symptoms: ["malaria", "fever", "shivering", "malaria chills"]
  },
  {
    id: "med-013",
    name: "Chewable Vitamin C 500mg",
    category: "Vitamins & Supplements",
    description: "Premium chewable orange-flavored Vitamin C for immune system defense and antioxidant support.",
    manufacturer: "Emzor Pharmaceuticals",
    activeIngredient: "Ascorbic Acid 500mg",
    requiresPrescription: false,
    dosageForm: "Chewable Tablet",
    imageUrl: "https://images.unsplash.com/photo-1616679911721-eff6eec18fcd?w=300&auto=format&fit=crop&q=60",
    emoji: "🍊",
    symptoms: ["vitamin deficiency", "low immunity", "cold prevention", "fatigue"]
  },
  {
    id: "med-014",
    name: "Amlodipine 10mg",
    category: "Cardiovascular / Antihypertensives",
    description: "Calcium channel blocker for managing high blood pressure and preventing angina.",
    manufacturer: "Shalina Healthcare",
    activeIngredient: "Amlodipine Besylate 10mg",
    dosageForm: "Tablet",
    requiresPrescription: true,
    imageUrl: null,
    emoji: "💊",
    symptoms: ["high blood pressure", "hypertension", "angina", "chest pain"]
  },
  {
    id: "med-015",
    name: "Coflin Cough Syrup",
    category: "Cough, Cold & Respiratory",
    description: "Expectorant and cough suppressant to relieve chesty coughs and ease throat tickles.",
    manufacturer: "Emzor Pharmaceuticals",
    activeIngredient: "Diphenhydramine + Ammonium Chloride",
    dosageForm: "Syrup/Liquid",
    requiresPrescription: false,
    imageUrl: "https://images.unsplash.com/photo-1550572017-edd951b55104?w=300&auto=format&fit=crop&q=60",
    emoji: "🧪",
    symptoms: ["cough", "catarrh", "chest congestion", "throat irritation", "runny nose"]
  }
];
