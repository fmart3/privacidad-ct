"use client";

export default function PrintButton() {
  return (
    <button type="button" className="print-link" onClick={() => window.print()}>
      Imprimir o guardar en PDF
    </button>
  );
}
