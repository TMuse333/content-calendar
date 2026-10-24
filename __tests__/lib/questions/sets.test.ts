import { describe, it, expect } from "vitest";
import { cleanAnswers, SELLER_QUESTIONS } from "@/lib/questions/sets";

describe("cleanAnswers", () => {
  it("keeps known question ids, trimmed, drops empty and unknown", () => {
    const r = cleanAnswers(
      { "top-questions": "  When should I list?  ", "pricing-mistakes": "   ", hacker: "x" },
      SELLER_QUESTIONS
    );
    expect(r).toEqual({ "top-questions": "When should I list?" });
  });
  it("caps very long answers", () => {
    const r = cleanAnswers({ "fix-vs-skip": "a".repeat(5000) }, SELLER_QUESTIONS);
    expect(r["fix-vs-skip"]).toHaveLength(4000);
  });
  it("handles junk input", () => {
    expect(cleanAnswers(null, SELLER_QUESTIONS)).toEqual({});
    expect(cleanAnswers("x", SELLER_QUESTIONS)).toEqual({});
  });
});

describe("question sets", () => {
  it("every set id in QUESTION_SETS passes isQuestionSetId and unknown ids fail", async () => {
    const { QUESTION_SETS, isQuestionSetId } = await import("@/lib/questions/sets");
    for (const id of Object.keys(QUESTION_SETS)) expect(isQuestionSetId(id)).toBe(true);
    expect(isQuestionSetId("clients")).toBe(true);
    expect(isQuestionSetId("hacker")).toBe(false);
    expect(isQuestionSetId(null)).toBe(false);
    expect(isQuestionSetId("toString")).toBe(false);
  });
  it("clients set has unique ids and a Notion property per question", async () => {
    const { CLIENT_WIN_QUESTIONS } = await import("@/lib/questions/sets");
    const ids = CLIENT_WIN_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of CLIENT_WIN_QUESTIONS) expect(q.notionProperty).toBeTruthy();
  });
});
