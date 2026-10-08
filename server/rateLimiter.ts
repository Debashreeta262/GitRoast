import type { Request } from 'express';

export class AppError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, any>;

  constructor(code: string, message: string, statusCode: number = 400, details?: Record<string, any>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class IPRateLimiter {
  private requests = new Map<string, number[]>();
  private rpm: number;

  constructor(rpm: number = 15) {
    this.rpm = rpm;
  }

  check(req: Request): void {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const now = Date.now();
    const windowStart = now - 60000;

    const timestamps = (this.requests.get(ip) || []).filter((ts) => ts > windowStart);

    if (timestamps.length >= this.rpm) {
      throw new AppError(
        'RATE_LIMITED',
        `Rate limit exceeded. You can only make ${this.rpm} analysis requests per minute.`,
        429
      );
    }

    timestamps.push(now);
    this.requests.set(ip, timestamps);
  }
}

export const ipRateLimiter = new IPRateLimiter(
  process.env.RATE_LIMIT_PER_MINUTE ? parseInt(process.env.RATE_LIMIT_PER_MINUTE, 10) : 15
);
