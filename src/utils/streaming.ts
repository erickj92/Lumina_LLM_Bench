import type { StreamMetrics, StreamTestConfig } from '../types';

/**
 * Estimate token count from a text string.
 * Uses a rough heuristic: ~4 characters per token for English text.
 * This is a client-side estimation — true token counts require a tokenizer.
 */
function estimateTokenCount(text: string): number {
  return Math.max(1, Math.round(text.length / 4));
}

/**
 * Execute a streaming request against an OpenAI-compatible chat completions endpoint.
 * Captures performance metrics (TTFT, TPS) using performance.now().
 *
 * All API key handling stays client-side — the key is sent directly to the
 * configured base URL via the browser's fetch API.
 *
 * @param config - The test configuration (baseUrl, model, apiKey, etc.)
 * @param onChunk - Callback invoked with each decoded text chunk as it arrives
 * @param signal - Optional AbortSignal to cancel the request mid-stream
 * @returns The computed stream metrics once the stream completes
 */
export async function streamCompletion(
  config: StreamTestConfig,
  onChunk?: (text: string) => void,
  signal?: AbortSignal,
  onReasoningChunk?: (text: string) => void,
): Promise<StreamMetrics> {
  const {
    baseUrl,
    model,
    apiKey,
    prompt = 'Hello, please respond with a short paragraph about AI benchmarking.',
    maxTokens = 256,
    temperature = 0.7,
  } = config;

  // Strip trailing slash and build endpoint
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const endpoint = `${normalizedBase}/v1/chat/completions`;

  const requestStart = performance.now();
  let ttft: number | null = null;
  let firstChunkTime: number | null = null;
  let accumulatedText = '';
  let accumulatedReasoning = '';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature,
      stream: true,
    }),
    signal, // Allow external cancellation via AbortSignal
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `API error ${response.status}: ${response.statusText}${errorBody ? ` — ${errorBody}` : ''}`,
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

  /**
   * Process a single SSE data line and accumulate its content.
   * Mutates the outer `accumulatedText`, `ttft`, `firstChunkTime` variables
   * via closure.
   *
   * @returns true if a finish_reason was encountered (stream is complete)
   */
  const processLine = (line: string): boolean => {
    const trimmed = line.trim();

    // Skip empty lines and the stream-end signal
    if (!trimmed || trimmed === 'data: [DONE]') return false;

    // Parse SSE "data: ..." prefix
    if (!trimmed.startsWith('data: ')) return false;

    // Remove "data: " prefix and strip trailing \r (from CRLF line endings)
    // before JSON.parse — prevents silent failures on Windows-style \r\n SSE streams
    const jsonStr = trimmed.slice(6).replace(/\r$/, '');
    const now = performance.now();

    try {
      const parsed = JSON.parse(jsonStr);
      const choice = parsed.choices?.[0];
      const finishReason = choice?.finish_reason;

      const deltas = choice?.delta ?? {};
      const reasoningDelta = deltas.reasoning_content ?? deltas.reasoning ?? deltas.thinking;
      const contentDelta = deltas.content;

      // Capture TTFT on the very first token (reasoning or content)
      if (ttft === null && (contentDelta || reasoningDelta)) {
        ttft = now - requestStart;
        firstChunkTime = now;
      }

      // Accumulate reasoning/thinking text
      if (reasoningDelta) {
        accumulatedReasoning += reasoningDelta;
        onReasoningChunk?.(reasoningDelta);
      }

      // Accumulate visible content
      if (contentDelta) {
        accumulatedText += contentDelta;
        onChunk?.(contentDelta);
      }

      // Stream finished
      if (finishReason === 'stop' || finishReason === 'length') {
        return true;
      }
    } catch (parseError) {
      // Report parse failures so they aren't silently swallowed.
      // The \r stripping above should prevent CRLF-related errors —
      // if we land here it's a genuine malformed JSON from the provider.
      const msg = parseError instanceof Error ? parseError.message : String(parseError);
      console.warn(`[streaming] Skipping malformed JSON: ${msg}`);
    }

    return false;
  };

  // ═══════════════════════════════════════════════════
  // Phase 1: Consume stream chunks until exhausted
  // ═══════════════════════════════════════════════════
  while (!streamFinished) {
    const { done, value } = await reader.read();
    if (done) break;

    // Decode chunk bytes into text
    buffer += decoder.decode(value, { stream: true });

    // Split buffer into complete lines (by `\n`)
    const lines = buffer.split('\n');
    // The last element is either an incomplete line or empty after a trailing `\n`
    buffer = lines.pop() ?? '';

    // Process every complete line
    for (const line of lines) {
      if (processLine(line)) {
        streamFinished = true;
        break;
      }
    }
  }

  // ═══════════════════════════════════════════════════
  // Phase 2: Flush remaining buffer content
  // ═══════════════════════════════════════════════════
  // Handles the case where the server's last chunk didn't end with `\n`,
  // leaving a complete/partial SSE line stranded in `buffer`.
  if (buffer.trim() && !streamFinished) {
    if (processLine(buffer)) {
      streamFinished = true;
    }
    buffer = '';
  }

  // ═══════════════════════════════════════════════════
  // Phase 3: Flush TextDecoder internal buffer
  // ═══════════════════════════════════════════════════
  // Without this, bytes held for an incomplete multi-byte UTF-8 sequence
  // would be silently discarded when the decoder is garbage-collected.
  decoder.decode();

  // ═══════════════════════════════════════════════════
  // Build and return final metrics
  // ═══════════════════════════════════════════════════
  const now = performance.now();
  const totalDuration = now - requestStart;
  const streamDuration = firstChunkTime
    ? now - firstChunkTime
    : totalDuration;

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