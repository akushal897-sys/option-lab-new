import { BarChart3, Calculator, GitCompare, BookOpen, RotateCcw, LineChart } from 'lucide-react';

export type TabKey = 'builder' | 'futures' | 'comparison' | 'learning';

interface NavBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onReset: () => void;
  eduMode: boolean;
  onToggleEdu: () => void;
}

const tabs: { key: TabKey; label: string; icon: typeof BarChart3 }[] = [
  { key: 'builder', label: 'Strategy Builder', icon: BarChart3 },
  { key: 'futures', label: 'Futures Calculator', icon: Calculator },
  { key: 'comparison', label: 'Comparison', icon: GitCompare },
  { key: 'learning', label: 'Learning Center', icon: BookOpen },
];

export function NavBar({ activeTab, onTabChange, onReset, eduMode, onToggleEdu }: NavBarProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center">
              <LineChart className="w-5 h-5 text-brand-400" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-slate-900 text-lg tracking-tight hidden sm:block">
              Option<span className="text-brand-600">Lab</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium hidden lg:block ml-1">by Kushal Agarwal</span>
          </div>

          {/* Nav tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => onTabChange(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-navy text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onToggleEdu}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                eduMode
                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
                  : 'text-slate-500 hover:bg-slate-100 border border-transparent'
              }`}
              title="Toggle educational explanations"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden lg:inline">Edu Mode</span>
            </button>
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Reset all inputs to defaults"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden lg:inline">Reset</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
