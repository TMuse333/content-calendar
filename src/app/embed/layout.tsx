/**
 * Embed Layout
 *
 * Minimal layout for embeddable pages (no navigation).
 * Used by Graphics App to show queue/calendar.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Graphics Queue",
  description: "Posts ready for graphics",
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
