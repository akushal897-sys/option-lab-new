import type { StrategyLeg } from '@/types';
import { legQuantity } from '@/lib/calcEngine';
import { Trash2, Pencil, Copy, ArrowUp, ArrowDown } from 'lucide-react';

interface PositionsPanelProps {
  legs: StrategyLeg[];
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleSide: (id: string) => void;
  editingId?: string | null;
  editForm?: Partial<StrategyLeg> | null;
  onEditFormChange?: (form: Partial<StrategyLeg>) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
}

export function PositionsPanel({
  legs,
  onRemove,
  onEdit,
  onDuplicate,
  onToggleSide,
  editingId,
  editForm,
  onEditFormChange,
  onSaveEdit,
  onCancelEdit,
}: PositionsPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
          Positions ({legs.length})
        </h3>
      </div>

      {legs.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-slate-400">
          No positions yet. Select a strategy to begin.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {legs.map((leg) => {
            const isEditing = editingId === leg.id;
            if (isEditing && editForm && onEditFormChange) {
              return (
                <LegEditRow
                  key={leg.id}
                  leg={leg}
                  editForm={editForm}
                  onFormChange={onEditFormChange}
                  onSave={onSaveEdit ?? (() => {})}
                  onCancel={onCancelEdit ?? (() => {})}
                />
              );
            }
            return (
              <div key={leg.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        leg.side === 'LONG'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {leg.side === 'LONG' ? 'BUY' : 'SELL'}
                    </span>
                    <span className="text-sm font-medium text-slate-700">
                      {leg.instrumentType === 'OPTION'
                        ? leg.optionType === 'CALL' ? 'Call' : 'Put'
                        : 'Futures'}
                    </span>
                    {leg.instrumentType === 'OPTION' && leg.strike != null && (
                      <span className="text-sm text-slate-500">K={leg.strike}</span>
                    )}
                    {leg.instrumentType === 'FUTURE' && leg.entryPrice != null && (
                      <span className="text-sm text-slate-500">@{leg.entryPrice}</span>
                    )}
                    {leg.instrumentType === 'OPTION' && leg.premium != null && (
                      <span className="text-sm text-slate-500">
                        {leg.side === 'LONG' ? '-' : '+'}₹{leg.premium}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {leg.lotSize}×{leg.lots} = {legQuantity(leg)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <IconButton onClick={() => onToggleSide(leg.id)} title="Flip Long/Short">
                      {leg.side === 'LONG' ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
                    </IconButton>
                    <IconButton onClick={() => onEdit(leg.id)} title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </IconButton>
                    <IconButton onClick={() => onDuplicate(leg.id)} title="Duplicate">
                      <Copy className="w-3.5 h-3.5" />
                    </IconButton>
                    <IconButton onClick={() => onRemove(leg.id)} title="Remove" danger>
                      <Trash2 className="w-3.5 h-3.5" />
                    </IconButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IconButton({
  children,
  onClick,
  title,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        danger
          ? 'text-slate-400 hover:bg-red-100 hover:text-red-600'
          : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

function LegEditRow({
  leg,
  editForm,
  onFormChange,
  onSave,
  onCancel,
}: {
  leg: StrategyLeg;
  editForm: Partial<StrategyLeg>;
  onFormChange: (form: Partial<StrategyLeg>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="px-4 py-3 bg-amber-50 border-l-4 border-amber-400 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {leg.instrumentType === 'OPTION' && (
          <>
            <EditField label="Strike">
              <input
                type="number"
                value={editForm.strike ?? ''}
                onChange={(e) => onFormChange({ ...editForm, strike: parseFloat(e.target.value) || 0 })}
                className="input-sm"
              />
            </EditField>
            <EditField label="Premium">
              <input
                type="number"
                value={editForm.premium ?? ''}
                onChange={(e) => onFormChange({ ...editForm, premium: parseFloat(e.target.value) || 0 })}
                className="input-sm"
              />
            </EditField>
            <EditField label="Type">
              <select
                value={editForm.optionType ?? 'CALL'}
                onChange={(e) => onFormChange({ ...editForm, optionType: e.target.value as 'CALL' | 'PUT' })}
                className="input-sm"
              >
                <option value="CALL">Call</option>
                <option value="PUT">Put</option>
              </select>
            </EditField>
          </>
        )}
        {leg.instrumentType === 'FUTURE' && (
          <EditField label="Entry Price">
            <input
              type="number"
              value={editForm.entryPrice ?? ''}
              onChange={(e) => onFormChange({ ...editForm, entryPrice: parseFloat(e.target.value) || 0 })}
              className="input-sm"
            />
          </EditField>
        )}
        <EditField label="Lot Size">
          <input
            type="number"
            value={editForm.lotSize ?? ''}
            onChange={(e) => onFormChange({ ...editForm, lotSize: parseInt(e.target.value, 10) || 0 })}
            className="input-sm"
          />
        </EditField>
        <EditField label="Lots">
          <input
            type="number"
            value={editForm.lots ?? ''}
            onChange={(e) => onFormChange({ ...editForm, lots: parseFloat(e.target.value) || 0 })}
            className="input-sm"
          />
        </EditField>
        {leg.instrumentType === 'FUTURE' && <div />}
      </div>
      <div className="flex items-center gap-2">
        <EditField label="Txn Cost (optional)">
          <input
            type="number"
            value={editForm.transactionCost ?? ''}
            onChange={(e) => onFormChange({ ...editForm, transactionCost: parseFloat(e.target.value) || 0 })}
            className="input-sm"
          />
        </EditField>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded">
          Cancel
        </button>
        <button onClick={onSave} className="px-3 py-1 text-xs font-medium bg-navy text-white rounded hover:bg-brand-700">
          Save
        </button>
      </div>
    </div>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">{label}</label>
      {children}
    </div>
  );
}
