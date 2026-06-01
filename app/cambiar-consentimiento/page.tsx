"use client";

import { useState, useRef } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

type Estado = "idle" | "loading" | "exito" | "error" | "no_encontrado";

export default function CambiarConsentimientoPage() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<Estado>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEstado("loading");
    setErrorMsg("");

    if (!turnstileToken) {
      setErrorMsg("Por favor, completa la verificación de seguridad.");
      setEstado("error");
      return;
    }

    try {
      const res = await fetch("/api/solicitar-cambio-consentimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken }),
      });

      if (res.status === 404) {
        setEstado("no_encontrado");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.detail ?? "Ocurrió un error. Intente nuevamente.");
        setEstado("error");
        return;
      }

      setEstado("exito");
    } catch {
      setErrorMsg("Error de conexión. Verifique su red e intente nuevamente.");
      setEstado("error");
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    }
  };

  return (
    <>
      <header>
        <img src="/cybertrust-logo.svg" alt="CyberTrust Security" className="brand-logo" />
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
              Le enviaremos un correo a{" "}
              <strong style={{ color: "var(--text)" }}>{email}</strong> con un enlace seguro para
              que pueda revisar y actualizar su decisión de consentimiento.
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "20px" }}>
              Lea los términos indicados en el mail y asegurese de su decisión.
            </p>
            <p style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.85rem", margin: 0 }}>
              Cybertrust Security
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "20px" }}>
              Ya puede cerrar esta pestaña.
            </p>
          </div>
        ) : estado === "no_encontrado" ? (
          <div
            className="card"
            style={{ maxWidth: 480, borderTop: "4px solid var(--danger)", textAlign: "center" }}
          >
            <div style={{ fontSize: "2.5rem", color: "var(--danger)", marginBottom: "16px" }}>
              ✕
            </div>
            <h2 style={{ color: "var(--danger)" }}>Cliente no encontrado</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: "1.6" }}>
              No encontramos ningún cliente asociado a ese correo electrónico. Si tiene dudas, visite
              nuestra sección de contacto en{" "}
              <a
                href="https://cybertrust.one/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)" }}
              >
                cybertrust.one
              </a>
              .
            </p>
            <button
              onClick={() => setEstado("idle")}
              className="submit-btn"
              style={{ background: "var(--border)", marginTop: "20px" }}
            >
              Intentar con otro correo
            </button>
          </div>
        ) : (
          <div className="card" style={{ maxWidth: 480, width: "100%" }}>
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
              🔒
            </div>

            <h2 style={{ textAlign: "center", marginBottom: "8px" }}>
              Cambiar mi decisión de consentimiento
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
              Ingrese su correo electrónico y le enviaremos un enlace seguro para que pueda revisar
              o actualizar su decisión.
            </p>

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

              {email.trim().length > 0 && (
                <div style={{ marginTop: "20px", marginBottom: "20px", display: "flex", justifyContent: "center" }}>
                  <Turnstile 
                    ref={turnstileRef}
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""} 
                    onSuccess={(token) => setTurnstileToken(token)}
                    onError={() => setErrorMsg("Error al cargar la verificación de seguridad. Intenta nuevamente.")}
                  />
                </div>
              )}

              <button
                type="submit"
                className="submit-btn"
                disabled={estado === "loading" || !email || !turnstileToken}
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
