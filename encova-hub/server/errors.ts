export class DomainError extends Error {
  readonly status: 401 | 403 | 404 | 409;
  readonly code: string;
  constructor(status: 401 | 403 | 404 | 409, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
