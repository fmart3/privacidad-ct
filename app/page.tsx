"use client";

import { useState, useRef } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DERECHOS = [
  {
    value: "Acceso",
    linea: "Obtener una copia de sus datos personales.",
    detalle:
      "Le enviaremos los datos e interacciones (contratos y solicitudes ARSOP) que tenemos registrados sobre usted.",
  },
  {
    value: "Rectificación",
    linea: "Corregir datos inexactos o desactualizados.",
    detalle:
      "Puede modificar nombre, apellido, teléfono y correo. Indique claramente los valores nuevos en el mensaje.",
  },
  {
    value: "Supresión",
    linea: "Eliminar sus datos de nuestros registros.",
    detalle:
      "Aplica cuando los datos ya no son necesarios para los fines recabados. Debe fundamentar su solicitud en el mensaje.",
  },
  {
    value: "Oposición",
    linea: "Detener el tratamiento de sus datos.",
    detalle:
      "Indique en el mensaje si se opone al tratamiento general o solo a los correos promocionales.",
  },
  {
    value: "Portabilidad",
    linea: "Recibir sus datos en formato estructurado.",
    detalle:
      "Le entregaremos una copia que puede transferir a otro proveedor de servicios.",
  },
] as const;

const PLACEHOLDER_MENSAJE: Record<string, string> = {
  Rectificación:
    "Indique claramente qué datos quiere cambiar (Nombre, Apellido, Número de teléfono [+569XXXXXXXX] y/o Correo Electrónico nuevo).",
  Supresión: "Justifique y fundamente la razón de su decisión.",
  Oposición:
    "Indique claramente si se opone al tratamiento general de sus datos o solamente a la recepción de mails promocionales.",
};

export default function Home() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [tipoDerecho, setTipoDerecho] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const mostrarMensaje = ["Rectificación", "Supresión", "Oposición"].includes(tipoDerecho);
  const mensajeRequerido = mostrarMensaje && mensaje.trim().length === 0;
  const mostrarTurnstile = email.trim().length > 0 && tipoDerecho !== "";
  const puedeEnviar =
    !!(tipoDerecho && email.trim() && !emailError && turnstileToken && !mensajeRequerido) &&
    status !== "loading";

  let btnHint = "";
  if (!tipoDerecho) btnHint = "Selecciona un tipo de derecho para continuar.";
  else if (!email.trim()) btnHint = "Ingresa tu correo electrónico.";
  else if (emailError) btnHint = "Corrige el correo electrónico.";
  else if (mensajeRequerido) btnHint = "Describe tu solicitud en el campo de texto.";
  else if (!turnstileToken) btnHint = "Completa la verificación de seguridad.";

  const handleEmailBlur = () => {
    const trimmed = email.trim();
    if (trimmed && !EMAIL_REGEX.test(trimmed)) {
      setEmailError("Ingrese un correo electrónico válido.");
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailTrimmed = email.trim();
    if (!EMAIL_REGEX.test(emailTrimmed)) {
      setEmailError("Ingrese un correo electrónico válido.");
      setErrorMessage("Por favor ingrese un correo electrónico válido.");
      setStatus("error");
      return;
    }
    if (!turnstileToken) {
      setErrorMessage("Por favor, completa la verificación de seguridad (CAPTCHA).");
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const response = await fetch("/api/enviar-arsop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailTrimmed,
          tipo_derecho: tipoDerecho,
          mensaje: mostrarMensaje ? mensaje : "",
          turnstileToken,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Error al enviar la solicitud.");
      setStatus("success");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error de conexión.");
      setStatus("error");
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    }
  };

  const handleVolver = () => {
    setStatus("idle");
    setEmail("");
    setEmailError("");
    setTipoDerecho("");
    setMensaje("");
    setTurnstileToken(null);
    turnstileRef.current?.reset();
  };

  if (status === "success") {
    return (
      <>
        <header>
          <img src="/cybertrust-logo.svg" alt="CyberTrust Security" className="brand-logo" />
          <h1>Gestión de Privacidad</h1>
        </header>
        <div className="container">
          <div className="card success-card">
            <div className="success-icon">✓</div>
            <h2>Solicitud Recibida</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>
              Estimado/a, su solicitud ha sido recibida. Si este correo se encuentra en nuestros
              registros, será ingresada a nuestro sistema de cumplimiento.
            </p>

            <div className="info-box info-box--success">
              <p className="info-box-title">Próximos pasos (si aplica):</p>
              <ul>
                <li>Recibirá un correo de confirmación en breve.</li>
                <li className="otp-alert">
                  <span aria-hidden="true">⏱ </span>Debe ingresar el código OTP del correo en el
                  Portal ARSOP dentro de los próximos{" "}
                  <strong>10 minutos</strong>.
                </li>
                <li>
                  Después de esta verificación nuestro DPO manejará su solicitud en un plazo de
                  hasta 30 días.
                </li>
              </ul>
            </div>

            <p className="contact-hint">
              Ante cualquier error o inquietud, puede contactarnos en{" "}
              <a href="mailto:contacto@cybertrust.one">contacto@cybertrust.one</a>.
            </p>

            <button onClick={handleVolver} className="submit-btn btn-secondary">
              Volver al Inicio
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <header>
        <img src="/cybertrust-logo.svg" alt="CyberTrust Security" className="brand-logo" />
        <h1>Gestión de Privacidad</h1>
      </header>

      <div className="container">
        <div className="card">
          <h2>Solicitud de Derechos ARSOP</h2>
          <p className="subtitle">
            Complete el formulario para ejercer sus derechos de Acceso, Rectificación, Supresión,
            Oposición o Portabilidad (Ley 21.719). Antes de enviar su solicitud puede revisar
            nuestra{" "}
            <a href="/politica-privacidad" style={{ color: "var(--accent)" }}>
              política de privacidad
            </a>
            .
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input
                id="email"
                type="text"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                onBlur={handleEmailBlur}
                placeholder="Ingrese su correo electrónico"
                className={emailError ? "input-error" : undefined}
                required
              />
              {emailError && (
                <span className="field-error" role="alert">
                  {emailError}
                </span>
              )}
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 12px" }}>
              Seleccione el tipo de derecho que desea ejercer:
            </p>

            <div className="accordion-group">
              {DERECHOS.map((option) => (
                <div
                  key={option.value}
                  className={`accordion-item${tipoDerecho === option.value ? " selected open" : ""}`}
                >
                  <label className="accordion-header">
                    <input
                      type="radio"
                      name="tipo_derecho"
                      value={option.value}
                      checked={tipoDerecho === option.value}
                      onChange={() => setTipoDerecho(option.value)}
                    />
                    <div className="accordion-titles">
                      <span className="accordion-title">{option.value}</span>
                      <span className="accordion-line">{option.linea}</span>
                    </div>
                    <span className="accordion-chevron" aria-hidden="true">›</span>
                  </label>
                  <div className="accordion-body">
                    <p className="accordion-detalle">{option.detalle}</p>
                    <a href="/politica-privacidad#derechos" className="accordion-link">
                      ver procedimiento completo →
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {mostrarMensaje && (
              <div className="consent-step form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="mensaje">
                  {PLACEHOLDER_MENSAJE[tipoDerecho] ?? "Describa en detalle su solicitud"}
                </label>
                <textarea
                  id="mensaje"
                  rows={4}
                  maxLength={1000}
                  placeholder="Describa clara y detalladamente su solicitud"
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  required
                />
                <span className="char-counter">{mensaje.length} / 1000 caracteres</span>
              </div>
            )}

            {mostrarTurnstile && (
              <div className="consent-step turnstile-wrap">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onError={() => {
                    setErrorMessage(
                      "Error al cargar la verificación de seguridad. Intenta nuevamente."
                    );
                    setStatus("error");
                  }}
                />
              </div>
            )}

            {status === "error" && (
              <div className="error-banner" role="alert">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className="submit-btn"
              style={{ marginTop: "16px" }}
              disabled={!puedeEnviar}
            >
              {status === "loading" ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Enviando...
                </>
              ) : (
                "Enviar Solicitud"
              )}
            </button>

            {btnHint && status !== "loading" && (
              <p className="btn-hint">{btnHint}</p>
            )}
          </form>
        </div>

        <div className="consent-banner">
          <div>
            <p className="consent-banner-title">Gestión de su consentimiento</p>
            <p className="consent-banner-desc">
              Si desea revisar o cambiar su decisión sobre el tratamiento de sus datos personales,
              puede hacerlo en cualquier momento.
            </p>
          </div>
          <a href="/cambiar-consentimiento" className="consent-banner-btn">
            Cambiar mi decisión →
          </a>
        </div>
      </div>
    </>
  );
}
