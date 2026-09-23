import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
/** Monospace for headings: this is a security instrument, and it should read like one. */
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://appaudit-genlayer.vercel.app"),
  title: "AppAudit — prove what apps do with your data",
  description:
    "A privacy advocate challenges an app's privacy claim. GenLayer validators independently read the app's own store listing and decide whether it contradicts the claim. Settlement is deterministic.",
  icons: { icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/logo.svg", type: "image/svg+xml" }] },
  openGraph: {
    title: "AppAudit",
    description: "Apps lie about your privacy. Now you can prove it.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${mono.variable}`}>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
