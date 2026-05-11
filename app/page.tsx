"use client";

import { useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [tipoDerecho, setTipoDerecho] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "consent_required" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [specialMessage, setSpecialMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const response = await fetch("/api/enviar-arco", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          tipo_derecho: tipoDerecho,
          mensaje,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Error al enviar la solicitud.");
      }

      if (data.status === "consentimiento_requerido") {
        setSpecialMessage("Hemos pausado su solicitud, ya que no ha dado su consentimiento para autorizar a Cybertrust a tratar sus datos. Le enviamos un correo para que entregue su consentimiento. Una vez aceptado, vuelva a enviar este formulario.");
        setStatus("consent_required");
      } else {
        setStatus("success");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error de conexión.");
      setStatus("error");
    }
  };

  if (status === "success" || status === "consent_required") {
    return (
      <>
        <header>
          <img src="/cybertrust-logo.svg" alt="CyberTrust Security" className="brand-logo" />
          <h1>Gestión de Privacidad</h1>
        </header>

        <div className="container">
          <div className="card" style={{ textAlign: "center" }}>
            {status === "consent_required" ? (
              <>
                <div style={{ fontSize: "4rem", color: "var(--accent)", marginBottom: "20px" }}>✉️</div>
                <h2>Autorización Requerida</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "1.1rem", lineHeight: "1.5" }}>
                  {specialMessage}
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: "4rem", color: "var(--success)", marginBottom: "20px" }}>✓</div>
                <h2>Solicitud Enviada</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>
                  Usuario <strong>{email}</strong>, los datos ingresados han sido validados correctamente y su solicitud ha sido ingresada a nuestro sistema
                  de cumplimiento.
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
                  <p style={{ margin: 0, fontWeight: 600, color: "white" }}>Próximos pasos:</p>
                  <ul style={{ color: "var(--text-muted)", paddingLeft: "20px", fontSize: "0.9rem" }}>
                    <li>Recibirá un correo de confirmación en breve.</li>
                    <li>Un consultor de Cybertrust revisará su requerimiento.</li>
                    <li>Plazo máximo de respuesta: 15 días hábiles.</li>
                  </ul>
                </div>
              </>
            )}

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
            Complete el formulario para ejercer sus derechos de Acceso, Rectificación, Supresión, Oposición o Portabilidad (Ley 21.719).
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
                type="email"
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
                { value: "Rectificación", title: "Rectificación", desc: "Solicitar la modificación de datos personales que sean inexactos, desactualizados o incompletos. Se permite modificar el nombre, apellido y número de teléfono, los debe indicar claramente en el mensaje. Si desea modificar su correo electrónico, solicite el derecho de Supresión y contactenos con su nuevo correo para poder actualizar su contacto nuevamente." },
                { value: "Supresión", title: "Supresión", desc: "Solicitar la eliminación de sus datos personales cuando ya no sean necesarios para los fines que fueron recabados. Debe justificar apropiadamente su solicitud." },
                { value: "Oposición", title: "Oposición", desc: "Solicitar que no se lleve a cabo el tratamiento de sus datos personales para los fines acordados." },
                { value: "Portabilidad", title: "Portabilidad", desc: "Solicitar una copia estructurada de sus datos personales para que pueda transferirlos a otro proveedor de servicios." },
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

            <div id="detalle-solicitud" style={{ display: tipoDerecho ? "block" : "none" }}>
              <div className="form-group" style={{ marginTop: "15px", marginBottom: "0" }}>
                <label>Describe en detalle tu solicitud</label>
                <textarea
                  rows={4}
                  maxLength={1000}
                  placeholder="Escriba aquí los detalles de tu solicitud..."
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  required={!!tipoDerecho}
                ></textarea>
                <span className="char-counter">{mensaje.length} / 1000 caracteres</span>
              </div>
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={!tipoDerecho || status === "loading"}
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
