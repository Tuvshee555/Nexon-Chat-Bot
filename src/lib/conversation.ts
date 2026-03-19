export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  text: string;
};

type ChatSession = {
  messages: ChatMessage[];
  updatedAt: number;
};

const STORE = new Map<string, ChatSession>();
const MAX_MESSAGES = 12;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

function prune() {
  const now = Date.now();
  for (const [key, session] of STORE.entries()) {
    if (now - session.updatedAt > SESSION_TTL_MS) STORE.delete(key);
  }
}

export function getHistory(id: string): ChatMessage[] {
  prune();
  return STORE.get(id)?.messages || [];
}

export function appendMessage(id: string, role: ChatRole, text: string) {
  prune();
  const session = STORE.get(id) || { messages: [], updatedAt: Date.now() };
  session.messages.push({ role, text });
  if (session.messages.length > MAX_MESSAGES) {
    session.messages = session.messages.slice(-MAX_MESSAGES);
  }
  session.updatedAt = Date.now();
  STORE.set(id, session);
}

export function buildPrompt(options: {
  systemPrompt: string;
  business: {
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
  history: ChatMessage[];
  userText: string;
}) {
  const { systemPrompt, business, history, userText } = options;
  const lines: string[] = [];
  lines.push(systemPrompt.trim());
  lines.push("");
  lines.push("Rules:");
  lines.push("- Answer in Mongolian.");
  lines.push("- Keep replies short (1-3 sentences).");
  lines.push("- Use clear, natural Mongolian with correct spelling and grammar.");
  lines.push("- Triple-check every factual claim against the business info before replying.");
  lines.push("- Only state facts that are supported by the business info or the conversation history.");
  lines.push("- Never guess or invent prices, availability, policies, links, addresses, or delivery times.");
  lines.push("- Send exactly one reply message for each user message.");
  lines.push(
    "- Write like a friendly Mongolian shop admin chatting on Facebook Messenger.",
  );
  lines.push(
    "- Use the business info below when answering questions about products, prices, sizes, shipping, returns, or contact info.",
  );
  lines.push(
    "- Mention the website link only if the user asks where to see products or more details.",
  );
  lines.push("- Do not repeat greetings, sentences, or whole ideas.");
  lines.push("- Do not repeat the same information unnecessarily.");
  lines.push(
    "- If information is missing from the business data, say you are not sure and offer to connect with a human.",
  );
  lines.push(
    '- If you are unsure, say: "Энэ мэдээлэл одоогоор тодорхойгүй байна. Хүний ажилтантай холбож өгье."',
  );
  lines.push(
    "- If the user asks to book or reserve something, collect date, time, name, and phone.",
  );
  lines.push("- If the user only greets you, respond with one short greeting and an offer to help.");
  lines.push("- Ask at most one follow-up question unless the user asked for a booking or reservation.");
  lines.push("");
  lines.push("Business info:");
  lines.push(`Name: ${business?.name || "N/A"}`);
  lines.push(`Phone: ${business?.phone || "N/A"}`);
  lines.push(`Address: ${business?.address || "N/A"}`);
  lines.push(`Hours: ${business?.hours || "N/A"}`);
  lines.push(`Services: ${business?.services || "N/A"}`);
  lines.push(`Products: ${business?.products || "N/A"}`);
  lines.push(`Sizes: ${business?.sizes || "N/A"}`);
  lines.push(`Shipping: ${business?.shipping || "N/A"}`);
  lines.push(`Returns: ${business?.returns || "N/A"}`);
  lines.push(`Prices: ${business?.prices || "N/A"}`);
  lines.push(`Links: ${business?.links || "N/A"}`);
  lines.push("");
  if (history.length) {
    lines.push("Conversation so far:");
    for (const m of history) {
      const role = m.role === "user" ? "User" : "Assistant";
      lines.push(`${role}: ${m.text}`);
    }
    lines.push("");
  }
  lines.push(`User: ${userText}`);
  lines.push("Assistant:");
  return lines.join("\n");
}

