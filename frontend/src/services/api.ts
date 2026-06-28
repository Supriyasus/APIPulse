let rawBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
if (rawBase && !rawBase.endsWith("/api")) {
  if (rawBase.endsWith("/")) {
    rawBase = rawBase.slice(0, -1);
  }
  rawBase = rawBase + "/api";
}
const API_BASE = rawBase;


export interface ApiTestResult {
  id: number;
  url: string;
  status_code: number | null;
  ssl_valid: boolean | null;
  ssl_expiry: string | null;
  response_time_ms: number | null;
  response_size: number | null;
  content_type: string | null;
  headers: Record<string, string> | null;
  created_at: string;
}

export interface LoadTestResult {
  id: number;
  url: string;
  request_count: number;
  avg_latency_ms: number;
  min_latency_ms: number;
  max_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  requests_per_sec: number;
  error_rate_pct: number;
  latency_data: number[] | null;
  created_at: string;
}

export interface ChaosRunResult {
  id: number;
  url: string;
  simulation_type: string;
  config: Record<string, any>;
  success_rate_pct: number;
  avg_response_time_ms: number;
  error_count: number;
  total_requests: number;
  details: Record<string, any> | null;
  created_at: string;
}

export interface Recommendation {
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
  action: string;
}

export interface PerformanceReport {
  id: number;
  url: string;
  overall_score: number;
  recommendations: Recommendation[];
  metrics_summary: {
    latest_latency_ms: number | null;
    load_test_avg_ms: number | null;
    load_test_p95_ms: number | null;
    load_test_errors_pct: number | null;
    ssl_status: string;
  };
  created_at: string;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  analyzeHealth: (url: string) =>
    request<ApiTestResult>("/health/analyze", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  runLoadTest: (url: string, requestCount: number) =>
    request<LoadTestResult>("/load-test/run", {
      method: "POST",
      body: JSON.stringify({ url, request_count: requestCount }),
    }),

  runChaosTest: (url: string, type: string, config: Record<string, any>) =>
    request<ChaosRunResult>("/chaos/run", {
      method: "POST",
      body: JSON.stringify({ url, simulation_type: type, config }),
    }),

  generateReport: (url: string) =>
    request<PerformanceReport>("/reports/generate", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  getHistoryTests: () => request<ApiTestResult[]>("/history/tests"),
  getHistoryReports: () => request<PerformanceReport[]>("/history/reports"),
  getHistoryChaos: () => request<ChaosRunResult[]>("/history/chaos"),
};
