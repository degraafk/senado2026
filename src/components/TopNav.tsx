import React, { useState } from 'react';
import { Share2, RotateCcw, Check } from 'lucide-react';

interface TopNavProps {
  onReset: () => void;
  onShare: () => void;
  isModifiedFrom2023: boolean;
  activeTab: 'simulator' | 'risk_ranking';
  onTabChange: (tab: 'simulator' | 'risk_ranking') => void;
  onToggleParliament?: () => void;
}

const TABS: { id: 'simulator' | 'risk_ranking'; label: string }[] = [
  { id: 'simulator', label: 'Simulador' },
  { id: 'risk_ranking', label: 'Riesgo del bloque de derechas' }
];

const SECTIONS = [
  ['hemiciclo', 'Hemiciclo'],
  ['simulador', 'Ajustar voto'],
  ['provincias', 'Circunscripciones'],
  ['comparativa', 'Comparativa']
];

/* Brand mark: a tiny hemicycle of seven seats */
const Mark = () => (
  <svg viewBox="0 0 32 18" className="h-5 w-auto" aria-hidden="true">
    {[0, 1, 2, 3, 4, 5, 6].map(i => {
      const a = Math.PI * (1 - i / 6);
      return <circle key={i} cx={16 + 13 * Math.cos(a)} cy={16 - 13 * Math.sin(a)} r="2.3" fill="currentColor" />;
    })}
  </svg>
);

export const TopNav: React.FC<TopNavProps> = ({
  onReset, onShare, isModifiedFrom2023, activeTab, onTabChange, onToggleParliament
}) => {
  const [copied, setCopied] = useState(false);

  const handleShareClick = () => {
    onShare();
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-slate-50/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1720px] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => onTabChange('simulator')}
          className="flex items-center gap-2.5 shrink-0 cursor-pointer text-slate-900"
          aria-label="Senado 2026, ir al simulador"
        >
          <Mark />
          <span className="font-display text-xl font-semibold tracking-tight">Senado 2026</span>
        </button>

        <nav className="flex h-full items-stretch gap-6" aria-label="Vistas">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              aria-current={activeTab === t.id ? 'page' : undefined}
              className={`relative h-full text-sm font-medium cursor-pointer transition-colors ${
                activeTab === t.id ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.id === 'simulator' ? 'Simulador' : 'Riesgo'}</span>
              {activeTab === t.id && <span className="absolute inset-x-0 bottom-[-1px] h-[2px] bg-slate-900" />}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {onToggleParliament && (
            <button
              onClick={onToggleParliament}
              className="lg:hidden rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 cursor-pointer"
            >
              Escaños
            </button>
          )}
          {isModifiedFrom2023 && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Volver a los resultados reales de 2023"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Volver a 2023</span>
            </button>
          )}
          <button
            onClick={handleShareClick}
            className="flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors cursor-pointer"
            title="Copiar un enlace a este escenario"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
            <span>{copied ? 'Enlace copiado' : 'Compartir'}</span>
          </button>
        </div>
      </div>

      {activeTab === 'simulator' && (
        <div className="hidden border-t border-slate-200/70 md:block">
          <nav className="mx-auto flex h-9 max-w-[1720px] items-center gap-6 px-4 sm:px-6 lg:px-8 text-xs text-slate-500" aria-label="Secciones">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="hover:text-slate-900 transition-colors">{label}</a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};
