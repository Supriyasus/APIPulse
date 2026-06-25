import React, { useEffect, useState } from "react";
import { api, type PerformanceReport } from "../services/api";
import { 
  FileText, AlertTriangle, 
  CheckCircle, ArrowRight, Loader2, 
  Globe, Download
} from "lucide-react";

interface ReportsViewProps {
  currentUrl: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ currentUrl }) => {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<PerformanceReport[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      const data = await api.getHistoryReports();
      setHistory(data);
    } catch (err) {
      console.error("Failed to fetch reports history:", err);
    }
  };

  const handleGenerateReport = async () => {
    if (!currentUrl) {
      setError("Please run a health check in the API Analyzer first to set a target URL.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.generateReport(currentUrl);
      setReport(data);
      // Refresh history log
      await fetchHistory();
    } catch (err: any) {
      setError(err.message || "Failed to generate resilience report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [currentUrl]);

  // Export report to JSON file
  const handleExportJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chaospulse_report_${report.url.replace(/https?:\/\//, "").replace(/\//g, "_")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>Resilience & Observability Reports</span>
        </h2>
        <p className="text-sm text-textMuted mt-1">
          Synthesize health benchmarks, stress test results, and chaos run logs into a single scorecard with AI-driven recommendations.
        </p>
      </div>

      {/* Control Banner */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-brandViolet tracking-wider">Target Endpoint</span>
          <div className="flex items-center gap-2 mt-0.5">
            <Globe className="w-4 h-4 text-textMuted" />
            <span className="text-sm font-semibold text-white truncate max-w-md">
              {currentUrl || "No target set (Go to API Analyzer)"}
            </span>
          </div>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={loading || !currentUrl}
          className="px-6 py-3.5 glow-button text-white font-semibold rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed select-none"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generating report...</span>
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              <span>Generate Resilience Report</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-500/20 text-red-200 p-4 rounded-xl flex gap-3 items-center">
          <AlertTriangle className="w-6 h-6 text-brandRed shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Main Report View */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Scorecard Dial */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between items-center text-center space-y-6">
            <span className="text-xs font-semibold text-textMuted uppercase tracking-wider block">Resilience Score</span>
            
            <div className="relative flex items-center justify-center">
              {/* Outer Circular Progress representation */}
              <div className="w-36 h-36 rounded-full border-4 border-gray-800 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-5xl font-extrabold text-white">{report.overall_score}</span>
                  <span className="text-xs text-textMuted block font-semibold">/ 100</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                report.overall_score >= 80 ? "bg-emerald-500/10 text-brandGreen" :
                report.overall_score >= 50 ? "bg-amber-500/10 text-brandAmber" :
                "bg-red-500/10 text-brandRed"
              }`}>
                {report.overall_score >= 80 ? "Highly Resilient" :
                 report.overall_score >= 50 ? "Moderate Stability" :
                 "Action Required"}
              </span>
              <p className="text-[10px] text-textMuted mt-1">Based on error rates, latency distribution, and SSL configurations.</p>
            </div>

            <button
              onClick={handleExportJSON}
              className="w-full py-2.5 bg-[#161227] hover:bg-[#1E1935] text-xs font-semibold text-white rounded-xl border border-[rgba(255,255,255,0.06)] flex items-center justify-center gap-1.5 transition-all select-none"
            >
              <Download className="w-4 h-4 text-brandViolet" />
              <span>Export Report (JSON)</span>
            </button>
          </div>

          {/* Right Column: Recommendations Grid */}
          <div className="glass-panel p-6 rounded-2xl md:col-span-2 space-y-4">
            <span className="text-xs font-semibold text-textMuted uppercase tracking-wider block">Optimization Recommendations</span>
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {report.recommendations.map((rec, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-xl border ${
                    rec.severity === "high" 
                      ? "bg-red-500/5 border-red-500/20 text-red-200" 
                      : rec.severity === "medium"
                      ? "bg-amber-500/5 border-amber-500/20 text-amber-200"
                      : "bg-[#110D1F] border-[rgba(255,255,255,0.03)] text-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {rec.severity === "high" ? (
                      <AlertTriangle className="w-4 h-4 text-brandRed shrink-0" />
                    ) : rec.severity === "medium" ? (
                      <AlertTriangle className="w-4 h-4 text-brandAmber shrink-0" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-brandGreen shrink-0" />
                    )}
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {rec.severity} Severity
                    </span>
                  </div>
                  <p className="text-xs font-bold text-white mt-1.5">{rec.message}</p>
                  <p className="text-[11px] text-textMuted mt-1 font-medium leading-relaxed">
                    <strong className="text-white">Action:</strong> {rec.action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History Log */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <span className="text-xs font-semibold text-textMuted uppercase tracking-wider block">Historical Reports Log</span>
        
        {history.length === 0 ? (
          <p className="text-xs text-textMuted py-4">No historical resilience reports generated yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium border-collapse">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)] text-textMuted">
                  <th className="py-3 font-semibold">URL Host</th>
                  <th className="py-3 font-semibold">Overall Score</th>
                  <th className="py-3 font-semibold">SSL Status</th>
                  <th className="py-3 font-semibold">Generated At</th>
                  <th className="py-3 font-semibold text-right">View Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.03)]">
                {history.map((histReport) => (
                  <tr key={histReport.id} className="hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                    <td className="py-3 font-semibold text-white truncate max-w-xs" title={histReport.url}>
                      {histReport.url}
                    </td>
                    <td className="py-3 font-bold text-white">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        histReport.overall_score >= 80 ? "bg-emerald-500/10 text-brandGreen" :
                        histReport.overall_score >= 50 ? "bg-amber-500/10 text-brandAmber" :
                        "bg-red-500/10 text-brandRed"
                      }`}>
                        {histReport.overall_score}
                      </span>
                    </td>
                    <td className="py-3 text-textMuted">
                      {histReport.metrics_summary?.ssl_status || "Unknown"}
                    </td>
                    <td className="py-3 text-textMuted">
                      {new Date(histReport.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => setReport(histReport)}
                        className="text-brandViolet hover:text-brandViolet/80 font-bold flex items-center gap-0.5 justify-end ml-auto"
                      >
                        <span>Restore</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
