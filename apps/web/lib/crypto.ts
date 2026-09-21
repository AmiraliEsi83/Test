import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "crypto";

function key(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return null;
  return scryptSync(raw, "harsi-v1", 32);
}

export function encryptJson(value: unknown): { ok: true; blob: string } | { ok: false; message: string } {
  const secret = key();
  if (!secret) return { ok: false, message: "ENCRYPTION_KEY is not configured. The secret was not stored." };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ok: true, blob: `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}` };
}

export function decryptJson<T>(blob: string): T | null {
  const secret = key();
  if (!secret || !blob) return null;
  const [ivB64, tagB64, dataB64] = blob.split(".");
  if (!ivB64 || !tagB64 || !dataB64) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", secret, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const plain = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
    return JSON.parse(plain.toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length < 6) return "••••";
  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
}
