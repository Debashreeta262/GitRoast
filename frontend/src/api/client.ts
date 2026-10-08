import type { AnalyzeResponse, ApiErrorResponse, BrutalityLevel, TargetRole } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export class ApiError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function analyzeProfile(
  username: string,
  role: TargetRole,
  brutality: BrutalityLevel
): Promise<AnalyzeResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const res = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username.trim(),
        role,
        brutality,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorData: ApiErrorResponse | null = null;
      try {
        errorData = (await res.json()) as ApiErrorResponse;
      } catch {
        // Response was not JSON
      }

      if (errorData?.error) {
        throw new ApiError(
          errorData.error.code,
          errorData.error.message,
          errorData.error.details
        );
      }

      if (res.status === 404) {
        throw new ApiError('USER_NOT_FOUND', `GitHub user '${username}' not found.`);
      } else if (res.status === 429) {
        throw new ApiError('RATE_LIMITED', 'Rate limit exceeded. Please wait a few moments.');
      } else {
        throw new ApiError('INTERNAL', `Server responded with status ${res.status}`);
      }
    }

    const data = (await res.json()) as AnalyzeResponse;
    return data;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) {
      throw err;
    }

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('UPSTREAM_TIMEOUT', 'The analysis request timed out. Please try again.');
    }

    throw new ApiError(
      'INTERNAL',
      err instanceof Error ? err.message : 'Unable to connect to GitRoast backend service.'
    );
  }
}
