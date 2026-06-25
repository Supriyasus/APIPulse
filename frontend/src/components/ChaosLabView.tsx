import React, { useState } from "react";
import { api, type ChaosRunResult } from "../services/api";
import { 
  ShieldAlert, Globe, Loader2, 
  Clock, CheckCircle, XCircle, WifiOff 
} from "lucide-react";

interface ChaosLabViewProps {
  currentUrl: string;
}

export const ChaosLabView: React.FC<ChaosLabViewProps> = ({ currentUrl }) => {
  const [simType, setSimType] = useState<string>("latency");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChaosRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Simulation parameters
  const [latencyMs, setLatencyMs] = useState<number>(500);
  const [timeoutS, setTimeoutS] = useState<number>(1.0);
  const [packetLossPct, setPacketLossPct] = useState<number>(20);
  const [maxRetries, setMaxRetries] = useState<number>(3);
  const [forceFailCount, setForceFailCount] = useState<number>(2);

  const handleRunChaos = async () => {
    if (!currentUrl) {
      setError("Please run a health check in the API Analyzer first to set a target URL.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    let config: Record<string, any> = {};
    if (simType === "latency") {
      config = { latency_ms: latencyMs };
    } else if (simType === "timeout") {
      config = { timeout_s: timeoutS, inject_server_delay: true };
    } else if (simType === "packet_loss") {
      config = { packet_loss_pct: packetLossPct };
    } else if (simType === "retry") {
      config = { max_retries: maxRetries, force_fail_count: forceFailCount };
    }

    try {
      const data = await api.runChaosTest(currentUrl, simType, config);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Chaos test execution failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>Chaos Engineering Lab</span>
        </h2>
        <p className="text-sm text-textMuted mt-1">
          Inject faults on the client-side request engine. Evaluate how downstream components respond to delays and drops.
        </p>
      </div>

      {/* Target URL Info */}
      <div className="glass-panel p-4 rounded-2xl flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-brandViolet" />
          <span className="text-xs text-textMuted font-medium">Target Host:</span>
          <span className="text-xs font-bold text-white truncate max-w-md">
            {currentUrl || "None set (Go to API Analyzer)"}
          </span>
        </div>
        <span className="text-[10px] bg-brandViolet/10 text-brandViolet px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          Fault Injector Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column: Configuration Form */}
        <div className="glass-panel p-6 rounded-2xl md:col-span-5 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-textMuted uppercase tracking-wider block mb-2">
                Select Chaos Scenario
              </label>
              <select
                value={simType}
                onChange={(e) => {
                  setSimType(e.target.value);
                  setResult(null);
                  setError(null);
                }}
                disabled={loading}
                className="w-full px-4 py-3 bg-[#0c1635] border border-[rgba(255,255,255,0.06)] rounded-xl text-white font-semibold focus:outline-none focus:border-brandViolet"
              >
                <option value="latency">Latency Injection</option>
                <option value="timeout">Timeout Simulation</option>
                <option value="packet_loss">Packet Loss Simulation</option>
                <option value="retry">Retry Backoff Simulation</option>
              </select>
            </div>

            {/* Config options based on choice */}
            {simType === "latency" && (
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-bold text-textMuted uppercase">Injected Delay</label>
                  <span className="text-sm font-bold text-white">{latencyMs} ms</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="100"
                  value={latencyMs}
                  onChange={(e) => setLatencyMs(Number(e.target.value))}
                  disabled={loading}
                  className="w-full accent-brandViolet"
                />
                <p className="text-[10px] text-textMuted font-medium">Adds artificial latency to requests to test application timeouts.</p>
              </div>
            )}

            {simType === "timeout" && (
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-bold text-textMuted uppercase">Timeout Threshold</label>
                  <span className="text-sm font-bold text-white">{timeoutS} s</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={timeoutS}
                  onChange={(e) => setTimeoutS(Number(e.target.value))}
                  disabled={loading}
                  className="w-full accent-brandViolet"
                />
                <p className="text-[10px] text-textMuted font-medium">Aborts connection if target server response exceeds this interval.</p>
              </div>
            )}

            {simType === "packet_loss" && (
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-bold text-textMuted uppercase">Simulated Loss Rate</label>
                  <span className="text-sm font-bold text-brandRed">{packetLossPct}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="10"
                  value={packetLossPct}
                  onChange={(e) => setPacketLossPct(Number(e.target.value))}
                  disabled={loading}
                  className="w-full accent-brandRed"
                />
                <p className="text-[10px] text-textMuted font-medium">Randomly discards outgoing request packages to test failover resilience.</p>
              </div>
            )}

            {simType === "retry" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-textMuted uppercase">Max Retries</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={maxRetries}
                      onChange={(e) => setMaxRetries(Number(e.target.value))}
                      disabled={loading}
                      className="w-full px-3 py-2 bg-[#0c1635] border border-[rgba(255,255,255,0.06)] rounded-xl text-white font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-textMuted uppercase">Inject Errors</label>
                    <input
                      type="number"
                      min="0"
                      max={maxRetries}
                      value={forceFailCount}
                      onChange={(e) => setForceFailCount(Number(e.target.value))}
                      disabled={loading}
                      className="w-full px-3 py-2 bg-[#0c1635] border border-[rgba(255,255,255,0.06)] rounded-xl text-white font-semibold"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-textMuted font-medium">
                  Configures client to fail first N requests and execute exponential backoff to achieve self-healing recovery.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleRunChaos}
            disabled={loading || !currentUrl}
            className="w-full mt-6 py-3.5 glow-button text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed select-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Injecting Chaos...</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-5 h-5" />
                <span>Execute Chaos Test</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Visualizer Results */}
        <div className="glass-panel p-6 rounded-2xl md:col-span-7 flex flex-col justify-center min-h-[300px]">
          {error && (
            <div className="bg-red-950/30 border border-red-500/20 text-red-200 p-4 rounded-xl flex gap-3 items-center">
              <XCircle className="w-6 h-6 text-brandRed shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {!result && !error && !loading && (
            <div className="text-center space-y-3 py-8">
              <ShieldAlert className="w-12 h-12 text-textMuted mx-auto stroke-1" />
              <p className="text-sm font-semibold text-white">Chaos Visualizer Ready</p>
              <p className="text-xs text-textMuted max-w-sm mx-auto">
                Configure parameters and execute a chaos test to visualize live fault injection outcomes.
              </p>
            </div>
          )}

          {loading && (
            <div className="text-center space-y-4 py-8">
              <Loader2 className="w-10 h-10 text-brandViolet mx-auto animate-spin" />
              <p className="text-sm font-semibold text-white">Fault Injection In Progress...</p>
              <p className="text-xs text-textMuted">Simulating network disruptions on target endpoint</p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-[#110D1F] border border-[rgba(255,255,255,0.03)] rounded-xl text-center">
                  <span className="text-[10px] text-textMuted uppercase font-semibold">Success Rate</span>
                  <p className={`text-xl font-bold mt-1 ${result.success_rate_pct >= 85 ? "text-brandGreen" : result.success_rate_pct >= 50 ? "text-brandAmber" : "text-brandRed"}`}>
                    {result.success_rate_pct.toFixed(0)}%
                  </p>
                </div>
                <div className="p-3 bg-[#110D1F] border border-[rgba(255,255,255,0.03)] rounded-xl text-center">
                  <span className="text-[10px] text-textMuted uppercase font-semibold">Avg Latency</span>
                  <p className="text-xl font-bold text-white mt-1">
                    {result.avg_response_time_ms.toFixed(0)} <span className="text-xs text-textMuted">ms</span>
                  </p>
                </div>
                <div className="p-3 bg-[#110D1F] border border-[rgba(255,255,255,0.03)] rounded-xl text-center">
                  <span className="text-[10px] text-textMuted uppercase font-semibold">Errors</span>
                  <p className="text-xl font-bold text-brandRed mt-1">
                    {result.error_count} / {result.total_requests}
                  </p>
                </div>
              </div>

              {/* Simulation specific details */}
              {result.simulation_type === "retry" && result.details?.attempts && (
                <div className="space-y-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                  <h4 className="text-xs font-bold text-textMuted uppercase tracking-wider">Retry Flow Pipeline</h4>
                  
                  <div className="flex flex-col gap-4 relative pl-8 border-l border-brandViolet/20 mt-2">
                    {result.details.attempts.map((attempt: any, index: number) => (
                      <div key={index} className="relative">
                        {/* Status Icon */}
                        <div className={`absolute -left-12 top-1.5 w-8 h-8 rounded-full flex items-center justify-center border ${
                          attempt.status === "success" 
                            ? "bg-brandGreen/10 border-brandGreen text-brandGreen" 
                            : "bg-brandRed/10 border-brandRed text-brandRed"
                        }`}>
                          {attempt.status === "success" ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <WifiOff className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-bold text-white">Attempt #{attempt.attempt}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              attempt.status === "success" ? "bg-emerald-500/10 text-brandGreen" : "bg-red-500/10 text-brandRed"
                            }`}>
                              {attempt.status === "success" ? "HTTP 200 OK" : `Error ${attempt.status_code || ""}`}
                            </span>
                          </div>
                          
                          <p className="text-xs text-textMuted mt-0.5 font-medium">
                            {attempt.status === "success" 
                              ? `Completed in ${attempt.duration_ms.toFixed(1)} ms`
                              : `${attempt.error || "Connection timed out"}`}
                          </p>
                          {attempt.backoff_applied_s > 0 && (
                            <p className="text-[10px] text-brandViolet font-semibold mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Backoff Delay: {attempt.backoff_applied_s.toFixed(2)}s</span>
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {result.details.recovered ? (
                    <div className="bg-emerald-500/10 border border-brandGreen/20 text-brandGreen p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>API client self-healed successfully after retry backoffs. Recovery time: {(result.avg_response_time_ms / 1000).toFixed(2)} seconds.</span>
                    </div>
                  ) : (
                    <div className="bg-red-500/10 border border-brandRed/20 text-brandRed p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>API client recovery failed: exceeded maximum retries of {maxRetries} attempts.</span>
                    </div>
                  )}
                </div>
              )}

              {result.simulation_type === "packet_loss" && (
                <div className="space-y-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                  <h4 className="text-xs font-bold text-textMuted uppercase tracking-wider">Packet Loss Distribution</h4>
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {result.details?.latencies?.map((_lat: number, index: number) => {
                      const isLoss = result.details?.dropped_count && index < result.details.dropped_count;
                      return (
                        <div 
                          key={index}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            isLoss 
                              ? "bg-brandRed/10 border-brandRed/20 text-brandRed stroke-brandRed" 
                              : "bg-[#110D1F] border-[rgba(255,255,255,0.03)] text-brandGreen"
                          }`}
                        >
                          <span className="text-[10px] block font-bold text-textMuted">Req {index + 1}</span>
                          <span className="text-xs font-bold mt-1 block">
                            {isLoss ? "DROP" : "200"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="p-3 bg-[#110D1F] border border-[rgba(255,255,255,0.03)] rounded-xl text-xs text-textMuted font-medium">
                    Packet loss simulates severe server load, router congestion, or wireless interference.
                  </div>
                </div>
              )}

              {result.simulation_type === "latency" && (
                <div className="space-y-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                  <h4 className="text-xs font-bold text-textMuted uppercase tracking-wider">Latency Comparison</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-textMuted font-medium">Injected artificial delay</span>
                      <span className="font-bold text-white">{latencyMs} ms</span>
                    </div>
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-textMuted font-medium">Actual connection runtime</span>
                      <span className="font-bold text-white">{(result.avg_response_time_ms - latencyMs).toFixed(1)} ms</span>
                    </div>
                  </div>
                </div>
              )}

              {result.simulation_type === "timeout" && (
                <div className="space-y-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                  <h4 className="text-xs font-bold text-textMuted uppercase tracking-wider">Timeout Simulation Outcome</h4>
                  <p className="text-xs text-textMuted font-medium leading-relaxed">
                    By simulating a slow backend server, we set a client abort threshold of <strong className="text-white">{timeoutS} second(s)</strong>.
                    As a result, <strong className="text-brandRed">{result.details?.timeout_failures || 0} request(s)</strong> timed out and failed to resolve.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
