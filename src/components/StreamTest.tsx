import { useState, useEffect, useCallback } from 'react';
import { useStreamTest } from '../hooks/useStreamTest';
import { useKeyStore } from '../stores/keyStore';
import { useHistoryStore } from '../stores/historyStore';
import { useUiStore } from '../stores/uiStore';
import { decryptKey } from '../lib/utils';
import { Card, CardContent, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { ModelSelector } from './ModelSelector';
import { detectProvider, isOllamaUrl, isOllamaCloudUrl, isLocalOllamaUrl } from '../utils/models';

const KNOWN_PROVIDERS = [
  { name: 'OpenAI', url: 'https://api.openai.com' },
  { name: 'Groq', url: 'https://api.groq.com' },
  { name: 'Venice', url: 'https://api.venice.ai' },
  { name: 'DeepSeek', url: 'https://api.deepseek.com' },
  { name: 'Together', url: 'https://api.together.xyz' },
  { name: 'Ollama Cloud', url: 'https://ollama.com' },
  { name: 'Ollama (Local)', url: 'http://localhost:11434' },
];

export function StreamTest() {
  const {
    metrics,
    error,
    responseText,
    reasoningText,
    models,
    modelsLoaded,
    isRunning,
    isLoadingModels,
    loadModels,
    runTest,
    cancelTest,
    reset,
  } = useStreamTest();

  const { keys, getDecryptedKey } = useKeyStore();
  const addResult = useHistoryStore(s => s.addResult);
  const addRecentModel = useUiStore(s => s.addRecentModel);
  const { customProviders, addCustomProvider, removeCustomProvider } = useUiStore();

  const [baseUrl, setBaseUrl] = useState('https://api.openai.com');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [manualModel, setManualModel] = useState('');
  const [maxTokens, setMaxTokens] = useState('4096');
  const [showReasoning, setShowReasoning] = useState(false);

  // Custom provider state
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customProviderName, setCustomProviderName] = useState('');

  // Try to auto-fill key from vault
  useEffect(() => {
    const storedKey = useKeyStore.getState().findKey(baseUrl);
    if (storedKey) {
      const decrypted = getDecryptedKey(storedKey.id);
      if (decrypted) setApiKey(decrypted);
    }
  }, [baseUrl]);

  const handleSelectProvider = (url: string) => {
    setBaseUrl(url);
    setSelectedModel('');
    setShowCustomForm(false);
    // Reset models when switching providers
    if (modelsLoaded) {
      reset();
    }
  };

  const handleSelectCustom = () => {
    setShowCustomForm(true);
    setBaseUrl('');
    setSelectedModel('');
    setCustomProviderName('');
  };

  const handleSelectCustomSaved = (name: string, url: string) => {
    setShowCustomForm(false);
    setBaseUrl(url);
    setCustomProviderName(name);
    setSelectedModel('');
  };

  const handleLoadModels = useCallback(() => {
    // Ollama doesn't need an API key for local model listing
    if (!apiKey && !isOllamaUrl(baseUrl)) return;
    loadModels(baseUrl, apiKey || '');
  }, [apiKey, baseUrl, loadModels]);

  const handleRunTest = useCallback(async () => {
    const effectiveModel = selectedModel || manualModel;
    if (!effectiveModel) return;
    // Local Ollama doesn't need an API key; cloud Ollama does
    if (!apiKey && !isLocalOllamaUrl(baseUrl)) return;

    const result = await runTest({
      baseUrl,
      apiKey,
      model: effectiveModel,
      maxTokens: parseInt(maxTokens, 10) || 4096,
    });

    if (result && 'ttft' in result) {
      const { provider, model, ...metricsData } = result;
      addRecentModel(provider, effectiveModel);
      await addResult({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        provider,
        model: effectiveModel,
        ...metricsData,
      });
    }
  }, [baseUrl, apiKey, selectedModel, manualModel, maxTokens, runTest, addRecentModel, addResult]);

  const handleSaveCustomProviderWrapper = useCallback(() => {
    const name = customProviderName.trim() || detectProvider(baseUrl);
    if (name && baseUrl.trim()) {
      addCustomProvider(name, baseUrl.trim());
    }
  }, [customProviderName, baseUrl, addCustomProvider]);

  const copyResponse = () => {
    navigator.clipboard.writeText(responseText).catch(() => {});
  };

  const recentModels = useUiStore(s => s.recentlyUsedModels)
    .filter(m => m.provider === detectProvider(baseUrl))
    .map(m => m.model);

  const isOllamaLocal = isLocalOllamaUrl(baseUrl);
  const isOllamaCloud = isOllamaCloudUrl(baseUrl);
  const isOllama = isOllamaUrl(baseUrl);
  const canLoadModels = (apiKey || isOllama) && !isLoadingModels;
  const canRunTest = (apiKey || isOllamaLocal) && (selectedModel || manualModel) && !isRunning;

  return (
    <div className="space-y-6">
      {/* Provider selector */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-text">Provider</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {KNOWN_PROVIDERS.map(p => (
              <button
                key={p.url}
                onClick={() => handleSelectProvider(p.url)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  !showCustomForm && baseUrl === p.url
                    ? 'bg-lumina-600 text-white'
                    : 'bg-surface-3 text-text-secondary border border-border hover:border-border-light'
                }`}
              >
                {p.name}
              </button>
            ))}
            <button
              onClick={handleSelectCustom}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showCustomForm
                  ? 'bg-lumina-600 text-white'
                  : 'bg-surface-3 text-text-secondary border border-border hover:border-border-light'
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom provider form */}
          {showCustomForm && (
            <div className="space-y-2 p-3 rounded-lg bg-surface-3/50 border border-border">
              <Input
                placeholder="Provider Name (e.g. My Local LLM)"
                value={customProviderName}
                onChange={e => setCustomProviderName(e.target.value)}
              />
              <Input
                placeholder="API Base URL (e.g. https://my-llm.example.com)"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveCustomProviderWrapper}
                  disabled={!customProviderName.trim() || !baseUrl.trim()}
                >
                  Save Provider
                </Button>
              </div>
            </div>
          )}

          {/* If not showing custom form, show normal URL input */}
          {!showCustomForm && (
            <Input
              placeholder="Or enter a custom URL (e.g. http://localhost:11434)"
              value={baseUrl}
              onChange={e => {
                setBaseUrl(e.target.value);
                setShowCustomForm(false);
              }}
            />
          )}

          {/* Saved custom providers quick-select */}
          {customProviders.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {customProviders.map(cp => (
                <button
                  key={cp.id}
                  onClick={() => handleSelectCustomSaved(cp.name, cp.baseUrl)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-surface-3 border border-border text-text-secondary hover:border-lumina-500 transition-colors"
                >
                  {cp.name}
                  <span
                    onClick={e => {
                      e.stopPropagation();
                      removeCustomProvider(cp.id);
                    }}
                    className="ml-1 text-text-muted hover:text-danger cursor-pointer"
                  >
                    x
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Key */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-text">API Key</h3>
          {!isOllama && (
            <p className="text-xs text-text-muted mt-1">
              Not needed for Ollama instances
            </p>
          )}
          {keys.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {keys.filter(k => k.baseUrl === baseUrl).map(k => (
                <button
                  key={k.id}
                  onClick={() => {
                    const d = getDecryptedKey(k.id);
                    if (d) setApiKey(d);
                  }}
                  className="text-xs px-2 py-1 rounded bg-surface-3 border border-border text-text-secondary hover:border-lumina-500 transition-colors"
                >
                  🔑 {k.alias || k.provider}
                </button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder={isOllamaLocal ? 'Not required for local Ollama' : isOllamaCloud ? 'ollama-api-key...' : 'sk-...'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="primary"
              onClick={handleLoadModels}
              disabled={!canLoadModels}
            >
              {isLoadingModels ? '...' : 'Load Models'}
            </Button>
          </div>
          {apiKey && !isOllama && (
            <p className="text-xs text-text-muted mt-1">
              Key stays in your browser — never sent to our server
            </p>
          )}
          {isOllamaLocal && (
            <p className="text-xs text-text-muted mt-1">
              Ollama runs locally — no API key needed
            </p>
          )}
          {isOllamaCloud && (
            <p className="text-xs text-text-muted mt-1">
              Ollama Cloud requires an API key for chat — get yours at{' '}
              <a
                href="https://ollama.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lumina-500 hover:text-lumina-400 underline"
              >
                ollama.com/settings/keys
              </a>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Model selector */}
      {models.length > 0 && (
        <Card>
          <CardContent>
            <ModelSelector
              models={models}
              selected={selectedModel}
              onSelect={setSelectedModel}
              recentModels={recentModels}
              showManual={modelsLoaded && models.length === 0}
              manualValue={manualModel}
              onManualChange={setManualModel}
            />
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary whitespace-nowrap">
            Max tokens:
          </label>
          <input
            type="number"
            min="1"
            max="65536"
            value={maxTokens}
            onChange={e => setMaxTokens(e.target.value)}
            className="w-20 rounded-lg border border-border bg-surface-3 px-2 py-1.5 text-sm text-text text-center focus:outline-none focus:ring-2 focus:ring-lumina-500"
          />
        </div>
        <div className="flex gap-2 ml-auto">
          <Button
            variant="primary"
            onClick={(e) => {
              handleRunTest().catch();
            }}
            disabled={!canRunTest}
          >
            {isRunning ? 'Running...' : 'Run Benchmark'}
          </Button>
          {isRunning && (
            <Button variant="danger" onClick={cancelTest}>
              Cancel
            </Button>
          )}
          <Button variant="ghost" onClick={reset}>
            Reset
          </Button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
          {error}
        </div>
      )}

      {/* Metrics display */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label: 'TTFT', value: `${metrics.ttft.toFixed(1)} ms`, desc: 'Time to First Token' },
            { label: 'TPS', value: `${metrics.tps.toFixed(1)} tok/s`, desc: 'Tokens per Second' },
            {
              label: 'Output Tokens',
              value: metrics.completionTokens
                ? `${Math.max(0, metrics.totalTokens - (metrics.reasoningTokens ?? 0))} est / ${metrics.completionTokens} actual`
                : `${Math.max(0, metrics.totalTokens - (metrics.reasoningTokens ?? 0))} (est)`,
              desc: 'Content tokens',
            },
            metrics.reasoningTokens
              ? { label: 'Reasoning', value: `${metrics.reasoningTokens}`, desc: 'Thinking tokens' }
              : null,
            { label: 'Total', value: `${metrics.totalTokens}`, desc: 'Total tokens' },
            { label: 'Duration', value: `${metrics.totalDuration.toFixed(0)}ms`, desc: 'End-to-end' },
            { label: 'Latency', value: `${metrics.latency.toFixed(0)}ms`, desc: 'Connection' },
            metrics.promptTokens !== undefined
              ? { label: 'Prompt', value: `${metrics.promptTokens}`, desc: 'Input tokens' }
              : null,
          ].filter(Boolean).map(stat => stat && (
            <Card key={stat.label} className="p-3">
              <div className="text-[10px] text-text-muted uppercase tracking-wider">{stat.desc}</div>
              <div className="text-lg font-bold text-text mt-0.5">{stat.value}</div>
              <div className="text-xs text-text-secondary">{stat.label}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Reasoning text */}
      {reasoningText && (
        <Card>
          <div
            onClick={() => setShowReasoning(!showReasoning)}
            className="flex items-center justify-between p-3 cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <Badge variant="success">Reasoning</Badge>
              <span className="text-xs text-text-muted">
                {metrics?.reasoningTokens ?? ''} tokens
              </span>
            </div>
            <span className="text-text-secondary text-sm">{showReasoning ? '▲' : '▼'}</span>
          </div>
          {showReasoning && (
            <pre className="bg-surface-3 text-success p-4 rounded-b-xl text-xs leading-relaxed overflow-auto max-h-60 whitespace-pre-wrap break-words m-0">
              {reasoningText}
            </pre>
          )}
        </Card>
      )}

      {/* Response text */}
      {responseText && (
        <Card>
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="text-sm font-semibold text-text">Response</h3>
            <Button variant="ghost" size="sm" onClick={copyResponse}>
              Copy
            </Button>
          </div>
          <pre className="bg-surface-3 text-text p-4 rounded-b-xl text-xs leading-relaxed overflow-auto max-h-96 whitespace-pre-wrap break-words m-0 font-mono">
            {responseText}
          </pre>
        </Card>
      )}
    </div>
  );
}