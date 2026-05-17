/** Provider metadata detected from a metadata detected from a base URL */
export interface ProviderInfo {
  name: string;
  baseUrl: string;
}

/** A model returned from /v1/models */
export interface ModelInfo {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

/** Response shape from GET /v1/models */
export interface ModelsResponse {
  object: string;
  data: ModelInfo[];
}

/** Metrics captured during a streaming test */
export interface StreamMetrics {
  ttft: number;           // Time to First Token (ms)
  tps: number;            // Tokens Per Second
  totalTokens: number;    // Total tokens received (estimated)
  totalDuration: number;  // Total request duration (ms)
  latency: number;        // Initial connection latency (ms)
  promptTokens?: number;  // Actual prompt tokens from API usage
  completionTokens?: number; // Actual completion tokens from API usage
  reasoningContent?: string; // Accumulated reasoning/thinking text
  reasoningTokens?: number;  // Estimated reasoning/thinking token count
}

/** Config for a streaming test */
export interface StreamTestConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  prompt?: string;
  maxTokens?: number;
  temperature?: number;
}

/** Result of a single streaming test */
export interface TestResult extends StreamMetrics {
  id: string;
  timestamp: number;
  provider: string;
  model: string;
}

/** Status of an in-progress test */
export type TestStatus = 'idle' | 'loading-models' | 'streaming' | 'done' | 'error';

/** Full state for the stream test hook */
export interface StreamTestState {
  status: TestStatus;
  metrics: StreamMetrics | null;
  error: string | null;
  responseText: string;
  reasoningText: string;
  models: ModelInfo[];
  modelsLoaded: boolean;
}

/** Stored API key entry */
export interface StoredKey {
  id: string;
  provider: string;
  baseUrl: string;
  /** Encrypted/obfuscated key value */
  encryptedKey: string;
  alias?: string;
  createdAt: number;
  lastUsed?: number;
}

/** App views for navigation */
export type AppView = 'dashboard' | 'run-test' | 'history' | 'vault';