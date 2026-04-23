import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal ARCOP | CyberTrust",
  description: "Gestión de Privacidad - CyberTrust Security",
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
        {children}
      </body>
    </html>
  );
}
