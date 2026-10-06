import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Playbooks - Strategy",
  description: "Strategic frameworks and principles",
};

export default function PlaybooksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
