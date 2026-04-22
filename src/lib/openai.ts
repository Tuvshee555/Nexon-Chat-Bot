/* eslint-disable @typescript-eslint/no-explicit-any */
import { fixMojibake } from "./encoding";

const DEFAULT_MODEL = "gpt-4.1-mini";

function extractOutputText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text) {
    return data.output_text;
  }

  const chunks: string[] = [];
  if (Array.isArray(data?.output)) {
    for (const item of data.output) {
      if (item?.type !== "message" || !Array.isArray(item.content)) continue;
      for (const part of item.content) {
        if (part?.type === "output_text" && typeof part.text === "string") {
          chunks.push(part.text);
        }
      }
    }
  }

  return chunks.join("").trim();
}

export type OpenAIUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type OpenAIResult = {
  text: string;
  usage: OpenAIUsage;
};

export async function askOpenAI(prompt: string): Promise<OpenAIResult> {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  if (!key) {
    throw new Error("OPENAI_API_KEY not set");
  }

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("OpenAI error", {
      status: res.status,
      statusText: res.statusText,
      body: txt,
    });
    throw new Error(`OpenAI error: ${res.status} ${txt}`);
  }

  const data = await res.json();
  const raw =
    extractOutputText(data) ||
    "Уучлаарай, систем түр алдаатай байна.";

  const usage: OpenAIUsage = {
    prompt_tokens: data?.usage?.input_tokens ?? 0,
    completion_tokens: data?.usage?.output_tokens ?? 0,
    total_tokens: data?.usage?.total_tokens ?? 0,
  };

  return { text: fixMojibake(raw), usage };
}
