import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Dashboard",
  description: "View your content strategy progress",
};

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No sidebar - standalone mobile-friendly view
  return <>{children}</>;
}
