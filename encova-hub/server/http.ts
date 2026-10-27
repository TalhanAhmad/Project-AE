import "server-only";

export const MAX_JSON_BODY_BYTES = 32 * 1024;

export class RequestError extends Error {
  readonly status: 400 | 403 | 413 | 415;
  readonly code: string;

  constructor(status: 400 | 403 | 413 | 415, code: string, message: string) {
    super(message);
    this.name = "RequestError";
    Object.setPrototypeOf(this, new.target.prototype);
    this.status = status;
    this.code = code;
  }
}

function forbiddenOrigin(): never {
  throw new RequestError(403, "FORBIDDEN_ORIGIN", "Use this application's origin.");
}

function configuredApplicationOrigin(): string | null {
  const value = process.env.APP_ORIGIN?.trim();
  if (!value) return null;

  try {
    const origin = new URL(value);
    if (
      origin.protocol !== "https:" ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash
    ) {
      return null;
    }
    return origin.origin;
  } catch {
    return null;
  }
}

function expectedApplicationOrigin(url: URL, host: string | null): string {
  const isLocal = ["127.0.0.1", "localhost"].includes(url.hostname);
  if (isLocal) {
    let expectedOrigin = url.origin;
    // Next normalizes loopback URL hostnames to localhost. Browser Origin keeps
    // the actual address, so use Host only after an exact local-host allowlist.
    if (host !== null) {
      if (!/^(localhost|127\.0\.0\.1)(:\d{1,5})?$/i.test(host)) forbiddenOrigin();
      try {
        const hostUrl = new URL(`${url.protocol}//${host}`);
        if (hostUrl.port !== url.port) throw new Error("Different local port");
        expectedOrigin = hostUrl.origin;
      } catch {
        forbiddenOrigin();
      }
    }
    return expectedOrigin;
  }

  const expectedOrigin = configuredApplicationOrigin();
  if (!expectedOrigin || url.origin !== expectedOrigin || host === null) forbiddenOrigin();
  try {
    if (new URL(`${url.protocol}//${host}`).origin !== expectedOrigin) forbiddenOrigin();
  } catch {
    forbiddenOrigin();
  }
  return expectedOrigin;
}

export async function readJsonRequest(request: Request): Promise<unknown> {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  const site = request.headers.get("Sec-Fetch-Site");
  const host = request.headers.get("Host");
  const expectedOrigin = expectedApplicationOrigin(url, host);

  // Browser mutations must come from the configured app. Origin-free API
  // clients are allowed; these checks are not authentication or access rules.
  if (
    (origin !== null && origin !== expectedOrigin) ||
    (site !== null && site !== "same-origin" && site !== "none")
  ) {
    forbiddenOrigin();
  }

  const mediaType = request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (mediaType !== "application/json") {
    throw new RequestError(415, "UNSUPPORTED_MEDIA_TYPE", "Send application/json.");
  }

  const length = request.headers.get("Content-Length");
  if (length !== null && !/^\d+$/.test(length)) {
    throw new RequestError(400, "INVALID_CONTENT_LENGTH", "Invalid content length.");
  }
  if (length !== null && Number(length) > MAX_JSON_BODY_BYTES) {
    throw new RequestError(413, "BODY_TOO_LARGE", "JSON body must be at most 32 KiB.");
  }

  const reader = request.body?.getReader();
  if (!reader) {
    throw new RequestError(400, "INVALID_JSON", "Send a valid JSON body.");
  }

  let bytes = 0;
  let text = "";
  const decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_JSON_BODY_BYTES) {
        throw new RequestError(413, "BODY_TOO_LARGE", "JSON body must be at most 32 KiB.");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } catch (error) {
    await reader.cancel().catch(() => {});
    if (error instanceof RequestError) throw error;
    throw new RequestError(400, "INVALID_JSON", "Send a valid JSON body.");
  } finally {
    reader.releaseLock();
  }
}
