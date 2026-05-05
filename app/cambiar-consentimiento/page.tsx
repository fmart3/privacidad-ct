"use client";

import { useState } from "react";

type Estado = "idle" | "loading" | "exito" | "error";
type Intencion = "arrepentimiento" | "revocacion";

export default function CambiarConsentimientoPage() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<Estado>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [intencion, setIntencion] = useState<Intencion>("arrepentimiento");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEstado("loading");
    setErrorMsg("");

    const endpoint = intencion === "arrepentimiento" 
      ? "/api/solicitar-nuevo-consentimiento" 
      : "/api/solicitar-revocacion";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.detail ?? "Ocurrió un error. Intente nuevamente.");
        setEstado("error");
        return;
      }

      setEstado("exito");
    } catch {
      setErrorMsg("Error de conexión. Verifique su red e intente nuevamente.");
      setEstado("error");
    }
  };

  const isRevocacion = intencion === "revocacion";

  return (
    <>
      <header>
        <span className="brand-badge">CyberTrust Security</span>
        <h1>Gestión de Privacidad</h1>
      </header>

      <div className="container" style={{ display: "flex", justifyContent: "center" }}>
        {estado === "exito" ? (
          <div
            className="card"
            style={{ maxWidth: 480, borderTop: "4px solid var(--success)", textAlign: "center" }}
          >
            <div style={{ fontSize: "2.5rem", color: "var(--success)", marginBottom: "16px" }}>
              ✓
            </div>
            <h2 style={{ color: "var(--success)" }}>Correo enviado</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: "1.6" }}>
              Le hemos enviado un enlace seguro a{" "}
              <strong style={{ color: "var(--text)" }}>{email}</strong>. Revise su bandeja de
              entrada y siga las instrucciones para confirmar su {isRevocacion ? "revocación" : "nueva decisión"}.
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "20px" }}>
              El enlace tiene una validez de 72 horas. Si no recibe el correo en los próximos minutos,
              revise su carpeta de spam.
            </p>
            <p style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.85rem", margin: 0 }}>
              Cybertrust Security
            </p>
          </div>
        ) : (
          <div className="card" style={{ maxWidth: 480, width: "100%" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: isRevocacion ? "rgba(245, 158, 11, 0.12)" : "rgba(14, 165, 233, 0.12)",
                border: `2px solid ${isRevocacion ? "#f59e0b" : "var(--accent)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                margin: "0 auto 20px",
              }}
            >
              {isRevocacion ? "⚠" : "🔄"}
            </div>

            <h2 style={{ textAlign: "center", marginBottom: "8px" }}>
              Administrar mi consentimiento
            </h2>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.95rem",
                lineHeight: "1.6",
                textAlign: "center",
                marginBottom: "24px",
              }}
            >
              Seleccione la acción que desea realizar sobre sus datos personales.
            </p>

            <div style={{ display: "flex", gap: "10px", marginBottom: "24px", padding: "4px", background: "#0f172a", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={() => { setIntencion("arrepentimiento"); setErrorMsg(""); }}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "6px",
                  border: "none",
                  background: !isRevocacion ? "var(--accent)" : "transparent",
                  color: !isRevocacion ? "white" : "var(--text-muted)",
                  fontWeight: !isRevocacion ? "bold" : "normal",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                Volver a aceptar
              </button>
              <button
                type="button"
                onClick={() => { setIntencion("revocacion"); setErrorMsg(""); }}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "6px",
                  border: "none",
                  background: isRevocacion ? "#f59e0b" : "transparent",
                  color: isRevocacion ? "white" : "var(--text-muted)",
                  fontWeight: isRevocacion ? "bold" : "normal",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                Revocar
              </button>
            </div>

            <div
              style={{
                background: "#0f172a",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "14px 16px",
                marginBottom: "24px",
                fontSize: "0.82rem",
                color: "var(--text-muted)",
                lineHeight: "1.5",
              }}
            >
              <strong style={{ color: "var(--text)", display: "block", marginBottom: "4px" }}>
                Información Legal
              </strong>
              {isRevocacion 
                ? "Este proceso solo aplica si su correo está registrado con estado Aceptado. Al revocar, dejaremos de tratar sus datos para los fines autorizados previamente." 
                : "Este proceso solo aplica si su correo está registrado con estado Rechazado o Pendiente."}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email-cambio">Correo electrónico registrado</label>
                <input
                  id="email-cambio"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@empresa.cl"
                  required
                  autoComplete="email"
                  disabled={estado === "loading"}
                />
              </div>

              {estado === "error" && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid var(--danger)",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    fontSize: "0.88rem",
                    color: "#fca5a5",
                    marginBottom: "16px",
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="submit-btn"
                disabled={estado === "loading" || !email}
                style={{ background: isRevocacion ? "#f59e0b" : "var(--accent)" }}
              >
                {estado === "loading" ? "Enviando..." : "Solicitar enlace seguro →"}
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
