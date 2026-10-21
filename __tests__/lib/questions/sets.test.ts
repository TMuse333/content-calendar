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
