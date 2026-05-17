import type { ModelInfo } from '../types';

/**
 * Fetch available models from an OpenAI-compatible /v1/models endpoint.
 * Uses the user-provided API key for authentication.
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
 * Detect provider name from a base URL by extracting known patterns.
 * Falls back to a sanitized hostname if no known provider is detected.
 */
export function detectProvider(baseUrl: string): string {
  const hostname = baseUrl.toLowerCase();

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