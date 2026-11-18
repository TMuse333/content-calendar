"use client";

/** Print / Save-as-PDF trigger. Hidden when actually printing (see .noprint). */
export default function PrintButton() {
  return (
    <button className="noprint print-btn" onClick={() => window.print()}>
      Save as PDF
    </button>
  );
}
