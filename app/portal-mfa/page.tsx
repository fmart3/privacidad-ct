"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

type Estado = "pendiente" | "loading" | "exito" | "error" | "otp_invalido" | "otp_expirado" | "captcha_required";

function PortalMFAContent() {
  const params = useSearchParams();
  const ticket = params.get("ticket") ?? "";

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [estado, setEstado] = useState<Estado>("pendiente");
  const [errorMsg, setErrorMsg] = useState("");
  const [requireCaptcha, setRequireCaptcha] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const [fechaLimite, setFechaLimite] = useState<string>("");

  useEffect(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() + 25);
    setFechaLimite(
      limite.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
  }, []);

  const otp = digits.join("");

  const handleDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = [...digits];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] ?? "";
    }
    setDigits(next);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleValidar = async () => {
    if (otp.length < 6) return;
    if (requireCaptcha && !turnstileToken) return;
    setEstado("loading");
    try {
      const body: Record<string, string> = { ticket, otp };
      if (requireCaptcha && turnstileToken) body.turnstileToken = turnstileToken;

      const res = await fetch("/api/validar-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.status === "otp_invalido") {
          setRequireCaptcha(true);
          turnstileRef.current?.reset();
          setTurnstileToken(null);
          setEstado("otp_invalido");
        } else if (data.status === "otp_expirado") {
          setEstado("otp_expirado");
        } else if (data.status === "captcha_required" || res.status === 403) {
          setRequireCaptcha(true);
          turnstileRef.current?.reset();
          setTurnstileToken(null);
          setEstado("captcha_required");
        } else {
          setErrorMsg(data.detail ?? "Error al validar el código.");
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

  if (!ticket) {
    return (
      <PageShell>
        <ResultCard color="var(--danger)" icon="✕">
          <h2>Enlace inválido</h2>
          <p style={{ color: "var(--text-muted)" }}>
            Este enlace no es válido. Asegúrese de acceder desde el correo de confirmación
            enviado por Cybertrust.
          </p>
        </ResultCard>
      </PageShell>
    );
  }

  if (estado === "exito") {
    return (
      <PageShell>
        <ResultCard color="var(--success)" icon="✓">
          <h2>Identidad Verificada</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: "1.6" }}>
            Su identidad ha sido verificada correctamente. Su solicitud de derechos ARSOP ha
            sido enviada al equipo de privacidad de Cybertrust para su gestión.
          </p>
          <div
            style={{
              background: "rgba(16,185,129,0.08)",
              border: "1px solid var(--success)",
              borderRadius: "10px",
              padding: "16px",
              margin: "20px 0",
              textAlign: "left",
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, color: "white", fontSize: "0.9rem" }}>
              Próximos pasos:
            </p>
            <ul style={{ color: "var(--text-muted)", paddingLeft: "20px", fontSize: "0.85rem", margin: "8px 0 0" }}>
              <li>Recibirá una actualización por correo electrónico.</li>
              <li>Un consultor de privacidad revisará su requerimiento.</li>
              <li>Plazo máximo de respuesta: {fechaLimite || "25 días corridos"}.</li>
            </ul>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
            Ya puede cerrar esta pestaña.
          </p>
        </ResultCard>
      </PageShell>
    );
  }

  if (estado === "otp_invalido") {
    return (
      <PageShell>
        <ResultCard color="var(--danger)" icon="✕">
          <h2>Código Incorrecto</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: "1.6" }}>
            El código ingresado no es válido. Verifique el correo y vuelva a intentarlo.
          </p>
          <button
            className="submit-btn"
            onClick={() => { setEstado("pendiente"); setDigits(["", "", "", "", "", ""]); }}
            style={{ marginTop: "16px" }}
          >
            Reintentar
          </button>
        </ResultCard>
      </PageShell>
    );
  }

  if (estado === "otp_expirado") {
    return (
      <PageShell>
        <ResultCard color="var(--danger)" icon="⏱">
          <h2>Código Expirado</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: "1.6" }}>
            El código ha expirado. Los códigos son válidos por 10 minutos. Por favor, vuelva
            a ingresar la solicitud desde el formulario principal para recibir un nuevo código.
          </p>
        </ResultCard>
      </PageShell>
    );
  }

  if (estado === "captcha_required") {
    return (
      <PageShell>
        <ResultCard color="var(--danger)" icon="🛡">
          <h2>Verificación Requerida</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: "1.6" }}>
            Confirme que no es un robot y vuelva a intentarlo.
          </p>
          <button
            className="submit-btn"
            onClick={() => { setEstado("pendiente"); setDigits(["", "", "", "", "", ""]); }}
            style={{ marginTop: "16px" }}
          >
            Reintentar
          </button>
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
          <button
            className="submit-btn"
            onClick={() => setEstado("pendiente")}
            style={{ marginTop: "16px" }}
          >
            Reintentar
          </button>
        </ResultCard>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="card" style={{ maxWidth: 480, textAlign: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(59,130,246,0.15)",
            border: "2px solid var(--primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.6rem",
            margin: "0 auto 20px",
          }}
        >
          🔐
        </div>

        <h2>Verificación de Identidad</h2>
        <p style={{ color: "var(--text-muted)", lineHeight: "1.6", marginBottom: "28px" }}>
          Ingrese el código de 6 dígitos que fue enviado a su correo:
        </p>

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            marginBottom: "28px",
          }}
          onPaste={handlePaste}
        >
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              style={{
                width: 48,
                height: 60,
                textAlign: "center",
                fontSize: "1.6rem",
                fontWeight: 700,
                letterSpacing: 0,
                borderColor: d ? "var(--primary)" : "var(--border)",
                borderRadius: "10px",
                padding: 0,
              }}
            />
          ))}
        </div>

        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "24px" }}>
          ⏱ Este código expira en 10 minutos a partir del envío del correo.
        </p>

        {requireCaptcha && (
          <div className="consent-step turnstile-wrap">
            <Turnstile
              ref={turnstileRef}
              siteKey={process.env.TURNSTILE_SITE_KEY || ""}
              onSuccess={(token) => setTurnstileToken(token)}
              onError={() => {
                setErrorMsg("Error al cargar la verificación de seguridad. Intenta nuevamente.");
                setEstado("error");
              }}
            />
          </div>
        )}

        <button
          className="submit-btn"
          disabled={otp.length < 6 || estado === "loading" || (requireCaptcha && !turnstileToken)}
          onClick={handleValidar}
        >
          {estado === "loading" ? "Verificando..." : "Verificar Código"}
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

export default function PortalMFAPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="card" style={{ maxWidth: 480, textAlign: "center", color: "var(--text-muted)" }}>
            Cargando...
          </div>
        </PageShell>
      }
    >
      <PortalMFAContent />
    </Suspense>
  );
}
