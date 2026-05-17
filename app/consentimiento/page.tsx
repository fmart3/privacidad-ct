"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

type Estado = "pendiente" | "loading" | "exito" | "error" | "token_invalido";

function ConsentimientoContent() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const token = params.get("token") ?? "";

  const [estado, setEstado] = useState<Estado>("pendiente");
  const [errorMsg, setErrorMsg] = useState("");
  const [decisionDatos, setDecisionDatos] = useState(false);
  const [decisionMarketing, setDecisionMarketing] = useState(false);

  const handleDatosChange = (checked: boolean) => {
    setDecisionDatos(checked);
    if (!checked) setDecisionMarketing(false);
  };

  const handleConfirmar = async () => {
    setEstado("loading");
    try {
      const res = await fetch("/api/ejecutar-consentimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, token, decision_datos: decisionDatos, decision_marketing: decisionMarketing }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.status === "token_invalido") {
          setEstado("token_invalido");
        } else {
          setErrorMsg(data.detail ?? "Error al procesar la solicitud.");
          setEstado("error");
        }
        return;
      }

      setEstado("exito");
    } catch {
      setErrorMsg("Error de conexión. Intente nuevamente.");
      setEstado("error");
    }
  };

  if (!id || !token) {
    return (
      <PageShell>
        <ResultCard color="var(--danger)" icon="✕">
          <h2>Enlace inválido</h2>
          <p style={{ color: "var(--text-muted)" }}>
            Este enlace no es válido o está incompleto. Verifique que haya hecho clic en el
            enlace del correo enviado por Cybertrust.
          </p>
        </ResultCard>
      </PageShell>
    );
  }

  if (estado === "exito") {
    return (
      <PageShell>
        <ResultCard color="var(--success)" icon="✓">
          <h2>¡Preferencias Actualizadas!</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: "1.6" }}>
            Hemos registrado sus preferencias de privacidad exitosamente en nuestros sistemas,
            conforme a la Ley 21.719.
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "20px" }}>
            Ya puede cerrar esta pestaña.
          </p>
          <p style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.85rem", margin: 0 }}>
            Cybertrust Security
          </p>
        </ResultCard>
      </PageShell>
    );
  }

  if (estado === "token_invalido") {
    return (
      <PageShell>
        <ResultCard color="var(--danger)" icon="✕">
          <h2>Enlace expirado</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: "1.6" }}>
            Este enlace es inválido o ya ha sido utilizado. Por su seguridad, el token ha
            expirado.
          </p>
          <div
            style={{
              background: "#0f172a",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "16px",
              marginTop: "20px",
              marginBottom: "20px",
              fontSize: "0.88rem",
              color: "var(--text-muted)",
              lineHeight: "1.5",
              textAlign: "left",
            }}
          >
            <strong style={{ color: "var(--text)", display: "block", marginBottom: "6px" }}>
              ¿Desea enviar una nueva respuesta?
            </strong>
            Puede solicitar un nuevo enlace ingresando su correo electrónico en la siguiente página:
            <br />
            <a
              href="/cambiar-consentimiento"
              style={{
                color: "var(--accent)",
                fontWeight: 600,
                display: "inline-block",
                marginTop: "10px",
                textDecoration: "none",
              }}
            >
              Solicitar nuevo enlace →
            </a>
          </div>
          <p style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.85rem", margin: 0 }}>
            Cybertrust Security
          </p>
        </ResultCard>
      </PageShell>
    );
  }

  if (estado === "error") {
    return (
      <PageShell>
        <ResultCard color="var(--danger)" icon="⚠">
          <h2>Error</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>{errorMsg}</p>
          <button className="submit-btn" onClick={() => setEstado("pendiente")} style={{ marginTop: "16px" }}>
            Reintentar
          </button>
        </ResultCard>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="card" style={{ maxWidth: 520 }}>
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          Política de Privacidad y Consentimiento
        </h2>

        {/* AGREGAR TEXTO DE POLÍTICA DE PRIVACIDAD AQUÍ */}
        <div
          style={{
            background: "#0f172a",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "24px",
            maxHeight: "260px",
            overflowY: "auto",
            fontSize: "0.88rem",
            color: "var(--text-muted)",
            lineHeight: "1.7",
            textAlign: "left",
          }}
        >
          <p>Texto de política de privacidad.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              cursor: "pointer",
              padding: "14px",
              background: decisionDatos ? "rgba(16,185,129,0.08)" : "#0f172a",
              border: `1px solid ${decisionDatos ? "var(--success)" : "var(--border)"}`,
              borderRadius: "10px",
              transition: "border-color 0.2s, background 0.2s",
            }}
          >
            <input
              type="checkbox"
              checked={decisionDatos}
              onChange={(e) => handleDatosChange(e.target.checked)}
              style={{ marginTop: "2px", accentColor: "var(--success)", width: "16px", height: "16px", flexShrink: 0 }}
            />
            <span style={{ fontSize: "0.9rem", color: "var(--text)", lineHeight: "1.5" }}>
              <strong>Uso de datos personales</strong>
              <br />
              <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Autorizo el tratamiento de mis datos personales conforme a la política de privacidad y la Ley 21.719.
              </span>
            </span>
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              cursor: decisionDatos ? "pointer" : "not-allowed",
              padding: "14px",
              background: decisionMarketing ? "rgba(16,185,129,0.08)" : "#0f172a",
              border: `1px solid ${decisionMarketing ? "var(--success)" : "var(--border)"}`,
              borderRadius: "10px",
              opacity: decisionDatos ? 1 : 0.45,
              transition: "border-color 0.2s, background 0.2s, opacity 0.2s",
            }}
          >
            <input
              type="checkbox"
              checked={decisionMarketing}
              disabled={!decisionDatos}
              onChange={(e) => setDecisionMarketing(e.target.checked)}
              style={{ marginTop: "2px", accentColor: "var(--success)", width: "16px", height: "16px", flexShrink: 0 }}
            />
            <span style={{ fontSize: "0.9rem", color: "var(--text)", lineHeight: "1.5" }}>
              <strong>Correos promocionales</strong>
              <br />
              <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Acepto recibir comunicaciones de marketing y correos promocionales de Cybertrust.
                {!decisionDatos && (
                  <em style={{ display: "block", marginTop: "4px", fontSize: "0.8rem" }}>
                    Requiere aceptar el uso de datos personales primero.
                  </em>
                )}
              </span>
            </span>
          </label>
        </div>

        <button
          className="submit-btn"
          disabled={estado === "loading"}
          onClick={handleConfirmar}
        >
          {estado === "loading" ? "Procesando..." : "Confirmar preferencias"}
        </button>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header>
        <img src="/cybertrust-logo.svg" alt="CyberTrust Security" className="brand-logo" />
        <h1>Gestión de Privacidad</h1>
      </header>
      <div className="container" style={{ display: "flex", justifyContent: "center" }}>
        {children}
      </div>
    </>
  );
}

function ResultCard({
  color,
  icon,
  children,
}: {
  color: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ maxWidth: 480, borderTop: `4px solid ${color}`, textAlign: "center" }}>
      <div style={{ fontSize: "2.5rem", color, marginBottom: "16px" }}>{icon}</div>
      {children}
    </div>
  );
}

export default function ConsentimientoPage() {
  return (
    <Suspense fallback={
      <PageShell>
        <div className="card" style={{ maxWidth: 480, textAlign: "center", color: "var(--text-muted)" }}>
          Cargando...
        </div>
      </PageShell>
    }>
      <ConsentimientoContent />
    </Suspense>
  );
}
