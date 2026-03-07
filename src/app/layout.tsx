import type { Metadata } from "next";
import "./globals.css";
import WalletProvider from "@/components/WalletProvider";
import ChatWidget from "@/components/ChatWidget";

export const metadata: Metadata = {
  title: "Always 80 and Sunny — Custom Baits, Tackle & Charters",
  description: "Premium custom baits, tackle, and unforgettable fishing charters on Solana. Join our community of anglers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          {children}
          <ChatWidget />
        </WalletProvider>
      </body>
    </html>
  );
}
