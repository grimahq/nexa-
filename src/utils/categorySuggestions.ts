import { SUPPORTED_UNITS, type Category } from "@/types/inventory";

export interface BuiltInProduct {
  name: string;
  categoryName: string;
  genericName?: string;
  defaultUnit: string;
  description: string;
  estimatedPrice?: number;
  emoji?: string;
}

export interface CategoryPreset {
  id: string;
  name: string;
  description: string;
  supportedUnits: string[]; // e.g. ["pcs", "pack", "box", "bottle", "vial"]
  defaultUnit: string;
  keywords: string[];
  emoji: string;
  builtInProducts: BuiltInProduct[];
}

export const CATEGORY_PRESETS: CategoryPreset[] = [
  {
    id: "pharmacy",
    name: "Pharmaceuticals & Medicines",
    description: "Prescription drugs, OTC medicines, health supplements and clinical items",
    supportedUnits: ["pcs", "pack", "box", "bottle", "vial", "bag"],
    defaultUnit: "pcs",
    emoji: "💊",
    keywords: [
      "tab", "tablet", "cap", "capsule", "syrup", "suspension", "injection", "mg", "ml", "gloclav",
      "paracetamol", "amoxicillin", "coartem", "ciprofloxacin", "panadol", "ibuprofen", "vitamin",
      "multivitamin", "cough", "eye drop", "ear drop", "antacid", "antibiotic", "malaria"
    ],
    builtInProducts: [
      { name: "Paracetamol 500mg", categoryName: "Pharmaceuticals & Medicines", genericName: "Paracetamol", defaultUnit: "pcs", description: "Analgesic and antipyretic for pain & fever relief.", estimatedPrice: 500, emoji: "💊" },
      { name: "Amoxicillin 500mg", categoryName: "Pharmaceuticals & Medicines", genericName: "Amoxicillin Trihydrate", defaultUnit: "pack", description: "Broad-spectrum oral antibiotic capsules.", estimatedPrice: 1500, emoji: "💊" },
      { name: "Coartem 80/480mg", categoryName: "Pharmaceuticals & Medicines", genericName: "Artemether / Lumefantrine", defaultUnit: "pack", description: "First-line ACT antimalarial treatment.", estimatedPrice: 2200, emoji: "💊" },
      { name: "Vitamin C 100mg Tablets", categoryName: "Pharmaceuticals & Medicines", genericName: "Ascorbic Acid", defaultUnit: "bottle", description: "Immune support dietary supplement.", estimatedPrice: 1000, emoji: "💊" },
      { name: "Ciprofloxacin 500mg", categoryName: "Pharmaceuticals & Medicines", genericName: "Ciprofloxacin", defaultUnit: "pack", description: "Fluoroquinolone antibiotic for bacterial infections.", estimatedPrice: 1800, emoji: "💊" },
      { name: "Benylin Expectorant Syrup 100ml", categoryName: "Pharmaceuticals & Medicines", genericName: "Diphenhydramine", defaultUnit: "bottle", description: "Cough and chest congestion syrup.", estimatedPrice: 2500, emoji: "🧪" },
    ]
  },
  {
    id: "beverages",
    name: "Beverages & Drinks",
    description: "Soft drinks, juices, mineral water, energy drinks, beers, spirits and malt beverages with cl/liter volumes",
    supportedUnits: ["bottle", "can", "crate", "case", "pack", "carton", "ltr", "ml", "cup", "pcs"],
    defaultUnit: "bottle",
    emoji: "🥤",
    keywords: [
      "coke", "pepsi", "water", "juice", "soda", "drink", "beer", "wine", "stout", "malt",
      "monster", "redbull", "fanta", "sprite", "chivita", "eva", "50cl", "33cl", "75cl", "1l", "1.5l", "liter", "cl", "beverage", "zobo", "kunu"
    ],
    builtInProducts: [
      { name: "Coca-Cola 50cl Plastic Bottle", categoryName: "Beverages & Drinks", defaultUnit: "bottle", description: "Refreshingly cold sparkling cola soft drink (50cl).", estimatedPrice: 300, emoji: "🥤" },
      { name: "Pepsi Cola 50cl Plastic Bottle", categoryName: "Beverages & Drinks", defaultUnit: "bottle", description: "Carbonated soft drink (50cl).", estimatedPrice: 300, emoji: "🥤" },
      { name: "Eva Mineral Water 75cl", categoryName: "Beverages & Drinks", defaultUnit: "bottle", description: "Purified natural drinking water (75cl).", estimatedPrice: 200, emoji: "💧" },
      { name: "Maltina Non-Alcoholic Drink 33cl", categoryName: "Beverages & Drinks", defaultUnit: "can", description: "Nourishing malt drink rich in vitamins (33cl).", estimatedPrice: 400, emoji: "🥤" },
      { name: "Chivita 100% Orange Juice 1L", categoryName: "Beverages & Drinks", defaultUnit: "pack", description: "Pure natural fruit juice without added sugar (1 Liter).", estimatedPrice: 1800, emoji: "🧃" },
      { name: "Monster Energy Drink 50cl", categoryName: "Beverages & Drinks", defaultUnit: "can", description: "High-performance energy drink with taurine (50cl).", estimatedPrice: 1200, emoji: "⚡" },
      { name: "Guinness Foreign Extra Stout 60cl", categoryName: "Beverages & Drinks", defaultUnit: "bottle", description: "Rich dark stout brewed with finest hops & barley (60cl).", estimatedPrice: 1100, emoji: "🍺" },
      { name: "Bigi Cola 33cl Can", categoryName: "Beverages & Drinks", defaultUnit: "can", description: "Sparkling cola soft drink (33cl).", estimatedPrice: 250, emoji: "🥤" },
    ]
  },
  {
    id: "groceries",
    name: "Groceries & FMCG",
    description: "Packaged foods, cooking staples, toiletries, and household goods",
    supportedUnits: ["pack", "kg", "g", "box", "bag", "mudu", "paint", "pcs"],
    defaultUnit: "pack",
    emoji: "🛒",
    keywords: [
      "rice", "noodle", "indomie", "sugar", "milk", "oil", "flour", "pasta", "spaghetti",
      "tomato", "soap", "detergent", "biscuit", "cereal", "oats", "garri", "semovita", "ketchup"
    ],
    builtInProducts: [
      { name: "Foreign Parboiled Rice 50kg Bag", categoryName: "Groceries & FMCG", defaultUnit: "bag", description: "Premium long grain parboiled rice.", estimatedPrice: 78000, emoji: "🌾" },
      { name: "Indomie Instant Noodles Super Pack (40 Crates)", categoryName: "Groceries & FMCG", defaultUnit: "box", description: "Chicken flavor instant noodles carton.", estimatedPrice: 14500, emoji: "🍜" },
      { name: "Golden Penny Refined Sugar 1kg", categoryName: "Groceries & FMCG", defaultUnit: "pack", description: "Pure white granulated sugar.", estimatedPrice: 1600, emoji: "🍬" },
      { name: "Peak Full Cream Milk Powder 400g Tin", categoryName: "Groceries & FMCG", defaultUnit: "pcs", description: "Rich creamy milk powder.", estimatedPrice: 4200, emoji: "🥛" },
      { name: "Mamador Pure Vegetable Oil 3 Liters", categoryName: "Groceries & FMCG", defaultUnit: "bottle", description: "Heart-friendly cholesterol free cooking oil.", estimatedPrice: 8500, emoji: "🧴" },
      { name: "Golden Penny Spaghetti 500g", categoryName: "Groceries & FMCG", defaultUnit: "pack", description: "Durum wheat semolina pasta.", estimatedPrice: 950, emoji: "🍝" },
    ]
  },
  {
    id: "electronics",
    name: "Electronics & Tech",
    description: "Phones, computers, cables, chargers, audio gear, and household appliances",
    supportedUnits: ["pcs", "pack", "box"],
    defaultUnit: "pcs",
    emoji: "📱",
    keywords: [
      "phone", "iphone", "samsung", "charger", "cable", "laptop", "usb", "bluetooth", "earbud",
      "headphone", "powerbank", "adapter", "tv", "screen", "monitor", "mouse", "keyboard", "watch"
    ],
    builtInProducts: [
      { name: "Apple iPhone 15 Pro Max 256GB", categoryName: "Electronics & Tech", defaultUnit: "pcs", description: "Titanium design, A17 Pro chip, 48MP camera.", estimatedPrice: 1650000, emoji: "📱" },
      { name: "Samsung Galaxy S24 Ultra 512GB", categoryName: "Electronics & Tech", defaultUnit: "pcs", description: "Galaxy AI powered flagship phone with S Pen.", estimatedPrice: 1550000, emoji: "📱" },
      { name: "USB-C Fast Charging Cable 65W 2 Meter", categoryName: "Electronics & Tech", defaultUnit: "pcs", description: "Nylon braided fast charging cable.", estimatedPrice: 3500, emoji: "🔌" },
      { name: "20000mAh Dual USB Power Bank", categoryName: "Electronics & Tech", defaultUnit: "pcs", description: "High capacity fast-charge portable battery.", estimatedPrice: 18500, emoji: "🔋" },
      { name: "Wireless Active Noise Cancelling Earbuds", categoryName: "Electronics & Tech", defaultUnit: "pcs", description: "HD audio with touch controls & charging case.", estimatedPrice: 14000, emoji: "🎧" },
    ]
  },
  {
    id: "fashion",
    name: "Fashion & Apparel",
    description: "Clothing, shoes, bags, accessories, and wearable items",
    supportedUnits: ["pcs", "pack", "box", "pair"],
    defaultUnit: "pcs",
    emoji: "👕",
    keywords: [
      "shirt", "t-shirt", "jeans", "trouser", "dress", "shoe", "sneaker", "boot", "bag",
      "handbag", "suit", "jacket", "hoodie", "gown", "cap", "belt", "sandal", "heel"
    ],
    builtInProducts: [
      { name: "Men Crewneck Cotton T-Shirt", categoryName: "Fashion & Apparel", defaultUnit: "pcs", description: "100% breathable premium cotton casual shirt.", estimatedPrice: 8500, emoji: "👕" },
      { name: "Women High-Waist Denim Jeans", categoryName: "Fashion & Apparel", defaultUnit: "pcs", description: "Stretch denim classic blue jeans.", estimatedPrice: 16000, emoji: "👖" },
      { name: "Unisex Cushion Sole Running Sneakers", categoryName: "Fashion & Apparel", defaultUnit: "pair", description: "Lightweight breathable athletic shoes.", estimatedPrice: 28000, emoji: "👟" },
      { name: "Designer Genuine Leather Handbag", categoryName: "Fashion & Apparel", defaultUnit: "pcs", description: "Elegant women luxury tote shoulder bag.", estimatedPrice: 45000, emoji: "👜" },
    ]
  },
  {
    id: "textiles",
    name: "Textiles & Fabrics",
    description: "Lace, Ankara, silk, cotton, wool, and tailoring materials",
    supportedUnits: ["m", "cm", "in", "ft", "yard", "roll", "pcs", "bundle"],
    defaultUnit: "yard",
    emoji: "🧵",
    keywords: [
      "fabric", "textile", "yard", "lace", "ankara", "cotton", "silk", "cashmere", "roll",
      "brocade", "velvet", "satin", "chiffon", "tailoring", "thread", "embroidery"
    ],
    builtInProducts: [
      { name: "Dutch Wax Original Ankara Fabric (6 Yards)", categoryName: "Textiles & Fabrics", defaultUnit: "yard", description: "100% vibrant printed African cotton fabric.", estimatedPrice: 25000, emoji: "🧵" },
      { name: "Swiss Voile Cotton Lace (5 Yards)", categoryName: "Textiles & Fabrics", defaultUnit: "yard", description: "High grade embroidered Swiss lace for occasions.", estimatedPrice: 65000, emoji: "✨" },
      { name: "Italian Wool Cashmere Suit Fabric", categoryName: "Textiles & Fabrics", defaultUnit: "yard", description: "Luxury tailored suit material per yard.", estimatedPrice: 12000, emoji: "👔" },
      { name: "Satin Silk Fabric Roll (50 Meters)", categoryName: "Textiles & Fabrics", defaultUnit: "roll", description: "Smooth glossy satin fabric for dressmaking.", estimatedPrice: 45000, emoji: "🧵" },
    ]
  },
  {
    id: "restaurant",
    name: "Restaurant & Prepared Meals",
    description: "Cooked dishes, fast foods, pastries, soups, and catering platters",
    supportedUnits: ["plate", "portion", "bowl", "pcs", "pack"],
    defaultUnit: "plate",
    emoji: "🍲",
    keywords: [
      "rice", "jollof", "soup", "egusi", "pounded yam", "suya", "chicken", "beef", "fish",
      "shawarma", "burger", "pizza", "fried rice", "pastry", "pie", "cake", "sauce", "meal"
    ],
    builtInProducts: [
      { name: "Smokey Jollof Rice with Fried Chicken", categoryName: "Restaurant & Prepared Meals", defaultUnit: "plate", description: "Served with plantain, salad & grilled chicken leg.", estimatedPrice: 4500, emoji: "🍛" },
      { name: "Egusi Soup with Pounded Yam & Goat Meat", categoryName: "Restaurant & Prepared Meals", defaultUnit: "plate", description: "Rich melon soup topped with stockfish & soft pounded yam.", estimatedPrice: 6000, emoji: "🍲" },
      { name: "Beef & Chicken Shawarma Special", categoryName: "Restaurant & Prepared Meals", defaultUnit: "pcs", description: "Wrapped in fresh pita with sausage & extra cream.", estimatedPrice: 3500, emoji: "🌯" },
      { name: "Peppered Goat Meat (Asun Special)", categoryName: "Restaurant & Prepared Meals", defaultUnit: "portion", description: "Spicy grilled goat meat with onions & habanero.", estimatedPrice: 5000, emoji: "🍖" },
    ]
  },
  {
    id: "agriculture",
    name: "Agro & Farm Produce",
    description: "Grains, tubers, livestock, seeds, fertilizers, and farm inputs",
    supportedUnits: ["kg", "g", "bag", "bundle", "mudu", "paint", "pcs"],
    defaultUnit: "kg",
    emoji: "🌾",
    keywords: [
      "yam", "tuber", "cassava", "garri", "corn", "maize", "fertilizer", "seed", "livestock",
      "poultry", "chicken", "fish", "mudu", "paint bucket", "feed", "pesticide"
    ],
    builtInProducts: [
      { name: "White Yam Tubers (5 Large Pieces)", categoryName: "Agro & Farm Produce", defaultUnit: "bundle", description: "Fresh harvested Abuja white yam tubers.", estimatedPrice: 15000, emoji: "🥔" },
      { name: "Ijebu Yellow Garri (1 Mudu)", categoryName: "Agro & Farm Produce", defaultUnit: "mudu", description: "Crispy sour yellow garri.", estimatedPrice: 2000, emoji: "🥣" },
      { name: "NPK 15-15-15 Farm Fertilizer 50kg Bag", categoryName: "Agro & Farm Produce", defaultUnit: "bag", description: "High yield balanced crop fertilizer.", estimatedPrice: 38000, emoji: "🌱" },
      { name: "Broiler Poultry Starter Feed 25kg", categoryName: "Agro & Farm Produce", defaultUnit: "bag", description: "Nutritional feed formula for chicks.", estimatedPrice: 19500, emoji: "🐥" },
    ]
  },
  {
    id: "construction",
    name: "Building & Hardware Supplies",
    description: "Cement, steel rods, piping, paint, timber, nails and construction tools",
    supportedUnits: ["pcs", "kg", "g", "m", "yard", "bag", "bundle"],
    defaultUnit: "pcs",
    emoji: "🏗️",
    keywords: [
      "cement", "rod", "iron", "pipe", "pvc", "nail", "paint", "emulsion", "timber", "plank",
      "roof", "sheet", "door", "lock", "block", "sand", "gravel", "steel", "hammer"
    ],
    builtInProducts: [
      { name: "Dangote 32.5R Portland Cement 50kg", categoryName: "Building & Hardware Supplies", defaultUnit: "bag", description: "High strength rapid hardening masonry cement.", estimatedPrice: 10500, emoji: "🧱" },
      { name: "High-Yield Steel Rebar Rod 12mm", categoryName: "Building & Hardware Supplies", defaultUnit: "pcs", description: "Reinforced structural steel rod per piece.", estimatedPrice: 9500, emoji: "🔩" },
      { name: "Dulux WeatherShield Emulsion Paint 20L", categoryName: "Building & Hardware Supplies", defaultUnit: "pcs", description: "Exterior weather resistant acrylic wall paint.", estimatedPrice: 48000, emoji: "🎨" },
      { name: "Pressure PVC Water Pipe 4-Inch (6 Meters)", categoryName: "Building & Hardware Supplies", defaultUnit: "pcs", description: "Durable plumbing pipe for drainage & supply.", estimatedPrice: 14000, emoji: "🚰" },
    ]
  }
];

/**
 * Predicts the category and suggested unit for a given product name string.
 */
export function predictCategoryAndUnit(
  productName: string,
  availableCategories: Category[] = []
): {
  matchedCategory: Category | null;
  suggestedCategoryName: string;
  suggestedUnit: string;
  confidence: "high" | "medium" | "low";
  reason?: string;
  builtInProduct?: BuiltInProduct;
} {
  if (!productName || productName.trim().length < 2) {
    return {
      matchedCategory: null,
      suggestedCategoryName: "",
      suggestedUnit: "pcs",
      confidence: "low",
    };
  }

  const query = productName.trim().toLowerCase();

  // 0. Check self-trained learned keywords from local behavior
  try {
    const rawLearned = typeof localStorage !== "undefined" ? localStorage.getItem("nexa_ai_learned_keywords") : null;
    if (rawLearned) {
      const learnedMap: Record<string, string> = JSON.parse(rawLearned);
      for (const [kw, catName] of Object.entries(learnedMap)) {
        if (query.includes(kw.toLowerCase())) {
          const existingCat = availableCategories.find((c) =>
            c.name.toLowerCase().includes(catName.toLowerCase().split(" ")[0])
          ) || null;
          return {
            matchedCategory: existingCat,
            suggestedCategoryName: catName,
            suggestedUnit: "pcs",
            confidence: "high",
            reason: `Self-Trained Model Match (Learned keyword "${kw}")`,
          };
        }
      }
    }
  } catch (e) {
    console.warn("Could not read learned keywords:", e);
  }

  // 1. Direct match with built-in product templates
  for (const preset of CATEGORY_PRESETS) {
    for (const p of preset.builtInProducts) {
      if (
        p.name.toLowerCase().includes(query) ||
        query.includes(p.name.toLowerCase().split(" ")[0])
      ) {
        // Find existing category in user's store
        const existingCat = availableCategories.find(
          (c) =>
            c.name.toLowerCase().includes(preset.name.toLowerCase().split(" ")[0]) ||
            preset.name.toLowerCase().includes(c.name.toLowerCase().split(" ")[0])
        ) || null;

        return {
          matchedCategory: existingCat,
          suggestedCategoryName: preset.name,
          suggestedUnit: p.defaultUnit,
          confidence: "high",
          reason: `Matched built-in template "${p.name}"`,
          builtInProduct: p,
        };
      }
    }
  }

  // 2. Keyword scoring across presets
  let bestPreset: CategoryPreset | null = null;
  let highestScore = 0;

  for (const preset of CATEGORY_PRESETS) {
    let score = 0;
    for (const kw of preset.keywords) {
      if (query.includes(kw)) {
        // Longer keyword matches give higher weights
        score += kw.length >= 5 ? 10 : 5;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestPreset = preset;
    }
  }

  if (bestPreset && highestScore > 0) {
    const existingCat = availableCategories.find(
      (c) =>
        c.name.toLowerCase().includes(bestPreset!.name.toLowerCase().split(" ")[0]) ||
        bestPreset!.name.toLowerCase().includes(c.name.toLowerCase().split(" ")[0])
    ) || null;

    return {
      matchedCategory: existingCat,
      suggestedCategoryName: bestPreset.name,
      suggestedUnit: bestPreset.defaultUnit,
      confidence: highestScore >= 10 ? "high" : "medium",
      reason: `Matches ${bestPreset.name} keywords`,
    };
  }

  return {
    matchedCategory: null,
    suggestedCategoryName: "",
    suggestedUnit: "pcs",
    confidence: "low",
  };
}

/**
 * Returns allowed supported units filtered by category name or category object.
 */
export function getCategorySupportedUnits(
  categoryNameOrId?: string | null,
  categoryObj?: Category | null
): { id: string; label: string; type: "count" | "weight" | "volume" | "length"; step: number }[] {
  // If category explicitly provides supportedUnits array
  if (categoryObj && categoryObj.supportedUnits && categoryObj.supportedUnits.length > 0) {
    const units = SUPPORTED_UNITS.filter((u) => categoryObj.supportedUnits!.includes(u.id));
    if (units.length > 0) return units;
  }

  if (categoryNameOrId) {
    const searchName = categoryNameOrId.toLowerCase();
    const matchedPreset = CATEGORY_PRESETS.find(
      (p) =>
        p.id === categoryNameOrId ||
        p.name.toLowerCase().includes(searchName) ||
        searchName.includes(p.id) ||
        searchName.includes(p.name.toLowerCase().split(" ")[0])
    );

    if (matchedPreset && matchedPreset.supportedUnits.length > 0) {
      return SUPPORTED_UNITS.filter((u) => matchedPreset.supportedUnits.includes(u.id));
    }
  }

  // Fallback to all standard supported units
  return SUPPORTED_UNITS;
}

/**
 * Returns all built-in product suggestions across presets or filtered by category.
 */
export function getBuiltInProductSuggestions(categoryNameOrId?: string): BuiltInProduct[] {
  if (!categoryNameOrId || categoryNameOrId === "all") {
    return CATEGORY_PRESETS.flatMap((p) => p.builtInProducts);
  }

  const search = categoryNameOrId.toLowerCase();
  const preset = CATEGORY_PRESETS.find(
    (p) =>
      p.id === search ||
      p.name.toLowerCase().includes(search) ||
      search.includes(p.name.toLowerCase().split(" ")[0])
  );

  return preset ? preset.builtInProducts : [];
}

export interface DistributorPreset {
  id: string;
  name: string;
  category: string; // e.g. "beverages", "pharmacy", "groceries", "electronics"
  categoryName: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  state: string;
  minOrderValueNgn: number;
  deliveryLeadDays: number;
  verified: boolean;
  brands: string[];
}

export const DISTRIBUTOR_PRESETS: DistributorPreset[] = [
  // Beverages Distributors
  {
    id: "dist-nb",
    name: "Nigerian Breweries Plc Depot",
    category: "beverages",
    categoryName: "Beverages & Drinks",
    contactPerson: "Chidi Opara (Sales Mgr)",
    contactPhone: "+234 803 111 2233",
    contactEmail: "orders@nbplc.com",
    state: "Lagos",
    minOrderValueNgn: 150000,
    deliveryLeadDays: 1,
    verified: true,
    brands: ["Heineken", "Goldberg", "Star Radler", "Maltina", "Amstel Malta", "Fayrouz", "Legend"]
  },
  {
    id: "dist-nbc",
    name: "Nigerian Bottling Company (Coca-Cola NBC)",
    category: "beverages",
    categoryName: "Beverages & Drinks",
    contactPerson: "Bisi Adebayo (Distribution Lead)",
    contactPhone: "+234 802 999 8877",
    contactEmail: "supply@cchellenic-nbc.com",
    state: "Lagos",
    minOrderValueNgn: 100000,
    deliveryLeadDays: 1,
    verified: true,
    brands: ["Coca-Cola", "Fanta", "Sprite", "Eva Water", "Monster Energy", "Schweppes", "Limca"]
  },
  {
    id: "dist-7up",
    name: "Seven-Up Bottling Company (SBC)",
    category: "beverages",
    categoryName: "Beverages & Drinks",
    contactPerson: "Tunde Ednut (Key Accounts)",
    contactPhone: "+234 805 444 3322",
    contactEmail: "orders@sevenup.org",
    state: "Lagos",
    minOrderValueNgn: 80000,
    deliveryLeadDays: 2,
    verified: true,
    brands: ["7Up", "Pepsi", "Mirinda", "Aquafina Water", "Teem", "Lipton Ice Tea", "Rockstar"]
  },
  {
    id: "dist-guinness",
    name: "Guinness Nigeria Wholesale Depot",
    category: "beverages",
    categoryName: "Beverages & Drinks",
    contactPerson: "Emeka Ike (Wholesale Officer)",
    contactPhone: "+234 809 222 1100",
    contactEmail: "direct@guinness.com",
    state: "Lagos",
    minOrderValueNgn: 200000,
    deliveryLeadDays: 1,
    verified: true,
    brands: ["Guinness Stout", "Malta Guinness", "Orijin", "Smirnoff", "Johnnie Walker", "Baileys"]
  },
  {
    id: "dist-chi",
    name: "Chi Limited / CCBA Distribution Hub",
    category: "beverages",
    categoryName: "Beverages & Drinks",
    contactPerson: "Fatima Alhassan (FMCG Mgr)",
    contactPhone: "+234 806 777 5544",
    contactEmail: "sales@chiltd.com",
    state: "Ogun",
    minOrderValueNgn: 120000,
    deliveryLeadDays: 2,
    verified: true,
    brands: ["Chivita 100%", "Chi Exotic", "Hollandia Yoghurt", "Capri-Sun", "SuperBite"]
  },
  {
    id: "dist-rite",
    name: "Rite Foods Depot (Bigi)",
    category: "beverages",
    categoryName: "Beverages & Drinks",
    contactPerson: "Sola Bakare",
    contactPhone: "+234 811 333 4455",
    contactEmail: "orders@ritefoodsltd.com",
    state: "Ogun",
    minOrderValueNgn: 90000,
    deliveryLeadDays: 2,
    verified: true,
    brands: ["Bigi Cola", "Bigi Apple", "Bigi Orange", "Fearless Energy", "Bigi Water"]
  },

  // Pharmacy Distributors
  {
    id: "dist-maybaker",
    name: "May & Baker Nigeria Plc",
    category: "pharmacy",
    categoryName: "Pharmaceuticals & Medicines",
    contactPerson: "Dr. Kemi Lawson (Pharma Lead)",
    contactPhone: "+234 803 888 7766",
    contactEmail: "orders@may-baker.com",
    state: "Lagos",
    minOrderValueNgn: 150000,
    deliveryLeadDays: 2,
    verified: true,
    brands: ["Paracetamol", "M&B Cough Syrup", "Antimalarials", "Antibiotics"]
  },
  {
    id: "dist-fidson",
    name: "Fidson Healthcare Plc Hub",
    category: "pharmacy",
    categoryName: "Pharmaceuticals & Medicines",
    contactPerson: "Pharm. Austin Chukwu",
    contactPhone: "+234 802 555 6677",
    contactEmail: "supply@fidson.com",
    state: "Lagos",
    minOrderValueNgn: 200000,
    deliveryLeadDays: 1,
    verified: true,
    brands: ["Astyfer", "Ciprotab", "Triple Action Cream", "Trikacide"]
  },

  // FMCG / Groceries Distributors
  {
    id: "dist-friesland",
    name: "FrieslandCampina WAMCO Nigeria",
    category: "groceries",
    categoryName: "Groceries & FMCG",
    contactPerson: "Mrs. Nkechi Nwosu",
    contactPhone: "+234 805 123 4567",
    contactEmail: "orders@frieslandcampina.com",
    state: "Lagos",
    minOrderValueNgn: 250000,
    deliveryLeadDays: 2,
    verified: true,
    brands: ["Peak Milk", "Three Crowns Milk", "Friso Gold"]
  },
  {
    id: "dist-fmn",
    name: "Flour Mills of Nigeria (Golden Penny)",
    category: "groceries",
    categoryName: "Groceries & FMCG",
    contactPerson: "Alhaji Ibrahim Danjuma",
    contactPhone: "+234 807 987 6543",
    contactEmail: "sales@fmnplc.com",
    state: "Lagos",
    minOrderValueNgn: 300000,
    deliveryLeadDays: 2,
    verified: true,
    brands: ["Golden Penny Rice", "Golden Penny Flour", "Golden Penny Sugar", "Golden Penny Noodles", "Semovita"]
  }
];

/**
 * Returns preset distributors filtered by category or product name
 */
export function getCategoryDistributors(categoryNameOrId?: string): DistributorPreset[] {
  if (!categoryNameOrId || categoryNameOrId === "all") {
    return DISTRIBUTOR_PRESETS;
  }

  const query = categoryNameOrId.toLowerCase();
  return DISTRIBUTOR_PRESETS.filter(
    (d) =>
      d.category === query ||
      d.categoryName.toLowerCase().includes(query) ||
      query.includes(d.category)
  );
}

