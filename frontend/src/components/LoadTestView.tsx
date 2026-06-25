import React, { useState } from "react";
import { api, type LoadTestResult } from "../services/api";
import { 
  AlertTriangle, Play, 
  Loader2, Globe, TrendingUp 
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from "recharts";

interface LoadTestViewProps {
  currentUrl: string;
}

export const LoadTestView: React.FC<LoadTestViewProps> = ({ currentUrl }) => {
  const [requestCount, setRequestCount] = useState<number>(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LoadTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStartTest = async () => {
    if (!currentUrl) {
      setError("Please run a health check in the API Analyzer first to set a target URL.");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const data = await api.runLoadTest(currentUrl, requestCount);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Stress test failed. Check if target server blocks bulk requests.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const chartData = result?.latency_data
    ? result.latency_data.map((lat, idx) => ({
        index: idx + 1,
        latency: parseFloat(lat.toFixed(1)),
      }))
    : [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Info */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>Concurrency Stress Testing</span>
        </h2>
        <p className="text-sm text-textMuted mt-1">
          Simulate high-volume concurrent traffic. Measure average, P95, and P99 latency bottlenecks.
        </p>
      </div>

      {/* Target URL indicator & Config */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-brandViolet tracking-wider">Current Target</span>
          <div className="flex items-center gap-2 mt-0.5">
            <Globe className="w-4 h-4 text-textMuted" />
            <span className="text-sm font-semibold text-white truncate max-w-md">
              {currentUrl || "No target set (Go to API Analyzer)"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-[#0c1635] border border-[rgba(255,255,255,0.06)] rounded-xl p-1 select-none">
            {[10, 50, 100].map((num) => (
              <button
                key={num}
                onClick={() => setRequestCount(num)}
                disabled={loading}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  requestCount === num
                    ? "bg-brandViolet text-white shadow-md"
                    : "text-textMuted hover:text-white"
                }`}
              >
                {num} Req
              </button>
            ))}
          </div>

          <button
            onClick={handleStartTest}
            disabled={loading || !currentUrl}
            className="px-5 py-3 glow-button text-white font-semibold rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed select-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Test...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Start Stress Test</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="bg-red-950/30 border border-red-500/20 text-red-200 p-4 rounded-xl flex gap-3 items-center">
          <AlertTriangle className="w-6 h-6 text-brandRed shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Results details */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Latency Avg */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
            <span className="text-xs font-semibold text-textMuted uppercase tracking-wider">Average Latency</span>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-white">{result.avg_latency_ms.toFixed(1)}</span>
              <span className="text-xs text-textMuted ml-1">ms</span>
            </div>
            <span className="text-[10px] text-textMuted mt-1 font-medium">Mean of all requests</span>
          </div>

          {/* P95 Latency */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between border-l-brandViolet/30 border-l-2">
            <span className="text-xs font-semibold text-brandViolet uppercase tracking-wider">P95 Latency</span>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-white">{result.p95_latency_ms.toFixed(1)}</span>
              <span className="text-xs text-textMuted ml-1">ms</span>
            </div>
            <span className="text-[10px] text-textMuted mt-1 font-medium">95% of requests finished under</span>
          </div>

          {/* P99 Latency */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between border-l-brandIndigo/30 border-l-2">
            <span className="text-xs font-semibold text-brandIndigo uppercase tracking-wider">P99 Latency</span>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-white">{result.p99_latency_ms.toFixed(1)}</span>
              <span className="text-xs text-textMuted ml-1">ms</span>
            </div>
            <span className="text-[10px] text-textMuted mt-1 font-medium">99% of requests finished under</span>
          </div>

          {/* Success rate & error rate */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
            <span className="text-xs font-semibold text-textMuted uppercase tracking-wider">Error Rate & Throughput</span>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-medium text-textMuted">Errors</span>
                <span className={`text-lg font-bold ${result.error_rate_pct > 0 ? "text-brandRed" : "text-brandGreen"}`}>
                  {result.error_rate_pct.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-medium text-textMuted">Throughput</span>
                <span className="text-sm font-bold text-white">{result.requests_per_sec.toFixed(1)} req/s</span>
              </div>
            </div>
          </div>

          {/* Min/Max Latencies */}
          <div className="glass-panel p-5 rounded-2xl md:col-span-1 space-y-4">
            <span className="text-xs font-semibold text-textMuted uppercase tracking-wider block">Latency Extrema</span>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-textMuted font-medium uppercase">Minimum Latency</p>
                <p className="text-lg font-bold text-brandGreen">{result.min_latency_ms.toFixed(1)} ms</p>
              </div>
              <div>
                <p className="text-[10px] text-textMuted font-medium uppercase">Maximum Latency</p>
                <p className="text-lg font-bold text-brandRed">{result.max_latency_ms.toFixed(1)} ms</p>
              </div>
            </div>
          </div>

          {/* Latency Distribution Chart */}
          <div className="glass-panel p-6 rounded-2xl md:col-span-3 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-brandViolet" />
                <span>Response Latency Distribution</span>
              </span>
              <span className="text-xs text-textMuted font-medium">Sequential request timeline</span>
            </div>
            
            <div className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="index" stroke="#71717A" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717A" fontSize={10} tickLine={false} unit="ms" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#110D1F",
                      borderColor: "rgba(255,255,255,0.08)",
                      borderRadius: "12px",
                      color: "#FFF"
                    }}
                    labelStyle={{ color: "#8B5CF6", fontWeight: "bold" }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="latency" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorLatency)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
