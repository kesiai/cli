export class KesiError extends Error {
  code: string;
  details?: any;
  constructor(message: string, code: string, details?: any) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export class ConfigError extends KesiError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
  }
}

export class AuthError extends KesiError {
  constructor(message: string, details?: any) {
    super(message, 'AUTH_ERROR', details);
  }
}

export class ApiError extends KesiError {
  statusCode?: number;
  constructor(message: string, statusCode?: number, details?: any) {
    super(message, 'API_ERROR', details);
    this.statusCode = statusCode;
  }
}

export class NetworkError extends KesiError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR');
  }
}
