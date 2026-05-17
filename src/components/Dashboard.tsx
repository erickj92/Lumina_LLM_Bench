import { useEffect, useMemo } from 'react';
import React from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useHistoryStore } from '../stores/historyStore';
import { useUiStore } from '../stores/uiStore';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import type { TestResult } from '../types';

function getPerfColor(ttft: number, tps: number) {
  if (ttft < 500 && tps > 50) return { color: '#22c55e', bg: 'bg-success/10' };
  if (ttft > 3000 || tps < 5) return { color: '#ef4444', bg: 'bg-danger/10' };
  return { color: '#eab308', bg: 'bg-warning/10' };
}

const Sparkline = React.memo(function Sparkline({ data }: { data: Array<{ ttft: number; tps: number }> }) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-16 text-xs text-text-muted">
        {data.length === 1 ? 'Only 1 data point' : 'No data'}
      </div>
    );
  }

  const chartData = useMemo(
    () => data.slice().reverse().map((d, i) => ({ ...d, run: i + 1 })),
    [data]
  );

  return (
    <div className="h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <XAxis dataKey="run" hide />
          <YAxis hide domain={['dataMin - 10%', 'dataMax + 10%']} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1d27',
              border: '1px solid #2e3345',
              borderRadius: 8,
              fontSize: 12,
              color: '#e2e8f0',
            }}
            formatter={(value: unknown) => typeof value === 'number' ? value.toFixed(1) : String(value ?? '')}
          />
          <Line type="monotone" dataKey="ttft" stroke="#3b82f6" strokeWidth={2} dot={false} name="TTFT" />
          <Line type="monotone" dataKey="tps" stroke="#22c55e" strokeWidth={2} dot={false} name="TPS" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

const ComboCard = React.memo(function ComboCard({
  provider,
  model,
  results,
  onRunBenchmark,
}: {
  provider: string;
  model: string;
  results: TestResult[];
  onRunBenchmark: () => void;
}) {
  const recent = useMemo(
    () =>
      results
        .filter(r => r.provider === provider && r.model === model)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10),
    [results, provider, model]
  );

  const lastRun = recent[0];
  const sparklineData = useMemo(
    () => recent.slice().reverse().map(r => ({ ttft: r.ttft, tps: r.tps })),
    [recent]
  );

  const perf = useMemo(
    () => lastRun
      ? getPerfColor(lastRun.ttft, lastRun.tps)
      : { color: '#64748b', bg: 'bg-surface-4' },
    [lastRun]
  );

  return (
    <div className={`${perf.bg} border-l-4 rounded-xl`} style={{ borderLeftColor: perf.color }}>
      <Card>
      <CardContent>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="info">{provider}</Badge>
          <span className="text-xs text-text-muted ml-auto">{recent.length} runs</span>
        </div>
        <h3 className="text-sm font-mono font-semibold text-text truncate">{model}</h3>

        {lastRun ? (
          <div className="grid grid-cols-2 gap-2 mt-3 mb-2">
            <div>
              <div className="text-[10px] text-text-muted uppercase">TTFT</div>
              <div className="text-lg font-bold" style={{ color: perf.color }}>
                {lastRun.ttft.toFixed(0)}
                <span className="text-xs font-normal text-text-muted">ms</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-text-muted uppercase">TPS</div>
              <div className="text-lg font-bold" style={{ color: perf.color }}>
                {lastRun.tps.toFixed(1)}
                <span className="text-xs font-normal text-text-muted">tok/s</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-text-muted my-3">No data</div>
        )}

        <Sparkline data={sparklineData} />

        <Button variant="primary" size="sm" className="w-full mt-3" onClick={onRunBenchmark}>
          Run Benchmark
        </Button>
      </CardContent>
    </Card>
    </div>
  );
});

export function Dashboard() {
  const results = useHistoryStore(s => s.results);
  const loading = useHistoryStore(s => s.loading);
  const loadResults = useHistoryStore(s => s.loadResults);
  const setView = useUiStore(s => s.setView);

  const combos = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ provider: string; model: string }> = [];
    for (const r of results) {
      const key = `${r.provider}::${r.model}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ provider: r.provider, model: r.model });
      }
    }
    return result;
  }, [results]);

  useEffect(() => { loadResults(); }, [loadResults]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin w-6 h-6 border-2 border-lumina-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (combos.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">📊</div>
        <h2 className="text-xl font-bold text-text mb-2">Welcome to Lumina Bench</h2>
        <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
          Run your first benchmark to see performance dashboards, sparkline trends, and history here.
        </p>
        <Button variant="primary" onClick={() => setView('run-test')}>
          Run Your First Benchmark
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text">📊 Dashboard</h2>
          <p className="text-sm text-text-secondary mt-1">
            {results.length} total runs across {combos.length} models
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {combos.map(({ provider, model }) => (
          <ComboCard
            key={`${provider}::${model}`}
            provider={provider}
            model={model}
            results={results}
            onRunBenchmark={() => setView('run-test')}
          />
        ))}
      </div>
    </div>
  );
}