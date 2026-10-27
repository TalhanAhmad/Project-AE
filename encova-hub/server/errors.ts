export class DomainError extends Error {
  readonly status: 401 | 403 | 404 | 409 | 422;
  readonly code: string;
  constructor(status: 401 | 403 | 404 | 409 | 422, code: string, message: string) {
    super(message);
    this.name = "DomainError";
    Object.setPrototypeOf(this, new.target.prototype);
    this.status = status;
    this.code = code;
  }
}
