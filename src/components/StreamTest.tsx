import { useState, useEffect } from 'react';
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
import { detectProvider } from '../utils/models';

const KNOWN_PROVIDERS = [
  { name: 'OpenAI', url: 'https://api.openai.com' },
  { name: 'Groq', url: 'https://api.groq.com' },
  { name: 'Venice', url: 'https://api.venice.ai' },
  { name: 'DeepSeek', url: 'https://api.deepseek.com' },
  { name: 'Together', url: 'https://api.together.xyz' },
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

  const [baseUrl, setBaseUrl] = useState('https://api.openai.com');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [manualModel, setManualModel] = useState('');
  const [maxTokens, setMaxTokens] = useState('4096');
  const [showReasoning, setShowReasoning] = useState(false);

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
  };

  const handleLoadModels = () => {
    if (!apiKey) return;
    loadModels(baseUrl, apiKey);
  };

  const handleRunTest = async () => {
    const effectiveModel = selectedModel || manualModel;
    if (!apiKey || !effectiveModel) return;

    const result = await runTest({
      baseUrl,
      apiKey,
      model: effectiveModel,
      maxTokens: parseInt(maxTokens, 10) || 4096,
    });

    if (result && 'ttft' in result) {
      // result.provider is correctly detected via detectProvider()
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
  };

  const copyResponse = () => {
    navigator.clipboard.writeText(responseText).catch(() => {});
  };

  const recentModels = useUiStore(s => s.recentlyUsedModels)
    .filter(m => m.provider === detectProvider(baseUrl))
    .map(m => m.model);

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
                  baseUrl === p.url
                    ? 'bg-lumina-600 text-white' : 'bg-surface-3 text-text-secondary border border-border hover:border-border-light'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
          <Input
            placeholder="Or enter a custom base URL..."
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* API Key */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-text">API Key</h3>
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
              placeholder="sk-..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="primary"
              onClick={handleLoadModels}
              disabled={!apiKey || isLoadingModels}
            >
              {isLoadingModels ? '...' : 'Load Models'}
            </Button>
          </div>
          {apiKey && (
            <p className="text-xs text-text-muted mt-1">
              ⚡ Key stays in your browser — never sent to our server
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
            onClick={handleRunTest}
            disabled={!apiKey || !(selectedModel || manualModel) || isRunning}
          >
            {isRunning ? '🔄 Running...' : '▶ Run Benchmark'}
          </Button>
          {isRunning && (
            <Button variant="danger" onClick={cancelTest}>
              ⏹ Cancel
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
          ❌ {error}
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
                ? `~${Math.max(0, metrics.totalTokens - (metrics.reasoningTokens ?? 0))} est / ${metrics.completionTokens} actual`
                : `~${Math.max(0, metrics.totalTokens - (metrics.reasoningTokens ?? 0))} (est)`,
              desc: 'Content tokens'},
            metrics.reasoningTokens
              ? { label: 'Reasoning', value: `~${metrics.reasoningTokens}`, desc: 'Thinking tokens' }
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
              <Badge variant="success">🤔 Reasoning</Badge>
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