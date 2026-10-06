/**
 * Review Layout
 *
 * Simplified layout for client review pages.
 * No navigation - just a clean review experience.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Content Review",
  description: "Review and approve your scheduled content",
};

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
