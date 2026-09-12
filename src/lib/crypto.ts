import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

/**
 * AES-256-GCM for secrets at rest (GitLab PATs — PRD §8.1/§10). Server-only. The key comes from
 * INTAKE_ENCRYPTION_KEY (never per-user, never shipped to the client). Ciphertext format:
 *   enc:v1:<iv-b64>:<tag-b64>:<ciphertext-b64>
 * The PAT plaintext is never logged and never returned to the client.
 */
function key(): Buffer {
  const raw = process.env.INTAKE_ENCRYPTION_KEY;
  if (!raw) throw new Error("INTAKE_ENCRYPTION_KEY is not set (server env required for GitLab intake)");
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  const b64 = Buffer.from(raw, "base64");
  if (b64.length === 32) return b64;
  // Any other secret string → deterministic 32-byte key via SHA-256 (stable across restarts).
  return createHash("sha256").update(raw, "utf8").digest();
}

export function isEncrypted(value: string): boolean {
  return typeof value === "string" && value.startsWith("enc:v1:");
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 5 || parts[0] !== "enc" || parts[1] !== "v1") {
    throw new Error("Malformed ciphertext");
  }
  const [, , ivB64, tagB64, ctB64] = parts;
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString("utf8");
}
