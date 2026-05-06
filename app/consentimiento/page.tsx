"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

type Estado = "pendiente" | "loading" | "exito" | "error" | "token_invalido";

function ConsentimientoContent() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const token = params.get("token") ?? "";
  const respuesta = params.get("respuesta") ?? "";

  const [estado, setEstado] = useState<Estado>("pendiente");
  const [errorMsg, setErrorMsg] = useState("");

  const esAcepto = respuesta === "acepto";
  const esRevocado = respuesta === "revocado";

  const handleConfirmar = async () => {
    setEstado("loading");
    try {
      const res = await fetch("/api/ejecutar-consentimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, token, decision: respuesta }),
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

  if (!id || !token || !["acepto", "rechazado", "revocado"].includes(respuesta)) {
    return (
      <PageShell>
        <ResultCard color="var(--danger)" icon="✕">
          <h2>Enlace inválido</h2>
          <p style={{ color: "var(--text-muted)" }}>
            Este enlace no es válido o está incompleto. Verifique que haya hecho clic en el
            botón correcto del correo enviado por Cybertrust.
          </p>
        </ResultCard>
      </PageShell>
    );
  }

  if (estado === "exito") {
    const exitoColor = esAcepto ? "var(--success)" : esRevocado ? "#f59e0b" : "var(--danger)";
    const exitoIcon = esAcepto ? "✓" : esRevocado ? "⚠" : "✕";
    const exitoTitulo = esAcepto
      ? "¡Preferencias Actualizadas!"
      : esRevocado
        ? "Consentimiento Revocado"
        : "Decisión Registrada";
    const exitoMensaje = esAcepto
      ? "Hemos registrado su autorización exitosamente en nuestros sistemas. Sus datos y opciones de privacidad han sido actualizados conforme a la Ley 21.719."
      : esRevocado
        ? "Su consentimiento para el tratamiento de datos personales ha sido revocado exitosamente. A partir de este momento, sus datos no serán tratados para las finalidades previamente autorizadas."
        : "Hemos registrado su decisión de no autorizar el tratamiento de sus datos personales. Esta acción ha quedado registrada con fecha y hora en nuestro sistema de cumplimiento, conforme a la Ley 21.719.";

    return (
      <PageShell>
        <ResultCard color={exitoColor} icon={exitoIcon}>
          <h2>{exitoTitulo}</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: "1.6" }}>
            {exitoMensaje}
          </p>

          {!esAcepto && (
            <div
              style={{
                background: "#0f172a",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "16px",
                marginTop: "20px",
                fontSize: "0.88rem",
                color: "var(--text-muted)",
                lineHeight: "1.5",
                textAlign: "left",
              }}
            >
              <strong style={{ color: "var(--text)", display: "block", marginBottom: "6px" }}>
                ¿Cambió de opinión?
              </strong>
              {esRevocado
                ? "Si en el futuro desea volver a autorizar el tratamiento de sus datos, puede hacerlo desde nuestra plataforma:"
                : "Si desea reconsiderar su decisión en el futuro, puede solicitar un nuevo enlace de consentimiento ingresando su correo electrónico en el siguiente enlace:"}
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
                {esRevocado ? "Volver a otorgar consentimiento →" : "Solicitar nuevo enlace de consentimiento →"}
              </a>
            </div>
          )}

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
              ¿Desea cambiar su decisión o enviar una nueva respuesta?
            </strong>
            Puede solicitar un nuevo enlace de consentimiento ingresando su correo electrónico en la siguiente página:
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

  const confirmColor = esAcepto ? "var(--success)" : esRevocado ? "#f59e0b" : "var(--danger)";
  const confirmBg = esAcepto ? "rgba(16,185,129,0.15)" : esRevocado ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)";
  const confirmIcon = esAcepto ? "✓" : esRevocado ? "⚠" : "✕";
  const confirmTitulo = esAcepto
    ? "Confirmar Aceptación"
    : esRevocado
      ? "Confirmar Revocación"
      : "Confirmar Rechazo";
  const confirmTexto = esAcepto
    ? "Estás confirmando que autorizas el tratamiento de tus datos personales por parte de Cybertrust, conforme a la Ley 21.719."
    : esRevocado
      ? "Estás confirmando que deseas revocar el consentimiento previamente otorgado para el tratamiento de tus datos personales. Esta acción es un derecho garantizado por la Ley 21.719."
      : "Estás confirmando que NO autorizas el tratamiento de tus datos personales con fines comerciales o de comunicación.";

  return (
    <PageShell>
      <div className="card" style={{ maxWidth: 480, textAlign: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: confirmBg,
            border: `2px solid ${confirmColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.6rem",
            margin: "0 auto 20px",
          }}
        >
          {confirmIcon}
        </div>

        <h2 style={{ color: confirmColor }}>
          {confirmTitulo}
        </h2>

        <p style={{ color: "var(--text-muted)", lineHeight: "1.6", marginBottom: "32px" }}>
          {confirmTexto}
        </p>

        <div
          style={{
            background: "#0f172a",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "28px",
            fontSize: "0.85rem",
            color: "var(--text-muted)",
            textAlign: "left",
            lineHeight: "1.5",
          }}
        >
          <strong style={{ color: "var(--text)", display: "block", marginBottom: "6px" }}>
            Información Legal
          </strong>
          {esRevocado
            ? "La revocación del consentimiento no afecta la licitud del tratamiento basado en el consentimiento previo a su retirada. Esta acción quedará registrada con fecha y hora en nuestro sistema."
            : "Esta acción quedará registrada junto con la fecha y hora en nuestro sistema de cumplimiento. Podrá cambiar su preferencia en cualquier momento contactando a nuestro DPO."}
        </div>

        <button
          className="submit-btn"
          disabled={estado === "loading"}
          onClick={handleConfirmar}
          style={{
            background: confirmColor,
          }}
        >
          {estado === "loading"
            ? "Procesando..."
            : esRevocado
              ? "Confirmar revocación"
              : "Confirmar mi decisión"}
        </button>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header>
        <span className="brand-badge">CyberTrust Security</span>
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
