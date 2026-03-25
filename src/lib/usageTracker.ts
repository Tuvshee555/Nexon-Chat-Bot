import { supabase } from "./supabase";

type TrackInput = {
  pageId: string;
  platform: "instagram" | "messenger";
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

type TrackResult =
  | { allowed: true; business_id: string; bot_prompt: string }
  | { allowed: false; reason: string };

export async function trackMessageUsage({
  pageId,
  platform,
  promptTokens,
  completionTokens,
  totalTokens,
}: TrackInput): Promise<TrackResult> {
  try {
    // STEP 1 — Find business by page ID
    const { data: account, error: accountError } = await supabase
      .from("platform_accounts")
      .select("business_id")
      .eq("external_id", pageId)
      .single();

    if (accountError || !account) {
      console.error("Business lookup failed", { pageId, accountError });
      return { allowed: false, reason: "Business not found" };
    }

    const businessId = account.business_id;

    // STEP 2 — Check business status
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("status, bot_prompt")
      .eq("id", businessId)
      .single();

    if (businessError || !business) {
      console.error("Business status lookup failed", {
        businessId,
        businessError,
      });
      return { allowed: false, reason: "Business not found" };
    }

    if (business.status !== "active") {
      return { allowed: false, reason: "Bot paused" };
    }

    // STEP 3 — Check credit balance
    const { data: credit, error: creditError } = await supabase
      .from("credits")
      .select("balance")
      .eq("business_id", businessId)
      .single();

    if (creditError || !credit) {
      console.error("Credit lookup failed", { businessId, creditError });
      return { allowed: false, reason: "Out of messages" };
    }

    if (credit.balance <= 0) {
      return { allowed: false, reason: "Out of messages" };
    }

    // STEP 4 — Calculate usage
    let creditsUsed: number;
    let messageCount: number;

    if (totalTokens === 0) {
      messageCount = 1;
      creditsUsed = 1;
    } else {
      messageCount = 1;
      creditsUsed = Math.ceil(totalTokens / 1000);
    }

    // STEP 5 — Deduct credits atomically
    const { data: deductResult, error: deductError } = await supabase.rpc(
      "deduct_credits",
      {
        p_business_id: businessId,
        p_amount: creditsUsed,
      },
    );

    if (deductError) {
      console.error("Credit deduction failed", { businessId, deductError });
      return { allowed: false, reason: "Out of messages" };
    }

    if (deductResult === false) {
      return { allowed: false, reason: "Out of messages" };
    }

    // STEP 6 — Log to message_logs
    const { error: logError } = await supabase.from("message_logs").insert({
      business_id: businessId,
      platform,
      message_count: messageCount,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      credits_used: creditsUsed,
      source: "api",
    });

    if (logError) {
      console.error("Message log insert failed", { businessId, logError });
    }

    // STEP 7 — Return success
    return {
      allowed: true,
      business_id: businessId,
      bot_prompt: business.bot_prompt || "",
    };
  } catch (error) {
    console.error("trackMessageUsage unexpected error", { pageId, error });
    return { allowed: false, reason: "Internal error" };
  }
}
