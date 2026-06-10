"use client";

import { useState, useRef } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

export default function Home() {
  const [email, setEmail] = useState("");
  const [tipoDerecho, setTipoDerecho] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const mostrarMensaje = ["Rectificación", "Supresión", "Oposición"].includes(tipoDerecho);

  const placeholderMensaje: Record<string, string> = {
    "Rectificación": "Indique claramente qué datos quiere cambiar (Nombre, Apellido, Número de teléfono [+569XXXXXXXX] y/o Correo Electrónico nuevo).",
    "Supresión": "Justifique y fundamente la razón de su decisión.",
    "Oposición": "Indique claramente si se opone al tratamiento general de sus datos o solamente a la recepción de mails promocionales.",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailTrimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          tipo_derecho: tipoDerecho,
          mensaje: mostrarMensaje ? mensaje : "",
          turnstileToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Error al enviar la solicitud.");
      }

      setStatus("success");
    } catch (err: any) {
      setErrorMessage(err.message || "Error de conexión.");
      setStatus("error");
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    }
  };

  if (status === "success") {
    return (
      <>
        <header>
          <img src="/cybertrust-logo.svg" alt="CyberTrust Security" className="brand-logo" />
          <h1>Gestión de Privacidad</h1>
        </header>

        <div className="container">
          <div className="card" style={{ textAlign: "center" }}>
            <>
              <div style={{ fontSize: "4rem", color: "var(--success)", marginBottom: "20px" }}>✓</div>
              <h2>Solicitud Recibida</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>
                Estimado/a, su solicitud ha sido recibida.
                Si este correo se encuentra en nuestros registros, será ingresada a nuestro sistema de cumplimiento.
              </p>

              <div
                style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid var(--success)",
                  padding: "20px",
                  borderRadius: "12px",
                  margin: "30px 0",
                  textAlign: "left",
                }}
              >
                <p style={{ margin: 0, fontWeight: 600, color: "white" }}>Próximos pasos (si aplica):</p>
                <ul style={{ color: "var(--text-muted)", paddingLeft: "20px", fontSize: "0.9rem" }}>
                  <li>Recibirá un correo de confirmación en breve.</li>
                  <li>Debe entregar su código OTP incluido en el correo para validar su identidad dentro de los próximos 10 minutos.</li>
                  <li>Después de esta verificación nuestro Delegado de Protección de Datos manejará su solicitud.</li>
                </ul>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "20px 0 30px" }}>
                Ante cualquier error o inquietud, puede contactarnos en <a href="mailto:contacto@cybertrust.one" style={{ color: "var(--accent)", textDecoration: "underline" }}>contacto@cybertrust.one</a>.
              </p>
            </>

            <button onClick={() => { setStatus("idle"); setMensaje(""); setEmail(""); }} className="submit-btn" style={{ background: "var(--border)" }}>
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
            Complete el formulario para ejercer sus derechos de Acceso, Rectificación, Supresión, Oposición o Portabilidad (Ley 21.719). Lea cuidadosamente la descripción de cada derecho para asegurar que su solicitud sea procesada correctamente.
          </p>

          {status === "error" && (
            <div style={{ background: "rgba(220, 38, 38, 0.1)", border: "1px solid #dc2626", color: "#f87171", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Correo Electrónico</label>
              <input
                type="text"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ingrese su correo electrónico"
                required
              />
            </div>

            <label style={{ display: "block", marginBottom: "15px", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Seleccione el tipo de derecho que desea ejercer:
            </label>

            <div className="radio-group">
              {[
                { value: "Acceso", title: "Acceso", desc: "Solicitar sus datos personales e interacciones (Contratos y Solicitudes ARSOP) con nosotros almacenados en nuestro sistema, para obtener una copia de ellos." },
                { value: "Rectificación", title: "Rectificación", desc: "Solicitar la modificación de datos personales que sean inexactos, desactualizados o incompletos. Se permite modificar el nombre, apellido, número de teléfono y correo electrónico, los cuales debe indicar claramente en el mensaje." },
                { value: "Supresión", title: "Supresión", desc: "Solicitar la eliminación de sus datos personales cuando ya no sean necesarios para los fines que fueron recabados. Debe justificar apropiadamente su solicitud." },
                { value: "Oposición", title: "Oposición", desc: "Solicitar que no se lleve a cabo el tratamiento de sus datos personales para los fines acordados. Puede oponerse a recibir mails promocionales y/o al tratamiento de sus datos." },
                { value: "Portabilidad", title: "Portabilidad", desc: "Solicitar una copia estructurada de sus datos personales para que usted pueda transferirlos a otro proveedor de servicios." },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`radio-option ${tipoDerecho === option.value ? "selected" : ""}`}
                  onClick={() => setTipoDerecho(option.value)}
                >
                  <input
                    type="radio"
                    name="tipo_derecho"
                    value={option.value}
                    checked={tipoDerecho === option.value}
                    readOnly
                  />
                  <span className="radio-label-title">{option.title}</span>
                  <span className="radio-label-desc">{option.desc}</span>
                </label>
              ))}
            </div>

            <div id="detalle-solicitud" style={{ display: mostrarMensaje ? "block" : "none" }}>
              <div className="form-group" style={{ marginTop: "15px", marginBottom: "0" }}>
                <label>{placeholderMensaje[tipoDerecho] ?? "Describa en detalle su solicitud"}</label>
                <textarea
                  rows={4}
                  maxLength={1000}
                  placeholder="Describa clara y detalladamente su solicitud"
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  required={mostrarMensaje}
                ></textarea>
                <span className="char-counter">{mensaje.length} / 1000 caracteres</span>
              </div>
            </div>

            {email.trim().length > 0 && tipoDerecho && (
              <div style={{ marginTop: "20px", marginBottom: "20px", display: "flex", justifyContent: "center" }}>
                <Turnstile
                  ref={turnstileRef}
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onError={() => setErrorMessage("Error al cargar la verificación de seguridad. Intenta nuevamente.")}
                />
              </div>
            )}

            <button
              type="submit"
              className="submit-btn"
              disabled={!tipoDerecho || status === "loading" || !turnstileToken}
            >
              {status === "loading" ? "Enviando..." : "Enviar Solicitud"}
            </button>
          </form>
        </div>

        <div
          style={{
            marginTop: "24px",
            padding: "20px 24px",
            background: "rgba(14, 165, 233, 0.06)",
            border: "1px solid rgba(14, 165, 233, 0.2)",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p style={{ margin: 0, fontWeight: 600, color: "var(--text)", fontSize: "0.95rem" }}>
              Gestión de su consentimiento
            </p>
            <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: "1.5" }}>
              Si desea revisar o cambiar su decisión sobre el tratamiento de sus datos personales,
              puede hacerlo en cualquier momento.
            </p>
          </div>
          <a
            href="/cambiar-consentimiento"
            style={{
              whiteSpace: "nowrap",
              padding: "10px 18px",
              background: "var(--accent)",
              color: "white",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.9rem",
              textDecoration: "none",
            }}
          >
            Cambiar mi decisión →
          </a>
        </div>
      </div>
    </>
  );
}
