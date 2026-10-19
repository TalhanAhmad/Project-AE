export class DomainError extends Error {
  readonly status: 404 | 409;
  readonly code: string;
  constructor(status: 404 | 409, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
