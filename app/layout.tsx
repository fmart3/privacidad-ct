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
        <div style={{ background: '#fef08a', color: '#854d0e', padding: '10px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 500 }}>
          ⚠️ Esta página se encuentra en etapa de prueba. Los datos que se ingresen son solo para fines de prueba y no corresponden a los datos reales que maneja Cybertrust.
        </div>
        {children}
      </body>
    </html>
  );
}
