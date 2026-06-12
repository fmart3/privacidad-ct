import type { Metadata } from "next";
import PoliticaPrivacidad, { POLITICA_VERSION } from "../components/PoliticaPrivacidad";
import PrintButton from "../components/PrintButton";

export const metadata: Metadata = {
  title: "Política de Privacidad — Cybertrust LATAM",
  description:
    "Política de privacidad de Cybertrust LATAM conforme a la Ley 21.719 sobre Protección de Datos Personales de Chile.",
};

export default function PoliticaPrivacidadPage() {
  return (
    <>
      <header>
        <img src="/cybertrust-logo.svg" alt="CyberTrust LATAM" className="brand-logo" />
        <h1>Gestión de Privacidad</h1>
      </header>

      <div className="container" style={{ maxWidth: 760, marginTop: 40, marginBottom: 60 }}>
        <div className="card">
          <div className="policy-meta">
            <span>Versión vigente: {POLITICA_VERSION}</span>
            <PrintButton />
          </div>

          <div className="policy-full">
            <PoliticaPrivacidad />
          </div>
        </div>
      </div>
    </>
  );
}
