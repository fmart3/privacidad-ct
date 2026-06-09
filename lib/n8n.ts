/**
 * Configuración centralizada para webhooks de n8n.
 *
 * Se usa una variable de entorno N8N_WEBHOOK_BASE_URL como host base
 * (ej: "https://pepelagos.app.n8n.cloud/webhook" o "http://localhost:5678/webhook")
 * y cada webhook se define solo con su path relativo en el .env.
 *
 * Para migrar de host, solo se cambia N8N_WEBHOOK_BASE_URL.
 */

function cleanEnv(value: string | undefined): string {
  return value?.trim().replace(/^['"]|['"]$/g, "") ?? "";
}

/**
 * Construye la URL completa de un webhook concatenando la base con el path.
 * Se asegura de que haya exactamente un "/" entre base y path.
 */
function buildWebhookUrl(path: string): string {
  const base = cleanEnv(process.env.N8N_WEBHOOK_BASE_URL);
  if (!base) {
    throw new Error("N8N_WEBHOOK_BASE_URL no está configurada.");
  }
  const normalizedBase = base.replace(/\/+$/, "");
  const normalizedPath = path.replace(/^\/+/, "");
  return `${normalizedBase}/${normalizedPath}`;
}

/**
 * Retorna la URL completa del webhook y el secret listos para usar en fetch.
 * Lanza error si faltan configuraciones requeridas.
 */
export function getN8nWebhookConfig(pathEnvVar: string): {
  url: string;
  secret: string;
} {
  const path = cleanEnv(process.env[pathEnvVar]);
  if (!path) {
    throw new Error(`Variable de entorno ${pathEnvVar} no está configurada.`);
  }

  const secret = cleanEnv(process.env.N8N_WEBHOOK_SECRET);
  if (!secret) {
    throw new Error("N8N_WEBHOOK_SECRET no está configurada.");
  }

  return {
    url: buildWebhookUrl(path),
    secret,
  };
}

/**
 * Variante que retorna null en lugar de lanzar error.
 * Útil para rutas que manejan el error por su cuenta.
 */
export function getN8nWebhookConfigSafe(pathEnvVar: string): {
  url: string;
  secret: string;
} | null {
  try {
    return getN8nWebhookConfig(pathEnvVar);
  } catch {
    return null;
  }
}
