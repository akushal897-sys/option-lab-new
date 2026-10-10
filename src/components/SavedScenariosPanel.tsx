import { useState } from 'react';
import type { SavedScenario, MarketInputs, StrategyLeg, StrategyKey } from '@/types';
import { loadScenarios, saveScenario, deleteScenario, createSavedScenario } from '@/lib/export';
import { Save, FolderOpen, Trash2, Copy, X } from 'lucide-react';

interface SavedScenariosPanelProps {
  marketInputs: MarketInputs;
  legs: StrategyLeg[];
  strategyKey: StrategyKey;
  onLoad: (scenario: SavedScenario) => void;
}

export function SavedScenariosPanel({ marketInputs, legs, strategyKey, onLoad }: SavedScenariosPanelProps) {
  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => loadScenarios());
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [name, setName] = useState('');

  const refresh = () => setScenarios(loadScenarios());

  const handleSave = () => {
    const scenario = createSavedScenario(name || `Scenario ${scenarios.length + 1}`, marketInputs, legs, strategyKey);
    saveScenario(scenario);
    setShowSaveDialog(false);
    setName('');
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteScenario(id);
    refresh();
  };

  const handleDuplicate = (s: SavedScenario) => {
    const dup = createSavedScenario(`${s.name} (copy)`, s.marketInputs, s.legs, s.strategyKey);
    saveScenario(dup);
    refresh();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Saved Scenarios</h3>
        <button
          onClick={() => setShowSaveDialog(true)}
          disabled={legs.length === 0}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-navy rounded hover:bg-brand-700 disabled:opacity-40"
        >
          <Save className="w-3.5 h-3.5" />
          Save
        </button>
      </div>

      {scenarios.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">No saved scenarios yet.</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {scenarios.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 group">
              <button onClick={() => onLoad(s)} className="flex items-center gap-2 text-left min-w-0 flex-1">
                <FolderOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">{s.name}</div>
                  <div className="text-[10px] text-slate-400">
                    {s.legs.length} legs · {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleDuplicate(s)} className="p-1 text-slate-400 hover:text-slate-700" title="Duplicate">
                  <Copy className="w-3 h-3" />
                </button>
                <button onClick={() => handleDelete(s.id)} className="p-1 text-slate-400 hover:text-red-600" title="Delete">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowSaveDialog(false)}>
          <div className="bg-white rounded-xl shadow-xl p-5 w-80 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-800">Save Scenario</h4>
              <button onClick={() => setShowSaveDialog(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Scenario name"
              className="input"
              autoFocus
            />
            <button
              onClick={handleSave}
              className="w-full px-3 py-2 bg-navy text-white rounded-md text-sm font-medium hover:bg-brand-700"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
