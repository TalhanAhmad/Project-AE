import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clients | Encova Hub",
  description: "A local learning workspace for managing example clients.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
