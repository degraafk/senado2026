import React, { useState, useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { buildData, computeModel, ModelInput, ModelResult } from './engine/senateEngine';
import { PRESETS, PresetScenario, getDefaultBasePercentages, getDefaultDirect } from './data/presets';
import { TopNav } from './components/TopNav';
import { Hemicycle } from './components/Hemicycle';
import { ControlPanel } from './components/ControlPanel';
import { ConstituencyGrid } from './components/ConstituencyGrid';
import { ComparisonTable } from './components/ComparisonTable';
import { PresetBar } from './components/PresetBar';
import { RightRiskRankingView } from './components/RightRiskRankingView';
import { ParliamentSidebar } from './components/ParliamentSidebar';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

export default function App() {
  // Static base dataset
  const baseData = useMemo(() => buildData(), []);

  // Navigation tab state: 'simulator' or 'risk_ranking'
  const [activeTab, setActiveTab] = useState<'simulator' | 'risk_ranking'>('simulator');
  const [isMobileParliamentOpen, setIsMobileParliamentOpen] = useState<boolean>(false);

  // Application model state
  const [modelInput, setModelInput] = useState<ModelInput>({
    pct: getDefaultBasePercentages(),
    sdpOverride: null,
    direct: getDefaultDirect(),
    X: 0,
    Y: 0,
    voxWithdraw: []
  });

  const targetMajority = 133; // el objetivo es siempre 133
  const [selectedBloc, setSelectedBloc] = useState<Set<string>>(new Set(['PP']));
  const [activePresetId, setActivePresetId] = useState<string | null>('base2023');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Compute model output
  const result: ModelResult = useMemo(() => {
    return computeModel(baseData, modelInput);
  }, [baseData, modelInput]);

  // URL Hash state packing/unpacking
  const packState = () => {
    try {
      const obj = {
        p: modelInput.pct,
        s: modelInput.sdpOverride,
        d: modelInput.direct,
        X: modelInput.X,
        Y: modelInput.Y,
        vw: modelInput.voxWithdraw || [],
        t: targetMajority,
        b: Array.from(selectedBloc),
        tab: activeTab
      };
      return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
    } catch {
      return '';
    }
  };

  const unpackState = () => {
    try {
      const hash = window.location.hash.match(/s=([^&]+)/);
      if (!hash) return false;
      const json = JSON.parse(decodeURIComponent(escape(atob(hash[1]))));
      if (json && json.p) {
        setModelInput({
          pct: json.p,
          sdpOverride: json.s ?? null,
          direct: json.d ?? getDefaultDirect(),
          X: json.X ?? 0,
          Y: json.Y ?? 0,
          voxWithdraw: Array.isArray(json.vw) ? json.vw : []
        });
        if (Array.isArray(json.b)) setSelectedBloc(new Set(json.b));
        if (json.tab === 'risk_ranking' || json.tab === 'simulator') {
          setActiveTab(json.tab);
        }
        setActivePresetId(null);
        return true;
      }
    } catch (e) {
      console.warn('Error reading URL state hash', e);
    }
    return false;
  };

  // Initial load from URL hash
  useEffect(() => {
    const restored = unpackState();
    if (!restored) {
      const base = PRESETS[0];
      setModelInput({
        pct: { ...base.pct },
        sdpOverride: base.sdpOverride,
        direct: { ...base.direct },
        X: base.X,
        Y: base.Y,
        voxWithdraw: base.voxWithdraw ? [...base.voxWithdraw] : []
      });
      setSelectedBloc(new Set(base.defaultBloc));
      setActivePresetId(base.id);
    }
  }, []);

  // Update URL hash when state changes
  useEffect(() => {
    const encoded = packState();
    if (encoded) {
      try {
        window.history.replaceState(null, '', `#s=${encoded}`);
      } catch {
        // Safe fallback in restricted sandboxes
      }
    }
  }, [modelInput, targetMajority, selectedBloc, activeTab]);

  // Entrance animation with GSAP on tab changes
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current.querySelectorAll('.gsap-fade'),
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.07, ease: 'power2.out' }
      );
    }
  }, [activeTab]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(
        () => showToast('¡Enlace del escenario copiado al portapapeles!'),
        () => prompt('Copia la dirección del escenario:', url)
      );
    } else {
      prompt('Copia la dirección del escenario:', url);
    }
  };

  const handleReset = () => {
    const base = PRESETS[0];
    setModelInput({
      pct: { ...base.pct },
      sdpOverride: base.sdpOverride,
      direct: { ...base.direct },
      X: base.X,
      Y: base.Y,
      voxWithdraw: []
    });
    setSelectedBloc(new Set(['PP']));
    setActivePresetId(base.id);
    showToast('Restablecido al escenario oficial de 2023');
  };

  const handleSelectPreset = (preset: PresetScenario) => {
    setModelInput({
      pct: { ...preset.pct },
      sdpOverride: preset.sdpOverride,
      direct: { ...preset.direct },
      X: preset.X,
      Y: preset.Y,
      voxWithdraw: preset.voxWithdraw ? [...preset.voxWithdraw] : []
    });
    setSelectedBloc(new Set(preset.defaultBloc));
    setActivePresetId(preset.id);
    showToast(`Escenario cargado: ${preset.name}`);
  };

  const handleTogglePartyInBloc = (party: string) => {
    setSelectedBloc(prev => {
      const next = new Set(prev);
      if (next.has(party)) next.delete(party);
      else next.add(party);
      return next;
    });
  };

  const handleSetBloc = (parties: string[]) => {
    setSelectedBloc(new Set(parties));
  };

  const handleModelInputChange = (newInput: ModelInput) => {
    setModelInput(newInput);
    setActivePresetId(null); // marked as custom
  };

  // Toggle VOX withdrawal in a specific constituency
  const handleToggleVoxWithdraw = (constituencyName: string) => {
    setModelInput(prev => {
      const current = new Set(prev.voxWithdraw || []);
      const wasWithdrawn = current.has(constituencyName);
      if (wasWithdrawn) {
        current.delete(constituencyName);
      } else {
        current.add(constituencyName);
      }
      return {
        ...prev,
        voxWithdraw: Array.from(current)
      };
    });
    setActivePresetId(null);
  };

  // Batch set of withdrawn constituencies
  const handleSetVoxWithdraw = (constituencies: string[]) => {
    setModelInput(prev => ({
      ...prev,
      voxWithdraw: constituencies
    }));
    setActivePresetId(null);
  };

  const isModifiedFrom2023 = activePresetId !== 'base2023' || (modelInput.voxWithdraw?.length ?? 0) > 0;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white"
    >
      {/* 3-Zone Top Navigation in Light Mode */}
      <TopNav
        onReset={handleReset}
        onShare={handleShare}
        isModifiedFrom2023={isModifiedFrom2023}
        activeTab={activeTab}
        onTabChange={tab => setActiveTab(tab)}
        onToggleParliament={() => setIsMobileParliamentOpen(prev => !prev)}
      />

      {/* Main Content Layout with Sticky Right Parliament Column */}
      <div className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6 lg:gap-8 items-stretch relative">
          {/* Main Content Column */}
          <main className="flex-1 min-w-0 space-y-10">
            {activeTab === 'simulator' ? (
          <>
            {/* Hero Section */}
            <section className="space-y-6 gsap-fade">
              <div className="max-w-4xl pt-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-slate-950 text-balance leading-[1.02]">
                  ¿Quién controlará el Senado en 2026?
                </h1>
                <p className="text-slate-600 text-base sm:text-lg max-w-2xl mt-4 leading-relaxed">
                  Cada provincia elige 4 senadores, pero cada votante solo puede marcar 3. Mueve el voto de cada partido y mira si alguien llega a los <strong className="text-slate-900">133 escaños</strong> que dan mayoría de tres quintos.
                </p>
              </div>

              {/* Preset scenarios bar */}
              <div className="pt-2">
                <PresetBar
                  activePresetId={activePresetId}
                  onSelectPreset={handleSelectPreset}
                />
              </div>
            </section>

            {/* Section: Hemicycle + how the vote works */}
            <section id="hemiciclo" className="gsap-fade">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="grid gap-8 lg:grid-cols-12">
                  <div className="lg:col-span-8">
                    <Hemicycle
                      result={result}
                      selectedBloc={selectedBloc}
                      onTogglePartyInBloc={handleTogglePartyInBloc}
                      onClearBloc={() => handleSetBloc([])}
                      targetMajority={targetMajority}
                    />
                  </div>

                  <div className="flex flex-col gap-5 lg:col-span-4 lg:border-l lg:border-slate-200 lg:pl-8">
                    <h3 className="text-xl font-semibold text-slate-950">Cómo funciona el voto</h3>
                    <div className="space-y-4 text-sm leading-relaxed text-slate-600">
                      <p>
                        <strong className="text-slate-900">Cada votante marca 3 nombres, no 4.</strong> En casi todas las provincias se eligen 4 senadores, así que lo normal es que el primer partido se lleve 3 y el segundo 1.
                      </p>
                      <p>
                        <strong className="text-slate-900">VOX puede retirar su lista.</strong> Si lo hace en una provincia, el modelo pasa todos sus votos al PP para asegurar ese 3-1.
                      </p>
                      <p>
                        <strong className="text-slate-900">Ibiza y Formentera votan por separado.</strong> Son dos circunscripciones de un senador cada una, y por eso son 209 senadores electos.
                      </p>
                    </div>
                    <dl className="mt-auto flex gap-8 border-t border-slate-100 pt-4 text-sm">
                      <div>
                        <dt className="text-slate-500">Mayoría absoluta</dt>
                        <dd className="font-display text-3xl font-semibold text-slate-900 tabular-nums">105</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Objetivo</dt>
                        <dd className="font-display text-3xl font-semibold text-brass tabular-nums">{targetMajority}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Control Panel (Sliders, Percentages, Strategic Transfer & VOX Withdrawal) */}
            <section id="simulador" className="gsap-fade">
              <ControlPanel
                input={modelInput}
                result={result}
                onChange={handleModelInputChange}
                onReset={handleReset}
                onToggleVoxWithdraw={handleToggleVoxWithdraw}
                onSetVoxWithdraw={handleSetVoxWithdraw}
              />
            </section>

            {/* Section: Constituency Grid (59 circunscripciones) */}
            <section id="provincias" className="gsap-fade">
              <ConstituencyGrid
                constituencies={result.cons}
                onToggleVoxWithdraw={handleToggleVoxWithdraw}
              />
            </section>

            {/* Section: Comparison Table */}
            <section id="comparativa" className="gsap-fade">
              <ComparisonTable result={result} />
            </section>
          </>
        ) : (
          /* "Mayor Riesgo para la Derecha" Dedicated Ranking Page */
          <div className="space-y-8 gsap-fade">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-rose-700">
                <ShieldAlert className="h-4 w-4" />
                <span>Análisis de Vulnerabilidad Electoral</span>
                <span>·</span>
                <span>Bloque Conservador</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight mt-1.5">
                Mayor Riesgo para la Derecha por Circunscripción
              </h1>
              <p className="text-slate-600 text-sm sm:text-base max-w-3xl mt-2 leading-relaxed">
                Ranking de vulnerabilidad para el <strong>Bloque de Derechas (PP + UPN-PP + VOX + Sa Unió)</strong> dividida en dos secciones: plazas donde vence la izquierda y plazas con mayoría de la derecha. Permite simular en tiempo real la <strong>retirada de candidaturas de VOX</strong> circunscripción a circunscripción (100% de votos al PP) para evaluar su efecto inmediato en la recuperación o blindaje del 3-1, 2-1, 2-0 o 1-0.
              </p>
            </div>

            {/* Preset selector in Risk Page */}
            <div>
              <PresetBar
                activePresetId={activePresetId}
                onSelectPreset={handleSelectPreset}
              />
            </div>

            {/* Ranking Component with direct VOX toggle actions */}
            <RightRiskRankingView
              result={result}
              voxWithdraw={modelInput.voxWithdraw || []}
              onToggleVoxWithdraw={handleToggleVoxWithdraw}
              onSetVoxWithdraw={handleSetVoxWithdraw}
            />
          </div>
        )}
      </main>

          {/* Sticky Right Column: Real-Time Parliament and Party Seats */}
          <ParliamentSidebar
            result={result}
            selectedBloc={selectedBloc}
            onTogglePartyInBloc={handleTogglePartyInBloc}
            targetMajority={targetMajority}
            isOpenMobile={isMobileParliamentOpen}
            onToggleMobile={() => setIsMobileParliamentOpen(!isMobileParliamentOpen)}
          />
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-2xl shadow-slate-900/30 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer in Light Mode */}
      <footer className="w-full border-t border-slate-200 bg-white py-8 mt-12">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
          <div>
            <span>Datos oficiales 2023: Junta Electoral Central (BOE).</span>
            <span className="mx-2">·</span>
            <span>Modelo de proyección con multiplicador indexado.</span>
          </div>
          <div>
            <span>Simulador de Escaños del Senado · 209 Senadores</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
