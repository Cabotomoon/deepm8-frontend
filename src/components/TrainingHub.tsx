/**
 * TrainingHub Component
 *
 * The permanent "Entrenamiento" section:
 *   📚 Teoría · 🧩 Puzzles · 🎯 Recomendaciones · 📈 Mi progreso
 *
 * Launches TrainingSession for any module. All modules the user has ever
 * generated/started remain permanently accessible here.
 */

import React, { useMemo, useState } from 'react';
import TrainingSession, { type TrainingMode } from './TrainingSession';
import { getAllCategoryModules, getModule, CATEGORY_DISPLAY } from '../data/trainingModules';
import { trainingProgressService } from '../services/trainingProgressService';
import { studyRecommendationService } from '../services/studyRecommendationService';
import { playerProfileService } from '../services/playerProfileService';
import {
  type TrainingCategory,
  DIFFICULTY_LABELS
} from '../types/training.types';

type HubTab = 'theory' | 'puzzles' | 'recommendations' | 'progress';

interface TrainingHubProps {
  onClose: () => void;
  /** Optional deep-link: open a specific module directly */
  initialModuleId?: string;
  initialCategory?: TrainingCategory;
  initialMode?: TrainingMode;
}

interface ActiveSession {
  moduleId: string;
  category: TrainingCategory;
  mode: TrainingMode;
}

export default function TrainingHub({
  onClose,
  initialModuleId,
  initialCategory,
  initialMode
}: TrainingHubProps) {
  const [tab, setTab] = useState<HubTab>('recommendations');
  const [session, setSession] = useState<ActiveSession | null>(
    initialModuleId && initialCategory
      ? { moduleId: initialModuleId, category: initialCategory, mode: initialMode || 'full' }
      : null
  );

  if (session) {
    return (
      <TrainingSession
        moduleId={session.moduleId}
        category={session.category}
        mode={session.mode}
        onClose={() => setSession(null)}
      />
    );
  }

  const tabs: { id: HubTab; label: string; icon: string }[] = [
    { id: 'recommendations', label: 'Recomendaciones', icon: '🎯' },
    { id: 'theory', label: 'Teoría', icon: '📚' },
    { id: 'puzzles', label: 'Puzzles', icon: '🧩' },
    { id: 'progress', label: 'Mi progreso', icon: '📈' }
  ];

  return (
    <div className="fixed inset-0 z-[55] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-xl border-b border-purple-500/30 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <span>🎓</span> Entrenamiento
          </h1>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm transition-colors"
          >
            ✕ Salir
          </button>
        </div>
        <div className="max-w-5xl mx-auto mt-4 flex gap-2 overflow-x-auto pb-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {tab === 'recommendations' && (
          <RecommendationsTab onLaunch={(m, c, mode) => setSession({ moduleId: m, category: c, mode })} />
        )}
        {tab === 'theory' && (
          <CategoryGrid mode="theory" onLaunch={(m, c) => setSession({ moduleId: m, category: c, mode: 'theory' })} />
        )}
        {tab === 'puzzles' && (
          <CategoryGrid mode="puzzles" onLaunch={(m, c) => setSession({ moduleId: m, category: c, mode: 'puzzles' })} />
        )}
        {tab === 'progress' && <ProgressTab onLaunch={(m, c) => setSession({ moduleId: m, category: c, mode: 'full' })} />}
      </div>
    </div>
  );
}

/* ===================== RECOMMENDATIONS TAB ===================== */
function RecommendationsTab({
  onLaunch
}: {
  onLaunch: (moduleId: string, category: TrainingCategory, mode: TrainingMode) => void;
}) {
  const [recs, setRecs] = useState<ReturnType<typeof studyRecommendationService.generateRecommendations>>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const profile = await playerProfileService.getProfile();
        const metrics = studyRecommendationService.calculateSkillMetrics(profile);
        const generated = studyRecommendationService.generateRecommendations(profile, metrics);
        if (mounted) setRecs(generated);
      } catch {
        if (mounted) setRecs([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const priorityConfig: Record<string, { border: string; badge: string; text: string; icon: string }> = {
    high: { border: 'border-red-500/50', badge: 'bg-red-500/30 text-red-200', text: 'PRIORIDAD ALTA', icon: '⚠️' },
    medium: { border: 'border-blue-500/50', badge: 'bg-blue-500/30 text-blue-200', text: 'RECOMENDADO', icon: '🎯' },
    low: { border: 'border-slate-700', badge: 'bg-slate-600/50 text-slate-300', text: 'OPCIONAL', icon: '📖' }
  };

  if (loading) {
    return <div className="text-center text-slate-400 py-16">Analizando tus partidas...</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-slate-300 text-sm">
        Recomendaciones basadas en tus partidas recientes. Se actualizan con tu juego, pero tus módulos anteriores siguen disponibles en "Mi progreso".
      </p>
      {recs.map(rec => {
        const cfg = priorityConfig[rec.priority];
        const progress = trainingProgressService.getModuleProgress(rec.id, rec.category as TrainingCategory);
        return (
          <div key={rec.id} className={`bg-slate-800/50 rounded-xl p-5 border-2 ${cfg.border}`}>
            <div className="flex items-start gap-4">
              <div className="text-3xl">{cfg.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-lg font-bold text-white">{rec.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${cfg.badge}`}>{cfg.text}</span>
                </div>
                <p className="text-slate-400 text-sm mb-1"><span className="font-semibold">Por qué:</span> {rec.reason}</p>
                <p className="text-slate-200 text-sm mb-3">{rec.description}</p>
                {progress.attempts > 0 && (
                  <p className="text-xs text-purple-300 mb-3">
                    Progreso: {progress.completedPuzzles.length} puzzles resueltos · nivel {DIFFICULTY_LABELS[progress.currentLevel]} · mejor precisión {progress.bestAccuracy}%
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => onLaunch(rec.id, rec.category as TrainingCategory, 'full')}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-2.5 px-5 rounded-lg transition-all hover:scale-[1.02]"
                  >
                    👉 {rec.actionLabel}
                  </button>
                  <button
                    onClick={() => onLaunch(rec.id, rec.category as TrainingCategory, 'puzzles')}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 px-5 rounded-lg transition-all"
                  >
                    {rec.secondaryActionLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ===================== CATEGORY GRID (Theory / Puzzles) ===================== */
function CategoryGrid({
  mode,
  onLaunch
}: {
  mode: 'theory' | 'puzzles';
  onLaunch: (moduleId: string, category: TrainingCategory) => void;
}) {
  const modules = useMemo(() => getAllCategoryModules(), []);
  return (
    <div className="space-y-4">
      <p className="text-slate-300 text-sm">
        {mode === 'theory'
          ? 'Lecciones progresivas con preguntas de comprensión para cada área del juego.'
          : 'Puzzles interactivos: resuelve posiciones moviendo las piezas en el tablero real.'}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modules.map(m => {
          const progress = trainingProgressService.getModuleProgress(m.id, m.category);
          return (
            <button
              key={m.id}
              onClick={() => onLaunch(m.id, m.category)}
              className="text-left bg-slate-800/50 hover:bg-slate-700/60 rounded-xl p-5 border border-slate-700 hover:border-purple-500/50 transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{m.icon}</span>
                <div>
                  <h3 className="text-lg font-bold text-white">{m.title}</h3>
                  <p className="text-slate-400 text-xs">{m.subtitle}</p>
                </div>
              </div>
              <div className="text-xs text-purple-300">
                {mode === 'theory'
                  ? (progress.completedTheory ? '✅ Teoría completada' : `${m.lessons.length} lecciones`)
                  : `${progress.completedPuzzles.length} puzzles resueltos · nivel ${DIFFICULTY_LABELS[progress.currentLevel]}`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== PROGRESS TAB ===================== */
function ProgressTab({
  onLaunch
}: {
  onLaunch: (moduleId: string, category: TrainingCategory) => void;
}) {
  const stats = useMemo(() => trainingProgressService.getOverallStats(), []);
  const modules = useMemo(() => trainingProgressService.getAllModules(), []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat value={`${stats.modulesStarted}`} label="Módulos" />
        <MiniStat value={`${stats.totalPuzzlesSolved}`} label="Puzzles resueltos" />
        <MiniStat value={`${stats.avgAccuracy}%`} label="Precisión media" />
        <MiniStat value={`${stats.totalXp}`} label="XP total" />
      </div>

      {modules.length === 0 ? (
        <div className="text-center text-slate-400 py-12">
          Aún no has entrenado. Empieza por "Recomendaciones" o "Teoría".
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-white">Tus módulos</h3>
          {modules.map(m => {
            const meta = CATEGORY_DISPLAY[m.category];
            const title = getModule(m.moduleId, m.category).title;
            return (
              <button
                key={m.moduleId}
                onClick={() => onLaunch(m.moduleId, m.category)}
                className="w-full text-left bg-slate-800/50 hover:bg-slate-700/60 rounded-xl p-4 border border-slate-700 hover:border-purple-500/50 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">{meta.icon}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{title}</p>
                      <p className="text-xs text-slate-400">
                        {m.completedTheory ? '✅ Teoría' : '○ Teoría'} · {m.completedPuzzles.length} puzzles · nivel {DIFFICULTY_LABELS[m.currentLevel]}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-purple-400">{m.bestAccuracy}%</div>
                    <div className="text-xs text-slate-500">mejor</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
      <div className="text-2xl font-bold text-purple-400">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
