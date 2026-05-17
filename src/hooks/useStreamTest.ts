import { useState, useRef, useCallback } from 'react';
import type { StreamTestState, StreamTestConfig, StreamMetrics } from '../types';
import { streamCompletion } from '../utils/streaming';
import { fetchModels, detectProvider } from '../utils/models';

/** Default config for quick testing */
const DEFAULT_CONFIG: StreamTestConfig = {
  baseUrl: 'https://api.openai.com',
  model: 'gpt-4o-mini',
  apiKey: '',
  prompt: 'Hello! Please write a short paragraph about LLM benchmarking tools.',
  maxTokens: 4096,
  temperature: 0.7,
};

/**
 * Hook that manages the lifecycle of a streaming benchmark test.
 *
 * Handles:
 * - Fetching available models from a provider
 * - Running the streaming test with performance capture
 * - Exposing live response text and final metrics
 */
export function useStreamTest() {
  const [state, setState] = useState<StreamTestState>({
    status: 'idle',
    metrics: null,
    error: null,
    responseText: '',
    reasoningText: '',
    models: [],
    modelsLoaded: false,
  });

  const abortRef = useRef<AbortController | null>(null);

  /**
   * Fetch models from the configured base URL.
   */
  const loadModels = useCallback(async (baseUrl: string, apiKey: string) => {
    setState(prev => ({ ...prev, status: 'loading-models', error: null }));
    try {
      const models = await fetchModels(baseUrl, apiKey);
      setState(prev => ({
        ...prev,
        status: 'idle',
        models,
        modelsLoaded: true,
        error: null,
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        status: 'idle',
        modelsLoaded: true,
        error: err instanceof Error ? err.message : 'Failed to load models',
        models: [],
      }));
    }
  }, []);

  /**
   * Run a streaming benchmark test with the given config.
   */
  const runTest = useCallback(async (config: Partial<StreamTestConfig> = {}) => {
    const merged: StreamTestConfig = { ...DEFAULT_CONFIG, ...config };

    // Validate
    if (!merged.apiKey) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'API key is required',
      }));
      return;
    }

    if (!merged.baseUrl) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Base URL is required',
      }));
      return;
    }

    abortRef.current = new AbortController();

    const provider = detectProvider(merged.baseUrl);

    setState(prev => ({
      ...prev,
      status: 'streaming',
      error: null,
      metrics: null,
      responseText: '',
      reasoningText: '',
    }));

    try {
      const metrics: StreamMetrics = await streamCompletion(
        merged,
        (chunk) => {
          // Update response text incrementally on each chunk
          setState(prev => ({
            ...prev,
            responseText: prev.responseText + chunk,
          }));
        },
        abortRef.current?.signal,
        (reasoningChunk) => {
          // Update reasoning text incrementally on each chunk
          setState(prev => ({
            ...prev,
            reasoningText: prev.reasoningText + reasoningChunk,
          }));
        },
      );

      setState(prev => ({
        ...prev,
        status: 'done',
        metrics,
        error: null,
      }));

      return { provider, model: merged.model, ...metrics };
    } catch (err) {
      // Ignore abort errors
      if (err instanceof DOMException && err.name === 'AbortError') {
        setState(prev => ({ ...prev, status: 'idle' }));
        return null;
      }

      setState(prev => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Stream test failed',
      }));
      return null;
    }
  }, []);

  /**
   * Cancel an in-progress test.
   */
  const cancelTest = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(prev => ({ ...prev, status: 'idle' }));
  }, []);

  /** Reset state back to idle */
  const reset = useCallback(() => {
    cancelTest();
    setState({
      status: 'idle',
      metrics: null,
      error: null,
      responseText: '',
      reasoningText: '',
      models: [],
      modelsLoaded: false,
    });
  }, [cancelTest]);

  return {
    ...state,
    loadModels,
    runTest,
    cancelTest,
    reset,
    isRunning: state.status === 'streaming',
    isLoadingModels: state.status === 'loading-models',
  };
}