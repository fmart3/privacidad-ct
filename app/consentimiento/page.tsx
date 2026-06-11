"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense, useRef } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

type Estado = "pendiente" | "loading" | "exito" | "error" | "token_invalido";
type DecisionDatos = "acepto" | "rechazo" | null;

function ConsentimientoContent() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const token = params.get("token") ?? "";

  const [estado, setEstado] = useState<Estado>("pendiente");
  const [errorMsg, setErrorMsg] = useState("");
  const [decisionDatos, setDecisionDatos] = useState<DecisionDatos>(null);
  const [decisionMarketing, setDecisionMarketing] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [politicaLeida, setPoliticaLeida] = useState(false);
  const [progresoLectura, setProgresoLectura] = useState(0);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const policyRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Marca la política como leída cuando el final del texto entra en vista.
  // Cubre también el caso en que el contenido cabe sin scroll.
  useEffect(() => {
    if (estado !== "pendiente" || politicaLeida) return;
    const box = policyRef.current;
    const sentinel = sentinelRef.current;
    if (!box || !sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPoliticaLeida(true);
          setProgresoLectura(100);
        }
      },
      { root: box, threshold: 0.9 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [estado, politicaLeida]);

  const handleScrollPolitica = () => {
    const box = policyRef.current;
    if (!box) return;
    const max = box.scrollHeight - box.clientHeight;
    setProgresoLectura(max <= 0 ? 100 : Math.min(100, (box.scrollTop / max) * 100));
  };

  const handleDatosChange = (decision: Exclude<DecisionDatos, null>) => {
    setDecisionDatos(decision);
    if (decision !== "acepto") setDecisionMarketing(false);
  };

  const handleConfirmar = async () => {
    if (!decisionDatos || !turnstileToken) return;
    setEstado("loading");

    try {
      const res = await fetch("/api/ejecutar-consentimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          token,
          decision_datos: decisionDatos,
          decision_marketing: decisionMarketing ? "acepto" : "rechazo",
          turnstileToken
        }),
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
      setTurnstileToken(null);
      turnstileRef.current?.reset();
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
          <div className="info-box">
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

  const pasoDecidir = politicaLeida;
  const pasoVerificar = decisionDatos !== null;
  const puedeConfirmar = pasoVerificar && turnstileToken !== null && estado !== "loading";

  return (
    <PageShell wide>
      <div className="card" style={{ width: "100%", boxSizing: "border-box" }}>
        <Stepper
          pasos={[
            { label: "Leer", done: politicaLeida, active: !politicaLeida },
            { label: "Decidir", done: decisionDatos !== null, active: pasoDecidir && decisionDatos === null },
            { label: "Verificar", done: turnstileToken !== null, active: pasoVerificar && !turnstileToken },
            { label: "Confirmar", done: false, active: puedeConfirmar },
          ]}
        />

        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          Política de Privacidad y Consentimiento
        </h2>

        <div className="policy-meta">
          <span>Versión vigente: junio 2026</span>
          <button type="button" className="print-link" onClick={() => window.print()}>
            Imprimir o guardar en PDF
          </button>
        </div>

        <div className="read-progress" aria-hidden="true">
          <div className="read-progress-fill" style={{ width: `${progresoLectura}%` }} />
        </div>

        <div
          ref={policyRef}
          onScroll={handleScrollPolitica}
          className="policy-box"
          tabIndex={0}
          aria-label="Texto de la política de privacidad"
        >
          <h3>Política de Privacidad</h3>
          <p>En Cybertrust, reconocemos la importancia de proteger los datos personales y la información confidencial de nuestros clientes, usuarios y participantes en nuestra academia. Esta política cumple con la Ley 21.719 sobre Protección de Datos Personales de Chile y explica cómo recopilamos, usamos, almacenamos y protegemos la información que gestionamos.</p>

          <h4>Datos Personales que Recopilamos</h4>
          <ul>
            <li><strong>a) Clientes y posibles clientes:</strong> Recopilamos y tratamos solo los siguientes datos de contacto: Nombre, Apellido, Correo electrónico corporativo, Teléfono de contacto.</li>
            <li><strong>b) Servicios de Academia:</strong> Para la promoción de cursos y certificaciones, solicitamos únicamente datos de contacto (nombre, correo, teléfono). Cuando una persona se inscribe y participa en un curso o certificación, podríamos requerir información adicional (por ejemplo, RUT, datos para certificados, etc.), la que será informada oportunamente antes de su recolección.</li>
            <li><strong>c) Acceso a información durante los servicios:</strong> En el desarrollo de ciertos servicios, podríamos acceder de manera secundaria a datos personales pertenecientes a la empresa cliente.</li>
          </ul>
          <p><strong>Importante:</strong> No realizamos tratamiento de datos personales de terceros por cuenta de nuestros clientes. Cualquier dato personal al que podamos acceder como parte de la prestación de servicios es considerado información confidencial de la empresa cliente y será resguardado de acuerdo a los acuerdos de confidencialidad vigentes, sin utilizarse para ningún otro fin.</p>

          <h4>Finalidades del Tratamiento</h4>
          <ul>
            <li>Gestionar la relación comercial y contractual con clientes y potenciales clientes.</li>
            <li>Promocionar y gestionar la inscripción en cursos o certificaciones de nuestra academia.</li>
            <li>Atender consultas, solicitudes y requerimientos.</li>
            <li>Cumplir obligaciones legales y contractuales.</li>
            <li>Mejorar nuestros servicios y comunicación.</li>
          </ul>

          <h4>Base Legal para el Tratamiento</h4>
          <ul>
            <li>Consentimiento del titular, cuando corresponda.</li>
            <li>Ejecución de un contrato o gestión precontractual.</li>
            <li>Cumplimiento de obligaciones legales.</li>
            <li>Intereses legítimos de Cybertrust, en la medida que no se vean afectados los derechos de los titulares.</li>
          </ul>

          <h4>Destinatarios y Transferencias</h4>
          <p>No compartimos datos personales con terceros, salvo:</p>
          <ul>
            <li>Casas certificadoras con las que tenemos alianzas para la gestión, validación y emisión de cursos o certificaciones. El tratamiento por parte de estas entidades se rige por sus propias políticas de privacidad y los acuerdos vigentes.</li>
            <li>Autoridades públicas, cuando la ley así lo requiera.</li>
            <li>Cuando corresponda, se informará oportunamente y se solicitará consentimiento.</li>
          </ul>
          <p><strong>Importante:</strong> No compartimos datos personales con proveedores de servicios tecnológicos ni con otros terceros, salvo lo estrictamente señalado arriba. En caso de transferencias internacionales, se garantizarán las medidas exigidas por la Ley 21.719.</p>

          <h4>Plazo de Conservación</h4>
          <p>Los datos personales se conservarán solo por el tiempo necesario para cumplir con las finalidades señaladas, o según lo exija la legislación aplicable.</p>

          <h4>Seguridad de los Datos</h4>
          <p>Adoptamos medidas técnicas y organizativas apropiadas para proteger los datos personales y la información confidencial a la que accedemos en el contexto de nuestros servicios, incluyendo controles de acceso, cifrado, resguardo físico y digital, y políticas de gestión segura de la información.</p>

          <h4>Derechos de los Titulares</h4>
          <p>Usted puede ejercer sus derechos de acceso, rectificación, supresión, oposición y portabilidad reconocido por la Ley 21.719, mediante nuestro portal <a href="https://arco-cyber.vercel.app">Portal ARSOP</a>. Nuestro DPO se encargará de recibir las solicitudes y darle respuesta dentro de un plazo máximo 30 días desde que valide su solicitud por correo electrónico, tal como se establece en la ley N°21.719 en el artículo 11.</p>

          <h4>Actualizaciones de la Política</h4>
          <p>Esta política puede ser actualizada para reflejar cambios normativos o en nuestros procesos. Se notificará a través de nuestros canales habituales.</p>

          <h4>Contacto</h4>
          <p>Para cualquier consulta, solicitud o reclamo en materia de datos personales o confidencialidad, puede escribirnos a <a href="mailto:contacto@cybertrust.one">contacto@cybertrust.one</a> o contactar a nuestro Delegado de Protección de Datos en <a href="mailto:dpo@cybertrust.one">dpo@cybertrust.one</a>.</p>
          <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />
        </div>

        {!politicaLeida && (
          <p className="scroll-hint">↓ Desplázate hasta el final de la política para continuar</p>
        )}

        <div aria-live="polite">
          {pasoDecidir && (
            <div className="consent-step">
              <p style={{ fontSize: "0.9rem", color: "var(--text)", margin: "0 0 10px", fontWeight: 600 }}>
                Sobre el tratamiento de mis datos personales:
              </p>
              <div className="choice-group" role="radiogroup" aria-label="Decisión sobre el tratamiento de datos personales">
                <label className={`radio-option ${decisionDatos === "acepto" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="decision-datos"
                    checked={decisionDatos === "acepto"}
                    onChange={() => handleDatosChange("acepto")}
                  />
                  <span className="radio-label-title">✓ Acepto</span>
                  <span className="radio-label-desc">
                    Autorizo el tratamiento de mis datos personales conforme a la política de privacidad y la Ley 21.719.
                  </span>
                </label>
                <label className={`radio-option reject ${decisionDatos === "rechazo" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="decision-datos"
                    checked={decisionDatos === "rechazo"}
                    onChange={() => handleDatosChange("rechazo")}
                  />
                  <span className="radio-label-title">✕ No acepto</span>
                  <span className="radio-label-desc">
                    No autorizo el tratamiento de mis datos personales. Se registrará mi rechazo.
                  </span>
                </label>
              </div>
            </div>
          )}

          {pasoVerificar && (
            <div className="consent-step">
              <label
                className={`check-option ${decisionMarketing ? "checked" : ""} ${decisionDatos !== "acepto" ? "disabled" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={decisionMarketing}
                  disabled={decisionDatos !== "acepto"}
                  onChange={(e) => setDecisionMarketing(e.target.checked)}
                />
                <span>
                  <span className="option-title">Correos promocionales (opcional)</span>
                  <span className="option-desc">
                    Acepto recibir comunicaciones de marketing y correos promocionales de Cybertrust.
                    {decisionDatos !== "acepto" && (
                      <em style={{ display: "block", marginTop: "4px", fontSize: "0.8rem" }}>
                        Disponible solo si aceptas el uso de datos personales.
                      </em>
                    )}
                  </span>
                </span>
              </label>

              <div className="turnstile-wrap">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                  onSuccess={(t) => setTurnstileToken(t)}
                  onError={() => setErrorMsg("Error al cargar la verificación de seguridad. Intenta nuevamente.")}
                />
              </div>
            </div>
          )}
        </div>

        <button
          className="submit-btn"
          style={{ marginTop: "24px" }}
          disabled={!puedeConfirmar}
          onClick={handleConfirmar}
        >
          {estado === "loading" ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Procesando...
            </>
          ) : (
            "Confirmar preferencias"
          )}
        </button>
        {!puedeConfirmar && estado !== "loading" && (
          <p className="btn-hint">
            {!politicaLeida
              ? "Lee la política completa para continuar."
              : decisionDatos === null
                ? "Indica tu decisión sobre el tratamiento de datos."
                : "Completa la verificación de seguridad para continuar."}
          </p>
        )}
      </div>
    </PageShell>
  );
}

function Stepper({ pasos }: { pasos: { label: string; done: boolean; active: boolean }[] }) {
  return (
    <div className="stepper" aria-label="Progreso del consentimiento">
      {pasos.map((paso, i) => (
        <div key={paso.label} style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {i > 0 && <span className="step-connector" aria-hidden="true" />}
          <span className={`step ${paso.active ? "active" : ""} ${paso.done ? "done" : ""}`}>
            <span className="step-dot">{paso.done ? "✓" : i + 1}</span>
            <span className="step-label">{paso.label}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function PageShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <>
      <header>
        <img src="/cybertrust-logo.svg" alt="CyberTrust Security" className="brand-logo" />
        <h1>Gestión de Privacidad</h1>
      </header>
      <div className={`container ${wide ? "wide" : ""}`} style={{ display: "flex", justifyContent: "center" }}>
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
