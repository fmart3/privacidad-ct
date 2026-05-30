import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal ARSOP | CyberTrust",
  description: "Gestión de Privacidad - CyberTrust LATAM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div style={{ background: '#fef08a', color: '#854d0e', padding: '10px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 500 }}>
          ⚠️ Esta página se encuentra en etapa de prueba. Los datos ingresados aquí son para fines de demostración y no corresponden a los datos reales que maneja la empresa.
        </div>
        {children}
      </body>
    </html>
  );
}
