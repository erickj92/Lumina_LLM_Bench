import { useState, useMemo, useRef, useEffect } from 'react';
import type { ModelInfo } from '../types';
import { Badge } from './ui/Badge';

interface ModelSelectorProps {
  models: ModelInfo[];
  selected: string;
  onSelect: (modelId: string) => void;
  recentModels?: string[];
  showManual?: boolean;
  manualValue?: string;
  onManualChange?: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ModelSelector({
  models,
  selected,
  onSelect,
  recentModels,
  showManual,
  manualValue,
  onManualChange,
  placeholder,
  disabled,
}: ModelSelectorProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const modelsWithGrouping = useMemo(
    () =>
      models.map((m) => {
        let group: string;
        const id = m.id.toLowerCase();
        if (id.includes('gpt') || id.includes('o1') || id.includes('o3'))
          group = 'OpenAI';
        else if (id.includes('claude')) group = 'Anthropic';
        else if (
          id.includes('llama') ||
          id.includes('mixtral') ||
          id.includes('gemma')
        )
          group = 'Open Source';
        else if (id.includes('deepseek')) group = 'DeepSeek';
        else if (id.includes('mistral')) group = 'Mistral';
        else group = m.owned_by || 'Other';
        return { ...m, group };
      }),
    [models],
  );

  const filteredGroups = useMemo(() => {
    const map = new Map<string, ModelInfo[]>();
    const q = search.toLowerCase();
    for (const m of modelsWithGrouping) {
      if (
        !q ||
        m.id.toLowerCase().includes(q) ||
        m.group.toLowerCase().includes(q)
      ) {
        if (!map.has(m.group)) map.set(m.group, []);
        map.get(m.group)!.push(m);
      }
    }
    return Array.from(map.entries());
  }, [modelsWithGrouping, search]);

  const recentModelsList = useMemo(() => {
    if (!recentModels || recentModels.length === 0) return [];
    return recentModels
      .map((id) => models.find((m) => m.id === id))
      .filter(Boolean) as ModelInfo[];
  }, [recentModels, models]);

  const handleSelect = (modelId: string) => {
    onSelect(modelId);
    setSearch('');
    setIsOpen(false);
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (selected) {
      setSearch(selected);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-text-secondary">Model</label>
      <div className="relative" ref={dropdownRef}>
        <input
          type="text"
          value={isOpen ? search : (selected || search)}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder || 'Search models...'}
          disabled={disabled}
          className="w-full rounded-lg border border-border bg-surface-3 px-3 py-2 pr-8 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-lumina-500 focus:border-transparent transition-all duration-150"
        />
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-border bg-surface-2 shadow-xl scrollbar-thin">
            {filteredGroups.map(([group, groupModels]) => (
              <div key={group}>
                <div className="px-3 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider bg-surface-3 sticky top-0">
                  {group} ({groupModels.length})
                </div>
                {groupModels.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSelect(m.id)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-4 transition-colors flex items-center justify-between ${
                      selected === m.id
                        ? 'bg-lumina-500/10 text-lumina-400'
                        : 'text-text'
                    }`}
                  >
                    <div>
                      <div className="font-mono text-sm">{m.id}</div>
                      {m.owned_by && (
                        <div className="text-xs text-text-muted">
                          {m.owned_by}
                        </div>
                      )}
                    </div>
                    <Badge variant="default">{group}</Badge>
                  </button>
                ))}
              </div>
            ))}
            {filteredGroups.length === 0 && (
              <div className="p-3 text-sm text-text-muted text-center">
                No models matching "{search}"
              </div>
            )}
          </div>
        )}
      </div>

      {recentModelsList.length > 0 && !isOpen && (
        <div className="mt-2">
          <div className="text-xs text-text-muted mb-1">Recently used:</div>
          <div className="flex flex-wrap gap-1.5">
            {recentModelsList.map((m) => (
              <button
                key={m.id}
                onClick={() => onSelect(m.id)}
                className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                  selected === m.id
                    ? 'bg-lumina-500/10 border-lumina-500 text-lumina-400'
                    : 'bg-surface-3 border-border text-text-secondary hover:border-border-light'
                }`}
              >
                {m.id}
              </button>
            ))}
          </div>
        </div>
      )}

      {showManual && (
        <div className="mt-3 p-3 rounded-lg border border-warning/30 bg-warning/5">
          <p className="text-xs text-warning mb-2">
            Model list unavailable. Enter model ID manually:
          </p>
          <input
            type="text"
            value={manualValue || ''}
            onChange={(e) => onManualChange?.(e.target.value)}
            placeholder="e.g. llama3.2, gemma4, mistral..."
            className="w-full rounded-lg border border-border bg-surface-3 px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-lumina-500"
          />
        </div>
      )}
    </div>
  );
}