function cleanEnv(value: string | undefined): string {
  return value?.trim().replace(/^['"]|['"]$/g, "") ?? "";
}

export async function submitConsentForm({
  email,
  aceptaMarketing,
}: {
  email: string;
  aceptaMarketing: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const portalId = cleanEnv(process.env.HUBSPOT_PORTAL_ID);
  const formGuid = cleanEnv(process.env.HUBSPOT_CONSENT_FORM_GUID);
  const subscriptionIdRaw = cleanEnv(process.env.HUBSPOT_MARKETING_SUBSCRIPTION_ID);

  if (!portalId || !formGuid || !subscriptionIdRaw) {
    return { ok: false, error: "Faltan variables de entorno de HubSpot (HUBSPOT_PORTAL_ID, HUBSPOT_CONSENT_FORM_GUID, HUBSPOT_MARKETING_SUBSCRIPTION_ID)." };
  }

  const subscriptionTypeId = parseInt(subscriptionIdRaw, 10);
  if (isNaN(subscriptionTypeId)) {
    return { ok: false, error: "HUBSPOT_MARKETING_SUBSCRIPTION_ID no es un número válido." };
  }

  const url = `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formGuid}`;

  const body = {
    fields: [{ name: "email", value: email }],
    legalConsentOptions: {
      consent: {
        consentToProcess: true,
        text: "Autorizo el tratamiento de mis datos personales conforme a la política de privacidad y la Ley N° 21.719.",
        communications: [
          {
            value: aceptaMarketing,
            subscriptionTypeId,
            text: "Acepto recibir comunicaciones de marketing y correos promocionales de Cybertrust.",
          },
        ],
      },
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
