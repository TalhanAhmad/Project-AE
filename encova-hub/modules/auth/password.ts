import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
const cost = 16_384;
const blockSize = 8;
const parallelization = 1;
const keyLength = 64;
const maxMemory = 64 * 1024 * 1024;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, keyLength, {
      N: cost,
      r: blockSize,
      p: parallelization,
      maxmem: maxMemory,
    }, (error, key) => error ? reject(error) : resolve(Buffer.from(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt);
  return ["scrypt", cost, blockSize, parallelization, salt.toString("base64url"), hash.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt" || parts[1] !== String(cost) || parts[2] !== String(blockSize) || parts[3] !== String(parallelization)) return false;
  try {
    const salt = Buffer.from(parts[4], "base64url");
    const expected = Buffer.from(parts[5], "base64url");
    if (salt.length !== 16 || expected.length !== keyLength) return false;
    const actual = await derive(password, salt);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
