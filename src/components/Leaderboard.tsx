import { useState, useEffect, useCallback } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { getGlobalStats, getRecentResults } from '../api/client';
import type { AggregatedStats, TestResultResponse } from '../api/client';

function fmtMs(ms: number): string {
  return ms < 1000 ? `${ms.toFixed(0)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

function fmtTps(tps: number): string {
  return tps.toFixed(1);
}

function fmtNum(n: number): string {
  return n.toLocaleString();
}

type LeaderboardTab = 'aggregated' | 'recent';

export function Leaderboard() {
  const [tab, setTab] = useState<LeaderboardTab>('aggregated');
  const [aggregated, setAggregated] = useState<AggregatedStats[]>([]);
  const [recent, setRecent] = useState<TestResultResponse[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [globalData, recentData] = await Promise.all([
        getGlobalStats(),
        getRecentResults(50),
      ]);
      setAggregated(globalData.stats);
      setTotalResults(globalData.total_results);
      setRecent(recentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center text-text-muted text-sm py-12">Loading leaderboard…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-text">Global Leaderboard</h2>
        <p className="text-sm text-text-muted mt-1">
          Aggregate benchmark results reported by all users.
          {totalResults > 0
            ? ` Based on ${fmtNum(totalResults)} total run${totalResults !== 1 ? 's' : ''}.`
            : ' No results reported yet.'}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => setTab('aggregated')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            tab === 'aggregated'
              ? 'bg-lumina-500/15 text-lumina-300'
              : 'text-text-secondary hover:text-text hover:bg-surface-3'
          }`}
        >
          By Provider / Model
        </button>
        <button
          onClick={() => setTab('recent')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            tab === 'recent'
              ? 'bg-lumina-500/15 text-lumina-300'
              : 'text-text-secondary hover:text-text hover:bg-surface-3'
          }`}
        >
          Recent Runs
        </button>
      </div>

      {/* Empty state */}
      {aggregated.length === 0 && recent.length === 0 && (
        <div className="py-16 text-center">
          <div className="text-4xl mb-4">🏆</div>
          <p className="text-text-muted text-sm">
            No benchmark results have been reported yet.
          </p>
          <p className="text-text-muted text-xs mt-1">
            Run a benchmark and check "Report Result" to see your results here.
          </p>
        </div>
      )}

      {/* Aggregated view */}
      {tab === 'aggregated' && aggregated.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-secondary text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Provider</th>
                  <th className="text-left px-4 py-3 font-medium">Model</th>
                  <th className="text-right px-4 py-3 font-medium">Avg TTFT</th>
                  <th className="text-right px-4 py-3 font-medium">Avg TPS</th>
                  <th className="text-right px-4 py-3 font-medium">Runs</th>
                </tr>
              </thead>
              <tbody>
                {aggregated.map((row, i) => (
                  <tr
                    key={`${row.provider}-${row.model}-${i}`}
                    className="border-b border-border/50 hover:bg-surface-3/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-text font-medium">
                      <Badge variant="default">{row.provider}</Badge>
                    </td>
                    <td className="px-4 py-3 text-text">{row.model}</td>
                    <td className="px-4 py-3 text-text text-right font-mono">
                      {fmtMs(row.avg_ttft_ms)}
                    </td>
                    <td className="px-4 py-3 text-text text-right font-mono">
                      {fmtTps(row.avg_tps)}
                    </td>
                    <td className="px-4 py-3 text-text text-right font-mono">
                      {fmtNum(row.total_runs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Recent runs view */}
      {tab === 'recent' && recent.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-secondary text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Provider</th>
                  <th className="text-left px-4 py-3 font-medium">Model</th>
                  <th className="text-right px-4 py-3 font-medium">TTFT</th>
                  <th className="text-right px-4 py-3 font-medium">TPS</th>
                  <th className="text-right px-4 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(r => (
                  <tr
                    key={r.id}
                    className="border-b border-border/50 hover:bg-surface-3/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-text-secondary">
                      {r.username || (
                        <span className="text-text-muted italic">anonymous</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text font-medium">
                      <Badge variant="default">{r.provider}</Badge>
                    </td>
                    <td className="px-4 py-3 text-text">{r.model}</td>
                    <td className="px-4 py-3 text-text text-right font-mono">
                      {fmtMs(r.ttft_ms)}
                    </td>
                    <td className="px-4 py-3 text-text text-right font-mono">
                      {fmtTps(r.tps)}
                    </td>
                    <td className="px-4 py-3 text-text-muted text-right text-xs">
                      {new Date(r.timestamp).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}