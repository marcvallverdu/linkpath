import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ConvexClientProvider } from "@/app/providers";

export const metadata: Metadata = {
  title: "LinkPath",
  description: "AI-powered affiliate link tracking QA platform"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
