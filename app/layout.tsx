import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "600", "700"] });

export const metadata: Metadata = {
  title: "Portal ARSOP | CyberTrust",
  description: "Gestión de Privacidad - CyberTrust LATAM",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await headers();

  return (
    <html lang="es" className={inter.className}>
      <body>
        <div className="test-banner">
          ⚠️ Esta página se encuentra en etapa de prueba. Los datos que se ingresen son solo para fines de prueba y no corresponden a los datos reales que maneja Cybertrust.
        </div>
        {children}
        <footer className="site-footer">
          <a href="https://cybertrust.one">CyberTrust LATAM</a>
          <span aria-hidden="true">·</span>
          <a href="/politica-privacidad">Política de Privacidad</a>
          <span aria-hidden="true">·</span>
          <a href="/">Portal ARSOP</a>
          <span aria-hidden="true">·</span>
          <a href="/cambiar-consentimiento">Cambiar Consentimiento</a>
          <span aria-hidden="true">·</span>
          <a href="mailto:dpo@cybertrust.one">dpo@cybertrust.one</a>
        </footer>
      </body>
    </html>
  );
}
