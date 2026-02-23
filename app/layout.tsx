import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import { DialRoot } from "dialkit";
import "dialkit/styles.css";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Flip Deck",
  description: "3D card flip deck with live-tunable controls",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={playfair.variable}>
      <body>
        {children}
        <DialRoot />
      </body>
    </html>
  );
}
