"use client";

import { useState } from "react";

type Estado = "idle" | "loading" | "exito" | "error";

export default function CambiarConsentimientoPage() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<Estado>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEstado("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/solicitar-nuevo-consentimiento", {
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
              Le hemos enviado un nuevo enlace de consentimiento a{" "}
              <strong style={{ color: "var(--text)" }}>{email}</strong>. Revise su bandeja de
              entrada y siga las instrucciones para actualizar su decisión.
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "20px" }}>
              El enlace tiene una validez limitada. Si no recibe el correo en los próximos minutos,
              revise su carpeta de spam.
            </p>
            <p style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.85rem", margin: 0 }}>
              Cybertrust Security
            </p>
          </div>
        ) : (
          <div className="card" style={{ maxWidth: 480, width: "100%" }}>
            {/* Ícono */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(14, 165, 233, 0.12)",
                border: "2px solid var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                margin: "0 auto 20px",
              }}
            >
              🔄
            </div>

            <h2 style={{ textAlign: "center", marginBottom: "8px" }}>Cambiar mi decisión</h2>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.95rem",
                lineHeight: "1.6",
                textAlign: "center",
                marginBottom: "28px",
              }}
            >
              Si anteriormente rechazó el tratamiento de sus datos y desea reconsiderar su decisión,
              ingrese su correo electrónico y le enviaremos un nuevo enlace seguro para actualizarla.
            </p>

            {/* Aviso legal */}
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
              Este proceso solo aplica si su correo está registrado en nuestros sistemas con estado{" "}
              <em>Rechazado</em> o <em>Pendiente</em>. El cambio de decisión quedará registrado con
              fecha y hora conforme a la Ley 21.719.
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
              >
                {estado === "loading" ? "Enviando..." : "Solicitar nuevo enlace →"}
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
