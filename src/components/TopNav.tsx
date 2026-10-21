import React, { useState } from 'react';
import { Share2, RotateCcw, Check, ShieldAlert, BarChart3 } from 'lucide-react';

interface TopNavProps {
  onReset: () => void;
  onShare: () => void;
  isModifiedFrom2023: boolean;
  activeTab: 'simulator' | 'risk_ranking';
  onTabChange: (tab: 'simulator' | 'risk_ranking') => void;
  onToggleParliament?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onReset,
  onShare,
  isModifiedFrom2023,
  activeTab,
  onTabChange,
  onToggleParliament
}) => {
  const [copied, setCopied] = useState(false);

  const handleShareClick = () => {
    onShare();
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1720px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single element Brand wordmark */}
        <a
          href="#"
          onClick={e => {
            e.preventDefault();
            onTabChange('simulator');
          }}
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 transition-opacity hover:opacity-90 cursor-pointer"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white shadow-sm shadow-blue-500/20">
            S
          </span>
          <span className="font-semibold tracking-tight text-slate-900">
            Senado<span className="text-blue-600 font-bold">2026</span>
          </span>
          <span className="hidden text-xs text-slate-400 sm:inline" aria-hidden="true">·</span>
          <span className="hidden text-xs font-medium text-slate-500 md:inline">
            Simulador Electoral
          </span>
        </a>

        {/* Zone 2: Navigation & View Switcher */}
        <div className="flex items-center gap-4">
          {/* Segmented Page Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => onTabChange('simulator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'simulator'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 text-blue-600" />
              <span>Simulador General</span>
            </button>

            <button
              onClick={() => onTabChange('risk_ranking')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'risk_ranking'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Mayor Riesgo Derecha</span>
            </button>
          </div>

          {/* Sub-links when on simulator tab */}
          {activeTab === 'simulator' && (
            <nav className="hidden items-center gap-5 text-xs font-medium text-slate-500 xl:flex border-l border-slate-200 pl-4">
              <a href="#hemiciclo" className="hover:text-slate-900 transition-colors">
                Hemiciclo
              </a>
              <a href="#mayoria" className="hover:text-slate-900 transition-colors">
                Mayoría 133
              </a>
              <a href="#simulador" className="hover:text-slate-900 transition-colors">
                Ajustar Voto
              </a>
              <a href="#provincias" className="hover:text-slate-900 transition-colors">
                Circunscripciones
              </a>
              <a href="#comparativa" className="hover:text-slate-900 transition-colors">
                Comparativa
              </a>
            </nav>
          )}
        </div>

        {/* Zone 3: Primary actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onToggleParliament && (
            <button
              onClick={onToggleParliament}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
              title="Abrir panel del parlamento en vivo"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Parlamento</span>
            </button>
          )}

          {isModifiedFrom2023 && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Restablecer los porcentajes y parámetros al escenario real de 2023"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Base 2023</span>
            </button>
          )}

          <button
            onClick={handleShareClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-lg shadow-sm shadow-blue-600/20 transition-all whitespace-nowrap shrink-0 cursor-pointer"
            title="Copiar enlace con este escenario personalizado"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-200" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5" />
                <span>Compartir</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
