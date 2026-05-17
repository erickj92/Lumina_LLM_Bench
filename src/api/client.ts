/** API client for the Lumina Bench backend.

All backend calls go through this module.
In development, the Vite proxy routes /auth/* and /results/* to
the FastAPI server on localhost:8000.
*/

const API_BASE = '';

interface TokenResponse {
  access_token: string;
  token_type: string;
  username: string;
}

interface SubmitResultBody {
  provider: string;
  model: string;
  ttft_ms: number;
  tps: number;
  total_tokens: number;
  latency_ms: number;
  region?: string;
  timestamp?: string;
}

export interface TestResultResponse {
  id: number;
  provider: string;
  model: string;
  ttft_ms: number;
  tps: number;
  total_tokens: number;
  latency_ms: number;
  region: string | null;
  timestamp: string;
  username: string | null;
}

export interface AggregatedStats {
  provider: string;
  model: string;
  avg_ttft_ms: number;
  avg_tps: number;
  avg_latency_ms: number;
  avg_total_tokens: number;
  total_runs: number;
  last_updated: string | null;
}

export interface GlobalStatsResponse {
  stats: AggregatedStats[];
  total_results: number;
}

/** Get the stored JWT token (if any) */
function getToken(): string | null {
  return localStorage.getItem('lmb-auth-token');
}

/** Store a JWT token */
function setToken(token: string): void {
  localStorage.setItem('lmb-auth-token', token);
}

/** Remove the stored JWT token */
function clearToken(): void {
  localStorage.removeItem('lmb-auth-token');
  localStorage.removeItem('lmb-auth-username');
}

/** Check if we have a stored token */
function hasToken(): boolean {
  return !!localStorage.getItem('lmb-auth-token');
}

/** Get the stored username */
function getStoredUsername(): string | null {
  return localStorage.getItem('lmb-auth-username');
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  authenticated = false,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authenticated) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(data.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ── Auth API ──────────────────────────────────────────────────────────────

export async function register(username: string, password: string): Promise<TokenResponse> {
  const data = await request<TokenResponse>('POST', '/auth/register', { username, password });
  setToken(data.access_token);
  localStorage.setItem('lmb-auth-username', data.username);
  return data;
}

export async function login(username: string, password: string): Promise<TokenResponse> {
  const data = await request<TokenResponse>('POST', '/auth/login', { username, password });
  setToken(data.access_token);
  localStorage.setItem('lmb-auth-username', data.username);
  return data;
}

export function logout(): void {
  clearToken();
}

export { getToken, hasToken, getStoredUsername, clearToken };

// ── Results API ────────────────────────────────────────────────────────────

export async function submitResult(body: SubmitResultBody): Promise<TestResultResponse> {
  return request<TestResultResponse>('POST', '/results/submit', body, true);
}

export async function getGlobalStats(): Promise<GlobalStatsResponse> {
  return request<GlobalStatsResponse>('GET', '/results/global');
}

export async function getRecentResults(limit = 20): Promise<TestResultResponse[]> {
  return request<TestResultResponse[]>('GET', `/results/recent?limit=${limit}`);
}