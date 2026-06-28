// Contador de fallos OTP por ticket, en memoria por instancia.
// Mismo trade-off que el rate-limiter de middleware.ts: en serverless (Vercel)
// un cold start puede dar un intento "gratis" extra, despreciable frente a 10^6
// combinaciones. Ruta de mejora: Upstash/Redis para estado global (ver README §7).

const TTL_MS = 10 * 60 * 1_000; // 10 min, mismo TTL que la expiración del OTP

interface Entry {
  count: number;
  expiresAt: number;
}

const store = new Map<string, Entry>();
let lastPrune = Date.now();

function maybePrune() {
  if (Date.now() - lastPrune < TTL_MS) return;
  const now = Date.now();
  store.forEach((entry, key) => {
    if (now >= entry.expiresAt) store.delete(key);
  });
  lastPrune = Date.now();
}

export function getFails(ticket: string): number {
  maybePrune();
  const entry = store.get(ticket);
  if (!entry || Date.now() >= entry.expiresAt) return 0;
  return entry.count;
}

export function bumpFail(ticket: string): void {
  maybePrune();
  const now = Date.now();
  const entry = store.get(ticket);
  if (!entry || now >= entry.expiresAt) {
    store.set(ticket, { count: 1, expiresAt: now + TTL_MS });
  } else {
    entry.count++;
  }
}

export function clearFails(ticket: string): void {
  store.delete(ticket);
}
