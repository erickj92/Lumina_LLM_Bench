import { useState, useEffect, useMemo } from 'react';
import { useHistoryStore } from '../stores/historyStore';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

export function HistoryView() {
  const { results, loading, loadResults, deleteResult, clearAll, exportJSON } = useHistoryStore();
  const [filterProvider, setFilterProvider] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => { loadResults(); }, [loadResults]);

  const filtered = useMemo(() => {
    let items = results;
    if (filterProvider)
      items = items.filter(r => r.provider.toLowerCase().includes(filterProvider.toLowerCase()));
    if (filterModel)
      items = items.filter(r => r.model.toLowerCase().includes(filterModel.toLowerCase()));
    if (startDate) items = items.filter(r => r.timestamp >= new Date(startDate).getTime());
    if (endDate) items = items.filter(r => r.timestamp <= new Date(endDate + 'T23:59:59').getTime());
    return items;
  }, [results, filterProvider, filterModel, startDate, endDate]);

  const handleExport = async () => {
    const json = await exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumina-bench-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin w-6 h-6 border-2 border-lumina-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text">📊 Test History</h2>
          <p className="text-sm text-text-secondary mt-1">{results.length} total runs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExport}>⬇ Export JSON</Button>
          <Button variant="danger" size="sm" onClick={clearAll}>🗑 Clear All</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Input placeholder="Filter by provider..." value={filterProvider}
          onChange={e => setFilterProvider(e.target.value)} />
        <Input placeholder="Filter by model..." value={filterModel}
          onChange={e => setFilterModel(e.target.value)} />
        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-text-muted text-sm">
          {results.length === 0
            ? 'No test results yet. Run a benchmark to see history here.'
            : 'No results match your filters.'}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(r => (
          <Card key={r.id} className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="info">{r.provider}</Badge>
                  <span className="text-sm font-mono text-text truncate">{r.model}</span>
                </div>
                <div className="text-xs text-text-muted">{new Date(r.timestamp).toLocaleString()}</div>
                <div className="flex flex-wrap gap-3 mt-2 text-xs">
                  <span>TTFT <strong className="text-text">{r.ttft.toFixed(1)}ms</strong></span>
                  <span>TPS <strong className="text-text">{r.tps.toFixed(1)}</strong></span>
                  {r.completionTokens !== undefined && (
                    <span className="text-text-secondary">⬇ {r.completionTokens} tok</span>
                  )}
                  {r.reasoningTokens && (
                    <span className="text-text-secondary">🤔 ~{r.reasoningTokens} tok</span>
                  )}
                  <span className="text-text-secondary">⏱ {r.totalDuration.toFixed(0)}ms</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => deleteResult(r.id)}>✕</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}