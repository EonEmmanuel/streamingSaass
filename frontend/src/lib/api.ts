const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';
const HLS_BASE = import.meta.env.VITE_HLS_BASE_URL ?? 'http://localhost:8000/live';

export const getApiBase = (): string => API_BASE;
export const getHlsUrl = (streamKey: string): string => `${HLS_BASE}/${streamKey}/index.m3u8`;

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return (await response.json()) as T;
}
