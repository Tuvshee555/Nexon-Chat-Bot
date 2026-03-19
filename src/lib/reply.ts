function normalizeWhitespace(text: string) {
  return text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function normalizeForCompare(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function sanitizeAssistantReply(text: string) {
  const cleaned = normalizeWhitespace(text);
  if (!cleaned) return "Энэ мэдээлэл одоогоор тодорхойгүй байна. Хүний ажилтантай холбож өгье.";

  const dedupedParagraphs: string[] = [];
  const seenParagraphs = new Set<string>();

  for (const paragraph of cleaned.split("\n")) {
    const normalizedParagraph = normalizeForCompare(paragraph);
    if (!normalizedParagraph || seenParagraphs.has(normalizedParagraph)) continue;
    seenParagraphs.add(normalizedParagraph);

    const uniqueSentences: string[] = [];
    const seenSentences = new Set<string>();
    for (const sentence of splitSentences(paragraph)) {
      const normalizedSentence = normalizeForCompare(sentence);
      if (!normalizedSentence || seenSentences.has(normalizedSentence)) continue;
      seenSentences.add(normalizedSentence);
      uniqueSentences.push(sentence);
      if (uniqueSentences.length >= 3) break;
    }

    if (uniqueSentences.length) {
      dedupedParagraphs.push(uniqueSentences.join(" "));
    }
  }

  return dedupedParagraphs.join("\n").trim() || "Энэ мэдээлэл одоогоор тодорхойгүй байна. Хүний ажилтантай холбож өгье.";
}

export function isDuplicateReply(
  previousReply: string | undefined,
  nextReply: string,
) {
  if (!previousReply) return false;
  return normalizeForCompare(previousReply) === normalizeForCompare(nextReply);
}
