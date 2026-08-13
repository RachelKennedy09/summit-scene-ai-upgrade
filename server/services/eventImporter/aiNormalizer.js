export async function normalizeWithAi(extractedEvent) {
  if (String(process.env.EVENT_IMPORT_AI_ENABLED || "false") !== "true") {
    return null;
  }

  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  // Provider intentionally isolated. The deterministic normalizer remains the
  // default until an AI provider contract is configured and tested.
  throw new Error("AI event normalization provider is not configured yet.");
}
