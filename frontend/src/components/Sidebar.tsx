import React from "react";
import { Activity, Zap, ShieldAlert, FileText, Cpu } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: "analyzer", name: "API Analyzer", icon: Activity, description: "Check status, headers & SSL" },
    { id: "load-test", name: "Load Testing", icon: Zap, description: "Stress test concurrency" },
    { id: "chaos-lab", name: "Chaos Lab", icon: ShieldAlert, description: "Simulate network faults" },
    { id: "reports", name: "Reports & History", icon: FileText, description: "Optimization & scoring" },
  ];

  return (
    <aside className="w-80 bg-[#070b09] border-r border-rgba(255,255,255,0.07) flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-[rgba(255,255,255,0.07)] flex items-center gap-3">
        <div className="p-2 bg-gradient-to-tr from-brandViolet to-brandIndigo rounded-xl pulse-glow">
          <Cpu className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold tracking-wider text-white">ChaosPulse</h1>
          <p className="text-xs text-textMuted font-medium tracking-tight">API Resilience Platform</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-start gap-4 p-4 rounded-xl transition-all duration-200 group text-left ${
                isActive
                  ? "bg-gradient-to-r from-[rgba(16,185,129,0.15)] to-[rgba(5,150,105,0.05)] border border-[rgba(16,185,129,0.25)] text-white shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                  : "text-textMuted hover:text-white hover:bg-[rgba(255,255,255,0.02)] border border-transparent"
              }`}
            >
              <div
                className={`p-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-brandViolet text-white"
                    : "bg-[#141b17] text-textMuted group-hover:bg-[#1d2721] group-hover:text-brandViolet"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold tracking-wide">{item.name}</p>
                <p className="text-xs text-textMuted mt-0.5 truncate group-hover:text-gray-300 font-medium">
                  {item.description}
                </p>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-6 border-t border-[rgba(255,255,255,0.07)] bg-[#050807]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-brandGreen animate-pulse"></div>
          <span className="text-xs font-semibold text-gray-300">Local Engine Connected</span>
        </div>
        <p className="text-[10px] text-textMuted mt-2 font-medium">ChaosPulse Engine v1.0 • Hybrid Mode</p>
      </div>
    </aside>
  );
};
