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
  console.log("=== trackMessageUsage START ===");
  console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("Service key exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log("Input:", { pageId, platform, promptTokens, completionTokens, totalTokens });

  try {
    // STEP 1 — Find business by page ID
    console.log("STEP 1: Looking up platform_accounts where external_id =", pageId);
    const { data: account, error: accountError } = await supabase
      .from("platform_accounts")
      .select("business_id")
      .eq("external_id", pageId)
      .single();

    console.log("STEP 1 result:", { account, accountError });

    if (accountError || !account) {
      console.error("STEP 1 FAILED: Business lookup failed", { pageId, accountError });
      return { allowed: false, reason: "Business not found" };
    }

    const businessId = account.business_id;
    console.log("STEP 1 OK: business_id =", businessId);

    // STEP 2 — Check business status
    console.log("STEP 2: Looking up businesses where id =", businessId);
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("status, bot_prompt")
      .eq("id", businessId)
      .single();

    console.log("STEP 2 result:", { status: business?.status, hasPrompt: !!business?.bot_prompt, businessError });

    if (businessError || !business) {
      console.error("STEP 2 FAILED: Business status lookup failed", {
        businessId,
        businessError,
      });
      return { allowed: false, reason: "Business not found" };
    }

    if (business.status !== "active") {
      console.log("STEP 2 BLOCKED: status is", business.status, "not 'active'");
      return { allowed: false, reason: "Bot paused" };
    }

    console.log("STEP 2 OK: status = active");

    // STEP 3 — Check credit balance
    console.log("STEP 3: Looking up credits where business_id =", businessId);
    const { data: credit, error: creditError } = await supabase
      .from("credits")
      .select("balance")
      .eq("business_id", businessId)
      .single();

    console.log("STEP 3 result:", { balance: credit?.balance, creditError });

    if (creditError || !credit) {
      console.error("STEP 3 FAILED: Credit lookup failed", { businessId, creditError });
      return { allowed: false, reason: "Out of messages" };
    }

    if (credit.balance <= 0) {
      console.log("STEP 3 BLOCKED: balance is", credit.balance);
      return { allowed: false, reason: "Out of messages" };
    }

    console.log("STEP 3 OK: balance =", credit.balance);

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

    console.log("STEP 4: creditsUsed =", creditsUsed, "messageCount =", messageCount);

    // STEP 5 — Deduct credits atomically
    console.log("STEP 5: Calling deduct_credits RPC with", { businessId, creditsUsed });
    const { data: deductResult, error: deductError } = await supabase.rpc(
      "deduct_credits",
      {
        p_business_id: businessId,
        p_amount: creditsUsed,
      },
    );

    console.log("STEP 5 result:", { deductResult, deductError });

    if (deductError) {
      console.error("STEP 5 FAILED: Credit deduction failed", { businessId, deductError });
      return { allowed: false, reason: "Out of messages" };
    }

    if (deductResult === false) {
      console.log("STEP 5 BLOCKED: deduct_credits returned false");
      return { allowed: false, reason: "Out of messages" };
    }

    console.log("STEP 5 OK: credits deducted");

    // STEP 6 — Log to message_logs
    console.log("STEP 6: Inserting message_logs");
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
      console.error("STEP 6 FAILED: Message log insert failed", { businessId, logError });
    } else {
      console.log("STEP 6 OK: logged");
    }

    // STEP 7 — Return success
    console.log("=== trackMessageUsage SUCCESS ===", { businessId });
    return {
      allowed: true,
      business_id: businessId,
      bot_prompt: business.bot_prompt || "",
    };
  } catch (error) {
    console.error("trackMessageUsage UNEXPECTED ERROR", { pageId, error });
    return { allowed: false, reason: "Internal error" };
  }
}
