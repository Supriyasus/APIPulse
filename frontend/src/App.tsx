import React, { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { AnalyzerView } from "./components/AnalyzerView";
import { LoadTestView } from "./components/LoadTestView";
import { ChaosLabView } from "./components/ChaosLabView";
import { ReportsView } from "./components/ReportsView";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Cpu } from "lucide-react";

// Initialize TanStack React Query client
const queryClient = new QueryClient();

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("analyzer");
  const [currentUrl, setCurrentUrl] = useState<string>("");

  const handleAnalysisSuccess = (url: string) => {
    setCurrentUrl(url);
  };

  return (
    <div className="flex h-screen bg-darkBg text-white overflow-hidden font-sans">
      {/* Navigation Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Dashboard */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header Top Bar */}
        <header className="h-16 border-b border-[rgba(255,255,255,0.06)] bg-[#09122C]/40 backdrop-blur-md px-8 flex items-center justify-between shrink-0 z-10 sticky top-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-textMuted uppercase tracking-wider">Workspace</span>
            <span className="text-xs text-textMuted">•</span>
            <span className="text-xs text-white font-bold tracking-wide">Development Environment</span>
          </div>

          <div className="flex items-center gap-4">
            {currentUrl && (
              <div className="hidden lg:flex items-center gap-2 bg-[#141b17] px-3.5 py-1.5 rounded-xl border border-[rgba(255,255,255,0.05)]">
                <span className="text-[10px] uppercase font-bold text-brandViolet tracking-wider">Active URL:</span>
                <span className="text-xs font-semibold text-gray-200 truncate max-w-xs">{currentUrl}</span>
              </div>
            )}
            <div className="flex items-center gap-1 bg-brandViolet/10 text-brandViolet px-2.5 py-1 rounded-xl text-xs font-bold">
              <Cpu className="w-3.5 h-3.5" />
              <span>Engine Status: Active</span>
            </div>
          </div>
        </header>

        {/* Dashboard Pages Body */}
        <div className="flex-1 p-8 overflow-y-auto">
          {activeTab === "analyzer" && (
            <AnalyzerView 
              currentUrl={currentUrl} 
              setCurrentUrl={setCurrentUrl} 
              onAnalysisSuccess={handleAnalysisSuccess} 
            />
          )}
          {activeTab === "load-test" && (
            <LoadTestView currentUrl={currentUrl} />
          )}
          {activeTab === "chaos-lab" && (
            <ChaosLabView currentUrl={currentUrl} />
          )}
          {activeTab === "reports" && (
            <ReportsView currentUrl={currentUrl} />
          )}
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
