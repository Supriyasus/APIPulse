import React, { useState } from "react";
import { api, type ApiTestResult } from "../services/api";
import { 
  Globe, CheckCircle2, XCircle, 
  Clock, Shield, Layers, HelpCircle, ArrowRight, Loader2 
} from "lucide-react";

interface AnalyzerViewProps {
  currentUrl: string;
  setCurrentUrl: (url: string) => void;
  onAnalysisSuccess: (url: string) => void;
}

export const AnalyzerView: React.FC<AnalyzerViewProps> = ({ 
  currentUrl, 
  setCurrentUrl, 
  onAnalysisSuccess 
}) => {
  const [urlInput, setUrlInput] = useState(currentUrl || "https://jsonplaceholder.typicode.com/posts");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;
    
    setLoading(true);
    setError(null);
    try {
      // Execute health check API
      const data = await api.analyzeHealth(urlInput);
      setResult(data);
      setCurrentUrl(data.url);
      onAnalysisSuccess(data.url);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during API analysis.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const getSslDaysLeft = (expiryStr: string | null) => {
    if (!expiryStr) return null;
    const expiry = new Date(expiryStr);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const sslDays = result ? getSslDaysLeft(result.ssl_expiry) : null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Info */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>API Health Analyzer</span>
        </h2>
        <p className="text-sm text-textMuted mt-1">
          Perform a deep analysis of any HTTP endpoint. Check connection speeds, headers, and SSL configurations.
        </p>
      </div>

      {/* URL Input Form */}
      <form onSubmit={handleAnalyze} className="glass-panel p-6 rounded-2xl flex gap-3 shadow-lg">
        <div className="relative flex-1">
          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-textMuted" />
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://api.yourdomain.com/v1/health"
            className="w-full pl-12 pr-4 py-3.5 bg-[#0c1635] border border-[rgba(255,255,255,0.06)] rounded-xl text-white font-medium placeholder-gray-500 focus:outline-none focus:border-brandViolet focus:ring-1 focus:ring-brandViolet transition-all"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !urlInput}
          className="px-6 py-3.5 glow-button text-white font-semibold rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed select-none"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>Analyze Endpoint</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="bg-red-950/30 border border-red-500/20 text-red-200 p-4 rounded-xl flex gap-3 items-center">
          <XCircle className="w-6 h-6 text-brandRed shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Analysis Results Display */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Core Health */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-textMuted uppercase tracking-wider">HTTP Connection</span>
              <Layers className="w-5 h-5 text-brandViolet" />
            </div>
            
            <div className="pt-2 space-y-3">
              <div>
                <p className="text-xs text-textMuted font-medium">Status Code</p>
                <div className="flex items-center gap-2 mt-1">
                  {result.status_code && result.status_code >= 200 && result.status_code < 400 ? (
                    <CheckCircle2 className="w-5 h-5 text-brandGreen" />
                  ) : (
                    <XCircle className="w-5 h-5 text-brandRed" />
                  )}
                  <span className="text-2xl font-bold text-white">{result.status_code || "FAILED"}</span>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-textMuted font-medium">Response Size</p>
                <p className="text-lg font-bold text-white mt-1">
                  {result.response_size !== null ? `${(result.response_size / 1024).toFixed(2)} KB` : "N/A"}
                </p>
              </div>

              <div>
                <p className="text-xs text-textMuted font-medium">Content Type</p>
                <p className="text-sm font-semibold text-white mt-1 truncate" title={result.content_type || ""}>
                  {result.content_type || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Performance (Latency) */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-textMuted uppercase tracking-wider">Performance</span>
              <Clock className="w-5 h-5 text-brandIndigo" />
            </div>
            
            <div className="pt-2 space-y-4">
              <div>
                <p className="text-xs text-textMuted font-medium">Response Latency</p>
                <p className="text-4xl font-extrabold text-white mt-1.5">
                  {result.response_time_ms ? `${result.response_time_ms.toFixed(1)}` : "0"}
                  <span className="text-lg font-normal text-textMuted ml-1">ms</span>
                </p>
              </div>

              <div className="pt-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  !result.response_time_ms ? "bg-gray-800 text-gray-400" :
                  result.response_time_ms < 150 ? "bg-emerald-500/10 text-brandGreen" :
                  result.response_time_ms < 400 ? "bg-amber-500/10 text-brandAmber" :
                  "bg-red-500/10 text-brandRed"
                }`}>
                  {!result.response_time_ms ? "Offline" :
                   result.response_time_ms < 150 ? "Excellent Connection" :
                   result.response_time_ms < 400 ? "Moderate Performance" :
                   "High Latency Alert"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: SSL Verification */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-textMuted uppercase tracking-wider">Security (SSL)</span>
              <Shield className="w-5 h-5 text-brandGreen" />
            </div>
            
            <div className="pt-2 space-y-3">
              <div>
                <p className="text-xs text-textMuted font-medium">Certificate Validity</p>
                <div className="flex items-center gap-2 mt-1">
                  {result.ssl_valid ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-brandGreen" />
                      <span className="text-lg font-bold text-white">Valid SSL</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-brandRed" />
                      <span className="text-lg font-bold text-white">Invalid / Missing</span>
                    </>
                  )}
                </div>
              </div>

              {result.ssl_expiry && (
                <div>
                  <p className="text-xs text-textMuted font-medium">Expires On</p>
                  <p className="text-sm font-semibold text-white mt-1">
                    {new Date(result.ssl_expiry).toLocaleDateString()}
                  </p>
                  {sslDays !== null && (
                    <p className={`text-xs mt-1 font-semibold ${
                      sslDays < 15 ? "text-brandRed" : sslDays < 30 ? "text-brandAmber" : "text-brandGreen"
                    }`}>
                      {sslDays} days remaining
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Header Details List */}
          {result.headers && (
            <div className="glass-panel p-6 rounded-2xl md:col-span-3 space-y-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-brandViolet" />
                <span className="text-sm font-bold text-white">HTTP Response Headers</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 text-xs">
                {Object.entries(result.headers).map(([key, val]) => (
                  <div 
                    key={key} 
                    className="p-3 bg-[#110D1F] border border-[rgba(255,255,255,0.04)] rounded-xl flex flex-col justify-between gap-1 overflow-hidden"
                  >
                    <span className="font-mono text-brandViolet font-semibold truncate" title={key}>{key}</span>
                    <span className="font-mono text-gray-300 font-medium truncate" title={val}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
