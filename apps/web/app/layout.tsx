import type { Metadata } from "next";
import { Playfair_Display, Nunito } from "next/font/google";
import { LanguageProvider } from "./components/LanguageProvider";
import "./styles.css";

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-title" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "The Pet Villa Ipoh",
  description: "Premium small dog boarding in Ipoh with no cages, 24h companionship, and daily photo updates."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${nunito.variable}`}>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
