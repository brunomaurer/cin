import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt, initCrypto } from "../src/crypto.js";

describe("AES-128-CBC Encryption", () => {
  const testPassword = "hZ5QshmUPuQBVUWgUY3JmrlTJ7TmtqCjXzeoWeNR3Fw";

  beforeAll(() => {
    initCrypto(testPassword);
  });

  it("should decrypt the seed admin email", () => {
    const encrypted = "N/fIIHcFZf8ZkKs6s+UdtsbbxWpS29iBAo62jQE1e/yLrJhQxac9m4O6BsyTHa9q";
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe("saas.admin@crossinnovation.network");
  });

  it("should decrypt the seed admin first name", () => {
    const encrypted = "fWzalvbqe59sdW8mrMt5Mg==";
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe("Admin");
  });

  it("should encrypt and decrypt roundtrip", () => {
    const original = "test@example.com";
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it("should produce same ciphertext as .NET for same input", () => {
    const encrypted = encrypt("saas.admin@crossinnovation.network");
    expect(encrypted).toBe("N/fIIHcFZf8ZkKs6s+UdtsbbxWpS29iBAo62jQE1e/yLrJhQxac9m4O6BsyTHa9q");
  });

  it("should return null for null/empty input", () => {
    expect(decrypt(null as any)).toBeNull();
    expect(decrypt("")).toBeNull();
    expect(encrypt(null as any)).toBeNull();
    expect(encrypt("")).toBeNull();
  });
});
