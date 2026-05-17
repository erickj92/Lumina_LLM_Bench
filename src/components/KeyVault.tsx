import { useState } from 'react';
import { useKeyStore } from '../stores/keyStore';
import { useUiStore } from '../stores/uiStore';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { decryptKey } from '../lib/utils';

const KNOWN_PROVIDERS = [
  { name: 'OpenAI', url: 'https://api.openai.com' },
  { name: 'Groq', url: 'https://api.groq.com' },
  { name: 'Venice', url: 'https://api.venice.ai' },
  { name: 'DeepSeek', url: 'https://api.deepseek.com' },
  { name: 'Together', url: 'https://api.together.xyz' },
];

export function KeyVault() {
  const { keys, addKey, deleteKey } = useKeyStore();
  const setView = useUiStore(s => s.setView);

  const [provider, setProvider] = useState('OpenAI');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com');
  const [rawKey, setRawKey] = useState('');
  const [alias, setAlias] = useState('');
  const [showKey, setShowKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleAdd = () => {
    if (!rawKey.trim()) {
      setError('API key is required');
      return;
    }
    addKey(provider, baseUrl, rawKey.trim(), alias.trim() || undefined);
    setRawKey('');
    setAlias('');
    setError('');
  };

  const handleSelectProvider = (name: string, url: string) => {
    setProvider(name);
    setBaseUrl(url);
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '***';
    return key.slice(0, 4) + '••••' + key.slice(-4);
  };

  const handleQuickSelect = (id: string) => {
    useKeyStore.getState().updateLastUsed(id);
    setView('run-test');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text">🔐 The Vault</h2>
        <p className="text-sm text-text-secondary mt-1">
          Manage your API keys. Keys are encrypted and stored locally in your browser.
        </p>
      </div>

      {/* Add new key */}
      <Card>
        <h3 className="text-sm font-semibold text-text mb-3">Add New Key</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">Provider</label>
            <div className="flex flex-wrap gap-2">
              {KNOWN_PROVIDERS.map(p => (
                <button
                  key={p.url}
                  onClick={() => handleSelectProvider(p.name, p.url)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    baseUrl === p.url
                      ? 'bg-lumina-600 text-white'
                      : 'bg-surface-3 text-text-secondary border border-border hover:border-border-light'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Base URL"
            value={baseUrl}
            onChange={e => {
              setBaseUrl(e.target.value);
              const matched = KNOWN_PROVIDERS.find(p => p.url === e.target.value);
              if (matched) setProvider(matched.name);
            }}
            placeholder="https://api.openai.com"
          />
          <Input
            label="API Key"
            type="password"
            value={rawKey}
            onChange={e => setRawKey(e.target.value)}
            placeholder="sk-..."
            error={error}
          />
          <Input
            label="Alias (optional)"
            value={alias}
            onChange={e => setAlias(e.target.value)}
            placeholder="e.g. Work key, Dev key"
          />
          <Button variant="primary" onClick={handleAdd} size="sm">
            + Add Key
          </Button>
        </div>
      </Card>

      {/* Saved keys */}
      <div className="space-y-2">
        {keys.length === 0 && (
          <p className="text-sm text-text-muted text-center py-8">
            No keys saved yet. Add your first API key above.
          </p>
        )}
        {keys.map(k => (
          <Card key={k.id} className="flex items-center justify-between p-3">
            <CardContent className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="info">{k.provider}</Badge>
                {k.alias && (
                  <span className="text-xs text-text-secondary">{k.alias}</span>
                )}
              </div>
              <div className="text-xs text-text-muted truncate">{k.baseUrl}</div>
              <div className="text-sm font-mono mt-1">
                {showKey === k.id ? decryptKey(k.encryptedKey) : maskKey(decryptKey(k.encryptedKey))}
              </div>
              {k.lastUsed && (
                <div className="text-xs text-text-muted mt-1">
                  Last used: {new Date(k.lastUsed).toLocaleDateString()}
                </div>
              )}
            </CardContent>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKey(showKey === k.id ? null : k.id)}
              >
                {showKey === k.id ? '🙈' : '👁'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleQuickSelect(k.id)}
              >
                Use
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => deleteKey(k.id)}
              >
                ✕
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}