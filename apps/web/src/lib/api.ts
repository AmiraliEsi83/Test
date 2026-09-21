const API = "";

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
  if (init.body) headers["Content-Type"] = headers["Content-Type"] || "application/json";
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { error?: string }).error || res.statusText);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  return data as T;
}

export function money(n: number, d = 2) {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(d)}`;
}

export function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
