import type { StreamMetrics, StreamTestConfig } from '../types';
import { isOllamaCloudUrl, isLocalOllamaUrl, getOllamaCloudApiUrl } from './models';

function estimateTokenCount(text: string): number {
  return Math.max(1, Math.round(text.length / 4));
}

export async function streamCompletion(
  config: StreamTestConfig,
  onChunk?: (text: string) => void,
  signal?: AbortSignal,
  onReasoningChunk?: (text: string) => void,
): Promise<StreamMetrics> {
  if (isOllamaCloudUrl(config.baseUrl)) {
    return streamOllamaCloudCompletion(config, onChunk, signal, onReasoningChunk);
  }

  if (isLocalOllamaUrl(config.baseUrl)) {
    return streamOllamaCompletion(config, onChunk, signal, onReasoningChunk);
  }

  const { baseUrl, model, apiKey, prompt, maxTokens, temperature } = {
    prompt: 'Hello, please respond with a short paragraph about AI benchmarking.',
    maxTokens: 256,
    temperature: 0.7,
    ...config,
  };

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const endpoint = normalizedBase + '/v1/chat/completions';

  const requestStart = performance.now();
  let ttft: number | null = null;
  let firstChunkTime: number | null = null;
  let accumulatedText = '';
  let accumulatedReasoning = '';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      'API error ' + response.status + ': ' + response.statusText + (errorBody ? ' - ' + errorBody : ''),
    );
  }

  const latency = performance.now() - requestStart;

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('ReadableStream not supported in this environment');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let streamFinished = false;

  const processLine = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed || trimmed === 'data: [DONE]') return false;
    if (!trimmed.startsWith('data: ')) return false;

    const jsonStr = trimmed.slice(6).replace(/\r$/, '');
    const now = performance.now();

    try {
      const parsed = JSON.parse(jsonStr);
      const choice = parsed.choices?.[0];
      const finishReason = choice?.finish_reason;
      const deltas = choice?.delta ?? {};
      const reasoningDelta = deltas.reasoning_content ?? deltas.reasoning ?? deltas.thinking;
      const contentDelta = deltas.content;

      if (ttft === null && (contentDelta || reasoningDelta)) {
        ttft = now - requestStart;
        firstChunkTime = now;
      }

      if (reasoningDelta) {
        accumulatedReasoning += reasoningDelta;
        onReasoningChunk?.(reasoningDelta);
      }

      if (contentDelta) {
        accumulatedText += contentDelta;
        onChunk?.(contentDelta);
      }

      if (finishReason === 'stop' || finishReason === 'length') {
        return true;
      }
    } catch (parseError) {
      const msg = parseError instanceof Error ? parseError.message : String(parseError);
      console.warn('[streaming] Skipping malformed JSON: ' + msg);
    }

    return false;
  };

  while (!streamFinished) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (processLine(line)) {
        streamFinished = true;
        break;
      }
    }
  }

  if (buffer.trim() && !streamFinished) {
    if (processLine(buffer)) {
      streamFinished = true;
    }
    buffer = '';
  }

  decoder.decode();

  const now = performance.now();
  const totalDuration = now - requestStart;
  const streamDuration = firstChunkTime ? now - firstChunkTime : totalDuration;

  const contentTokens = estimateTokenCount(accumulatedText);
  const reasoningTokenEstimate = accumulatedReasoning
    ? estimateTokenCount(accumulatedReasoning)
    : 0;

  return {
    ttft: ttft ?? totalDuration,
    tps: streamDuration > 0
      ? estimateTokenCount(accumulatedText) / (streamDuration / 1000)
      : 0,
    totalTokens: contentTokens + reasoningTokenEstimate,
    totalDuration,
    latency,
    reasoningContent: accumulatedReasoning || undefined,
    reasoningTokens: reasoningTokenEstimate || undefined,
  };
}

export async function streamOllamaCompletion(
  config: StreamTestConfig,
  onChunk?: (text: string) => void,
  signal?: AbortSignal,
  _onReasoningChunk?: (text: string) => void,
): Promise<StreamMetrics> {
  const { baseUrl, model, prompt, maxTokens, temperature } = {
    prompt: 'Hello, please respond with a short paragraph about AI benchmarking.',
    maxTokens: 256,
    temperature: 0.7,
    ...config,
  };

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const endpoint = normalizedBase + '/api/chat';

  const requestStart = performance.now();
  let ttft: number | null = null;
  let firstChunkTime: number | null = null;
  let accumulatedText = '';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      options: { temperature, num_predict: maxTokens },
    }),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      'Ollama API error ' + response.status + ': ' + response.statusText + (errorBody ? ' - ' + errorBody : ''),
    );
  }

  const latency = performance.now() - requestStart;

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('ReadableStream not supported in this environment');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let promptEvalCount: number | undefined;
  let evalCount: number | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const now = performance.now();

      try {
        const parsed = JSON.parse(trimmed);
        const content: string = parsed.message?.content ?? '';

        if (content && ttft === null) {
          ttft = now - requestStart;
          firstChunkTime = now;
        }

        if (content) {
          accumulatedText += content;
          onChunk?.(content);
        }

        if (parsed.done === true) {
          promptEvalCount = parsed.prompt_eval_count as number | undefined;
          evalCount = parsed.eval_count as number | undefined;
        }
      } catch (parseError) {
        const msg = parseError instanceof Error ? parseError.message : String(parseError);
        console.warn('[streamOllama] Skipping malformed JSON: ' + msg);
      }
    }
  }

  const now = performance.now();
  const totalDuration = now - requestStart;
  const streamDuration = firstChunkTime ? now - firstChunkTime : totalDuration;
  const contentTokens = estimateTokenCount(accumulatedText);

  return {
    ttft: ttft ?? totalDuration,
    tps: streamDuration > 0 ? contentTokens / (streamDuration / 1000) : 0,
    totalTokens: contentTokens,
    totalDuration,
    latency,
    promptTokens: promptEvalCount,
    completionTokens: evalCount,
    reasoningContent: undefined,
    reasoningTokens: undefined,
  };
}

/**
 * Stream a chat completion from the Ollama Cloud API.
 * Uses the NDJSON response format from https://ollama.com/api/chat.
 * Requires an API key via Authorization header.
 */
export async function streamOllamaCloudCompletion(
  config: StreamTestConfig,
  onChunk?: (text: string) => void,
  signal?: AbortSignal,
  _onReasoningChunk?: (text: string) => void,
): Promise<StreamMetrics> {
  const { baseUrl, model, apiKey, prompt, maxTokens, temperature } = {
    prompt: 'Hello, please respond with a short paragraph about AI benchmarking.',
    maxTokens: 256,
    temperature: 0.7,
    ...config,
  };

  // Use the CORS-aware proxy URL in dev mode
  const endpoint = isOllamaCloudUrl(baseUrl)
    ? getOllamaCloudApiUrl('/api/chat')
    : baseUrl.replace(/\/+$/, '') + '/api/chat';
  console.log('[streamOllamaCloudCompletion] Using endpoint:', endpoint);

  const requestStart = performance.now();
  let ttft: number | null = null;
  let firstChunkTime: number | null = null;
  let accumulatedText = '';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      options: { temperature, num_predict: maxTokens },
    }),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      'Ollama Cloud API error ' + response.status + ': ' + response.statusText + (errorBody ? ' - ' + errorBody : ''),
    );
  }

  const latency = performance.now() - requestStart;

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('ReadableStream not supported in this environment');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let promptEvalCount: number | undefined;
  let evalCount: number | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const now = performance.now();

      try {
        const parsed = JSON.parse(trimmed);
        const content: string = parsed.message?.content ?? '';

        if (content && ttft === null) {
          ttft = now - requestStart;
          firstChunkTime = now;
        }

        if (content) {
          accumulatedText += content;
          onChunk?.(content);
        }

        if (parsed.done === true) {
          promptEvalCount = parsed.prompt_eval_count as number | undefined;
          evalCount = parsed.eval_count as number | undefined;
        }
      } catch (parseError) {
        const msg = parseError instanceof Error ? parseError.message : String(parseError);
        console.warn('[streamOllamaCloud] Skipping malformed JSON: ' + msg);
      }
    }
  }

  const now = performance.now();
  const totalDuration = now - requestStart;
  const streamDuration = firstChunkTime ? now - firstChunkTime : totalDuration;
  const contentTokens = estimateTokenCount(accumulatedText);

  return {
    ttft: ttft ?? totalDuration,
    tps: streamDuration > 0 ? contentTokens / (streamDuration / 1000) : 0,
    totalTokens: contentTokens,
    totalDuration,
    latency,
    promptTokens: promptEvalCount,
    completionTokens: evalCount,
    reasoningContent: undefined,
    reasoningTokens: undefined,
  };
}