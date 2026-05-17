import type { ModelInfo } from '../types';

/**
 * Detect if we're running in a Vite dev server (localhost) so we can use a
 * proxy to bypass CORS on ollama.com (which doesn't serve CORS headers).
 */
function isDevEnvironment(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

/**
 * Get the Ollama Cloud API URL, using the Vite dev proxy to bypass CORS
 * when running locally, or the direct ollama.com URL otherwise.
 */
export function getOllamaCloudApiUrl(path: string): string {
  if (isDevEnvironment()) {
    return `/ollama-proxy${path}`;
  }
  return `https://ollama.com${path}`;
}

/**
 * Check whether a base URL points to a local Ollama instance (localhost).
 */
export function isLocalOllamaUrl(baseUrl: string): boolean {
  const url = baseUrl.toLowerCase();
  return (
    url.includes('localhost:11434') ||
    url.includes('127.0.0.1:11434') ||
    url.endsWith(':11434')
  );
}

/**
 * Check whether a base URL points to the Ollama Cloud Ollama (ollama.com).
 */
export function isOllamaCloudUrl(baseUrl: string): boolean {
  const url = baseUrl.toLowerCase();
  return url.includes('ollama.com') && !isLocalOllamaUrl(baseUrl);
}

/**
 * Check whether a base URL points to any Ollama instance (local or cloud).
 */
export function isOllamaUrl(baseUrl: string): boolean {
  return isLocalOllamaUrl(baseUrl) || isOllamaCloudUrl(baseUrl);
}

/**
 * Fetch available models from an OpenAI-compatible /v1/models endpoint.
 * Automatically routes to Ollama's native /api/tags when the URL points
 * to an Ollama instance.
 *
 * All credential handling stays client-side.
 *
 * @param baseUrl - The provider's base URL (e.g. "https://api.openai.com")
 * @param apiKey - The user's API key for this provider
 * @returns Array of model info objects
 */
export async function fetchModels(
  baseUrl: string,
  apiKey: string,
): Promise<ModelInfo[]> {
  if (isOllamaCloudUrl(baseUrl)) {
    return fetchOllamaCloudModels();
  }

  if (isLocalOllamaUrl(baseUrl)) {
    return fetchOllamaModels(baseUrl);
  }

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const endpoint = `${normalizedBase}/v1/models`;

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `Failed to fetch models (${response.status}): ${errorBody || response.statusText}`,
    );
  }

  const data = await response.json();
  return data?.data ?? [];
}

/**
 * Fetch models from an Ollama endpoint using its native /api/tags API.
 * Ollama does not require an API key for local instances.
 */
export async function fetchOllamaModels(baseUrl: string): Promise<ModelInfo[]> {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const endpoint = `${normalizedBase}/api/tags`;

  const response = await fetch(endpoint);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `Failed to fetch Ollama models (${response.status}): ${errorBody || response.statusText}`,
    );
  }

  const data = await response.json();
  const models = data?.models ?? [];

  return models.map((m: Record<string, unknown>) => ({
    id: m.name as string,
    object: 'model',
    created: Math.floor(
      (m.modified_at ? new Date(m.modified_at as string).getTime() : Date.now()) / 1000,
    ),
    owned_by: 'ollama',
  }));
}

/**
 * Fetch models from the Cloud Ollama endpoint (https://ollama.com/api/tags).
 * The model listing endpoint is public — no API key required.
 *
 * Uses a Vite dev proxy to work around ollama.com's missing CORS headers
 * during local development.
 */
export async function fetchOllamaCloudModels(): Promise<ModelInfo[]> {
  const endpoint = getOllamaCloudApiUrl('/api/tags');
  console.log('[fetchOllamaCloudModels] Fetching from:', endpoint);

  const response = await fetch(endpoint);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `Failed to fetch Ollama Cloud models (${response.status}): ${errorBody || response.statusText}`,
    );
  }

  const data = await response.json();
  console.log('[fetchOllamaCloudModels] Response keys:', Object.keys(data));
  console.log('[fetchOllamaCloudModels] Models count:', data?.models?.length ?? 0);

  const models = data?.models ?? [];

  if (models.length === 0) {
    console.warn('[fetchOllamaCloudModels] No models found in response data');
  }

  return models.map((m: Record<string, unknown>) => ({
    id: m.name as string,
    object: 'model',
    created: Math.floor(
      (m.modified_at ? new Date(m.modified_at as string).getTime() : Date.now()) / 1000,
    ),
    owned_by: 'ollama-cloud',
  }));
}

/**
 * Detect provider name from a base URL by extracting known patterns.
 * Falls back to a sanitized hostname if no known provider is detected.
 */
export function detectProvider(baseUrl: string): string {
  const hostname = baseUrl.toLowerCase();

  if (isOllamaCloudUrl(baseUrl)) return 'Ollama Cloud';
  if (isLocalOllamaUrl(baseUrl)) return 'Ollama (Local)';
  if (hostname.includes('openai.com')) return 'OpenAI';
  if (hostname.includes('groq.com')) return 'Groq';
  if (hostname.includes('venice.ai')) return 'Venice';
  if (hostname.includes('anthropic.com')) return 'Anthropic';
  if (hostname.includes('mistral.ai')) return 'Mistral';
  if (hostname.includes('together.xyz')) return 'Together';
  if (hostname.includes('deepseek.com')) return 'DeepSeek';
  if (hostname.includes('cohere.ai') || hostname.includes('cohere.com')) return 'Cohere';
  if (hostname.includes('perplexity') || hostname.includes('sonar')) return 'Perplexity';

  // Fallback: extract readable hostname
  try {
    return new URL(baseUrl).hostname.replace(/^www\./, '');
  } catch {
    return 'Unknown';
  }
}