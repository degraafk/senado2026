import React from 'react';
import { Layers } from 'lucide-react';
import { PRESETS, PresetScenario } from '../data/presets';

interface PresetBarProps {
  activePresetId: string | null;
  onSelectPreset: (preset: PresetScenario) => void;
}

export const PresetBar: React.FC<PresetBarProps> = ({
  activePresetId,
  onSelectPreset
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2.5">
        <Layers className="h-4 w-4 text-blue-600" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
          Escenarios y Proyecciones Rápidas
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {PRESETS.map(preset => {
          const isActive = activePresetId === preset.id;

          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className={`flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-50 border-blue-500 text-blue-950 shadow-xs ring-2 ring-blue-500/20'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 shadow-2xs'
              }`}
            >
              <span className="font-bold text-xs truncate text-slate-900">
                {preset.name}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                {preset.tagline}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
