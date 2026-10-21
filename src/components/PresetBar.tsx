import React from 'react';
import { PRESETS, PresetScenario } from '../data/presets';
import { Pill } from './ui';

interface PresetBarProps {
  activePresetId: string | null;
  onSelectPreset: (preset: PresetScenario) => void;
}

export const PresetBar: React.FC<PresetBarProps> = ({ activePresetId, onSelectPreset }) => {
  const active = PRESETS.find(p => p.id === activePresetId);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-semibold text-slate-700">Escenarios</span>
        {PRESETS.map(p => (
          <Pill key={p.id} active={p.id === activePresetId} onClick={() => onSelectPreset(p)} title={p.tagline}>
            {p.name}
          </Pill>
        ))}
      </div>
      <p className="mt-2 max-w-3xl text-sm text-slate-500">
        {active ? active.description : 'Escenario personalizado: has cambiado algún dato.'}
      </p>
    </div>
  );
};
