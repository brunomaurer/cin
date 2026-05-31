import { createCipheriv, createDecipheriv } from "node:crypto";

let _key: Buffer;
let _iv: Buffer;

function deriveKey(password: string): Buffer {
  const passwordBytes = Buffer.from(password, "utf8");
  const key = Buffer.alloc(16, 111);
  for (let i = 0; i < passwordBytes.length && i < 16; i++) {
    key[i] = passwordBytes[i];
  }
  return key;
}

function deriveIV(password: string): Buffer {
  const passwordBytes = Buffer.from(password, "utf8");
  const iv = Buffer.alloc(16, 111);
  for (let i = 16; i < passwordBytes.length && (i - 16) < 16; i++) {
    iv[i - 16] = passwordBytes[i];
  }
  return iv;
}

export function initCrypto(password: string): void {
  _key = deriveKey(password);
  _iv = deriveIV(password);
}

export function encrypt(plaintext: string | null): string | null {
  if (!plaintext) return null;
  const cipher = createCipheriv("aes-128-cbc", _key, _iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

export function decrypt(ciphertext: string | null): string | null {
  if (!ciphertext) return null;
  try {
    const decipher = createDecipheriv("aes-128-cbc", _key, _iv);
    let decrypted = decipher.update(ciphertext, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}
