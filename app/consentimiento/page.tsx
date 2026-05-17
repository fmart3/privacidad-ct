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
          <h3 style={{ color: "var(--text)", marginTop: 0 }}>Política de Privacidad [cite: 1]</h3>
          <p>En Cybertrust, reconocemos la importancia de proteger los datos personales y la información confidencial de nuestros clientes, usuarios y participantes en nuestra academia[cite: 2]. Esta política cumple con la Ley 21.719 sobre Protección de Datos Personales de Chile y explica cómo recopilamos, usamos, almacenamos y protegemos la información que gestionamos[cite: 3].</p>

          <h4 style={{ color: "var(--text)", marginTop: "16px", marginBottom: "8px" }}>Datos Personales que Recopilamos [cite: 4]</h4>
          <ul style={{ paddingLeft: "20px", margin: 0 }}>
            <li style={{ marginBottom: "6px" }}><strong>a) Clientes y posibles clientes:</strong> Recopilamos y tratamos solo los siguientes datos de contacto [cite: 5]: Nombre [cite: 6], Correo electrónico corporativo [cite: 7], Teléfono de contacto[cite: 8].</li>
            <li style={{ marginBottom: "6px" }}><strong>b) Servicios de Academia:</strong> Para la promoción de cursos y certificaciones, solicitamos únicamente datos de contacto (nombre, correo, teléfono)[cite: 9]. Cuando una persona se inscribe y participa en un curso o certificación, podríamos requerir información adicional (por ejemplo, RUT, datos para certificados, etc.), la que será informada oportunamente antes de su recolección[cite: 10].</li>
            <li style={{ marginBottom: "6px" }}><strong>c) Acceso a información durante los servicios:</strong> En el desarrollo de ciertos servicios, podríamos acceder de manera secundaria a datos personales pertenecientes a la empresa cliente[cite: 11].</li>
          </ul>
          <p style={{ marginTop: "12px" }}><strong>Importante:</strong> No realizamos tratamiento de datos personales de terceros por cuenta de nuestros clientes[cite: 12]. Cualquier dato personal al que podamos acceder como parte de la prestación de servicios es considerado información confidencial de la empresa cliente y será resguardado de acuerdo a los acuerdos de confidencialidad vigentes, sin utilizarse para ningún otro fin[cite: 13].</p>

          <h4 style={{ color: "var(--text)", marginTop: "16px", marginBottom: "8px" }}>Finalidades del Tratamiento [cite: 14]</h4>
          <ul style={{ paddingLeft: "20px", margin: 0 }}>
            <li style={{ marginBottom: "4px" }}>Gestionar la relación comercial y contractual con clientes y potenciales clientes[cite: 15].</li>
            <li style={{ marginBottom: "4px" }}>Promocionar y gestionar la inscripción en cursos o certificaciones de nuestra academia[cite: 16].</li>
            <li style={{ marginBottom: "4px" }}>Atender consultas, solicitudes y requerimientos[cite: 17].</li>
            <li style={{ marginBottom: "4px" }}>Cumplir obligaciones legales y contractuales[cite: 18].</li>
            <li style={{ marginBottom: "4px" }}>Mejorar nuestros servicios y comunicación[cite: 19].</li>
          </ul>

          <h4 style={{ color: "var(--text)", marginTop: "16px", marginBottom: "8px" }}>Base Legal para el Tratamiento [cite: 20]</h4>
          <ul style={{ paddingLeft: "20px", margin: 0 }}>
            <li style={{ marginBottom: "4px" }}>Consentimiento del titular, cuando corresponda[cite: 21].</li>
            <li style={{ marginBottom: "4px" }}>Ejecución de un contrato o gestión precontractual[cite: 22].</li>
            <li style={{ marginBottom: "4px" }}>Cumplimiento de obligaciones legales[cite: 23].</li>
            <li style={{ marginBottom: "4px" }}>Intereses legítimos de Cybertrust, en la medida que no se vean afectados los derechos de los titulares[cite: 24].</li>
          </ul>

          <h4 style={{ color: "var(--text)", marginTop: "16px", marginBottom: "8px" }}>Destinatarios y Transferencias [cite: 25]</h4>
          <p style={{ marginBottom: "8px" }}>No compartimos datos personales con terceros, salvo[cite: 26]:</p>
          <ul style={{ paddingLeft: "20px", margin: 0 }}>
            <li style={{ marginBottom: "6px" }}>Casas certificadoras con las que tenemos alianzas para la gestión, validación y emisión de cursos o certificaciones[cite: 27]. El tratamiento por parte de estas entidades se rige por sus propias políticas de privacidad y los acuerdos vigentes[cite: 28].</li>
            <li style={{ marginBottom: "6px" }}>Autoridades públicas, cuando la ley así lo requiera[cite: 29].</li>
            <li style={{ marginBottom: "6px" }}>Cuando corresponda, se informará oportunamente y se solicitará consentimiento[cite: 30].</li>
          </ul>
          <p style={{ marginTop: "12px" }}><strong>Importante:</strong> No compartimos datos personales con proveedores de servicios tecnológicos ni con otros terceros, salvo lo estrictamente señalado arriba[cite: 31]. En caso de transferencias internacionales, se garantizarán las medidas exigidas por la Ley 21.719[cite: 32].</p>

          <h4 style={{ color: "var(--text)", marginTop: "16px", marginBottom: "8px" }}>Plazo de Conservación [cite: 33]</h4>
          <p>Los datos personales se conservarán solo por el tiempo necesario para cumplir con las finalidades señaladas, o según lo exija la legislación aplicable[cite: 34].</p>

          <h4 style={{ color: "var(--text)", marginTop: "16px", marginBottom: "8px" }}>Seguridad de los Datos [cite: 35]</h4>
          <p>Adoptamos medidas técnicas y organizativas apropiadas para proteger los datos personales y la información confidencial a la que accedemos en el contexto de nuestros servicios, incluyendo controles de acceso, cifrado, resguardo físico y digital, y políticas de gestión segura de la información[cite: 36].</p>

          <h4 style={{ color: "var(--text)", marginTop: "16px", marginBottom: "8px" }}>Derechos de los Titulares [cite: 37]</h4>
          <p>Usted puede ejercer sus derechos de acceso, rectificación, cancelación, oposición, portabilidad y cualquier otro reconocido por la Ley 21.719, contactándonos al correo contacto@cybertrust.one[cite: 38]. Responderemos en los plazos legales[cite: 39].</p>

          <h4 style={{ color: "var(--text)", marginTop: "16px", marginBottom: "8px" }}>Actualizaciones de la Política [cite: 40]</h4>
          <p>Esta política puede ser actualizada para reflejar cambios normativos o en nuestros procesos[cite: 41]. Se notificará a través de nuestros canales habituales[cite: 42].</p>

          <h4 style={{ color: "var(--text)", marginTop: "16px", marginBottom: "8px" }}>Contacto [cite: 43]</h4>
          <p>Para cualquier consulta, solicitud o reclamo en materia de datos personales o confidencialidad, puede escribirnos a contacto@cybertrust.one o contactar a nuestro Delegado de Protección de Datos (si corresponde)[cite: 44].</p>
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
