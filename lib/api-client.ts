export class ApiError extends Error {
  status: number;
  details?: Record<string, string[]>;
  constructor(message: string, status: number, details?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

/** Thin JSON fetch wrapper that throws ApiError on non-2xx responses. */
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.error ?? "Request failed", res.status, data?.details);
  }
  return data as T;
}
