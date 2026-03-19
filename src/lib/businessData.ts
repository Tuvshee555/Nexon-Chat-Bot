import { promises as fs } from "fs";
import path from "path";

export type BusinessSettings = {
  name?: string;
  phone?: string;
  address?: string;
  hours?: string;
  services?: string;
  products?: string;
  sizes?: string;
  shipping?: string;
  returns?: string;
  prices?: string;
  links?: string;
};

export type BusinessDataFile = {
  systemPrompt?: string;
  business?: BusinessSettings;
};

const DATA_PATH = path.join(process.cwd(), "data", "business.json");

const DEFAULT_DATA: BusinessDataFile = {
  systemPrompt:
    "You are a friendly Mongolian customer support assistant for a clothing brand. Answer briefly and clearly. Use the business data below when asked about products, prices, sizes, shipping, returns, or contact info. If something is not in the business data, say you are not sure and offer to connect with a human.",
  business: {
    name: "Your Clothing Brand",
    phone: "+976 0000 0000",
    address: "Ulaanbaatar, Mongolia",
    hours: "Daily 10:00-20:00",
    services: "Product info, sizes, shipping, returns, order help",
    products: "T-shirt, hoodie, jacket, accessories",
    sizes: "S, M, L, XL (some items XXL)",
    shipping: "Ulaanbaatar same-day, countryside 2-4 days",
    returns: "7 days with receipt, unused items only",
    prices: "T-shirt: 49,000 MNT; Hoodie: 129,000 MNT; Jacket: 199,000 MNT",
    links: "Instagram: https://instagram.com/yourbrand | Store: https://yourbrand.com",
  },
};

export async function readBusinessData(): Promise<BusinessDataFile> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as BusinessDataFile;
    return {
      ...DEFAULT_DATA,
      ...parsed,
      business: {
        ...DEFAULT_DATA.business,
        ...(parsed.business || {}),
      },
    };
  } catch {
    return DEFAULT_DATA;
  }
}

export async function writeBusinessData(next: BusinessDataFile) {
  const merged: BusinessDataFile = {
    ...DEFAULT_DATA,
    ...next,
    business: {
      ...DEFAULT_DATA.business,
      ...(next.business || {}),
    },
  };
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(merged, null, 2), "utf8");
}
