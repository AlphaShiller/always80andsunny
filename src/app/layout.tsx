import type { Metadata, Viewport } from "next";
import "./globals.css";
import WalletProvider from "@/components/WalletProvider";
import ChatWidget from "@/components/ChatWidget";

const SITE_URL = "https://always80andsunny.store";
const SITE_NAME = "Always 80 and Sunny";
const DESCRIPTION =
  "Premium custom baits, tackle, and unforgettable fishing charters on Solana. Join our community of anglers.";

export const viewport: Viewport = {
  themeColor: "#0F0A1E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — Custom Baits, Tackle & Charters`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    "fishing",
    "custom baits",
    "tackle",
    "fishing charters",
    "swimbaits",
    "jig heads",
    "trolling lures",
    "Solana",
    "fishing gear",
    "fishing apparel",
    "always 80 and sunny",
  ],
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Custom Baits, Tackle & Charters`,
    description: DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/logo.png`,
        width: 512,
        height: 512,
        alt: `${SITE_NAME} logo`,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Custom Baits, Tackle & Charters`,
    description: DESCRIPTION,
    images: [`${SITE_URL}/logo.png`],
  },

  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },

  manifest: "/manifest.json",

  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

// JSON-LD structured data
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      description: DESCRIPTION,
      sameAs: [],
    },
    {
      "@type": "LocalBusiness",
      name: SITE_NAME,
      url: SITE_URL,
      image: `${SITE_URL}/logo.png`,
      description:
        "Custom fishing baits, premium tackle, apparel, and guided fishing charter trips.",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Austin",
        addressRegion: "TX",
        addressCountry: "US",
      },
      priceRange: "$$",
    },
    {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <WalletProvider>
          {children}
          <ChatWidget />
        </WalletProvider>
      </body>
    </html>
  );
}
