/**
 * Deep M8 Coach Engine V1
 * Advanced post-game analysis with LLM feedback and persistent player profiling
 */

import { useState, useEffect } from 'react';
import stockfish from '../services/stockfishService';
import { playerProfileService, type GameRecord, type PlayerProfile } from '../services/playerProfileService';
import { llmCoachService, type CoachFeedback } from '../services/llmCoachService';
import { exportService } from '../services/exportService';
import { achievementService, type UnlockedAchievement } from '../services/achievementService';
import { socialShareService, type ShareableAchievement, type ShareableGame } from '../services/socialShareService';
import { studyRecommendationService, type StudyRecommendation, type SkillMetrics, type WeeklyGoal } from '../services/studyRecommendationService';
import ProgressChart from './ProgressChart';
import AchievementBadge from './AchievementBadge';
import AchievementNotification from './AchievementNotification';
import SocialShareModal from './SocialShareModal';

interface Move {
  notation: string;
  fen?: string;
  from: { row: number; col: number };
  to: { row: number; col: number };
}

interface MoveAnalysis {
  moveNumber: number;
  notation: string;
  evaluation: number; // centipawns
  classification: 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  comment: string;
  bestMove?: string;
  evaluationChange?: number;
}

interface GameAnalysisProps {
  moves: Move[];
  playerColor: 'white' | 'black';
  gameResult?: 'victory' | 'defeat' | 'draw' | null; // Game outcome
  onClose: () => void;
}

type AnalysisPhase = 'analyzing' | 'generating-feedback' | 'complete';

export default function GameAnalysis({ moves, playerColor, gameResult, onClose }: GameAnalysisProps) {
  const [phase, setPhase] = useState<AnalysisPhase>('analyzing');
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState<MoveAnalysis[]>([]);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [coachFeedback, setCoachFeedback] = useState<CoachFeedback | null>(null);
  const [activeTab, setActiveTab] = useState<'analysis' | 'feedback' | 'profile' | 'recommendations'>('analysis');
  const [gameRecord, setGameRecord] = useState<GameRecord | null>(null);
  const [exportMessage, setExportMessage] = useState<string>('');
  const [newAchievements, setNewAchievements] = useState<UnlockedAchievement[]>([]);
  const [currentNotification, setCurrentNotification] = useState<string | null>(null);
  const [shareModal, setShareModal] = useState<{ type: 'achievement' | 'game'; data: any } | null>(null);
  const [skillMetrics, setSkillMetrics] = useState<SkillMetrics | null>(null);
  const [recommendations, setRecommendations] = useState<StudyRecommendation[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoal | null>(null);

  useEffect(() => {
    analyzeGame();
  }, []);

  const handleExportJSON = () => {
    if (!gameRecord || !profile || !coachFeedback) return;

    exportService.exportAsJSON({
      gameRecord,
      profile,
      moveAnalysis: analysis,
      coachFeedback,
      exportDate: Date.now()
    });

    setExportMessage('✅ Exportado como JSON');
    setTimeout(() => setExportMessage(''), 3000);
  };

  const handleExportMarkdown = () => {
    if (!gameRecord || !profile || !coachFeedback) return;

    exportService.exportAsMarkdown({
      gameRecord,
      profile,
      moveAnalysis: analysis,
      coachFeedback,
      exportDate: Date.now()
    });

    setExportMessage('✅ Exportado como Markdown');
    setTimeout(() => setExportMessage(''), 3000);
  };

  const handleCopyToClipboard = async () => {
    if (!gameRecord || !profile || !coachFeedback) return;

    const success = await exportService.copyToClipboard({
      gameRecord,
      profile,
      moveAnalysis: analysis,
      coachFeedback,
      exportDate: Date.now()
    });

    if (success) {
      setExportMessage('✅ Copiado al portapapeles');
    } else {
      setExportMessage('❌ Error al copiar');
    }

    setTimeout(() => setExportMessage(''), 3000);
  };

  const analyzeGame = async () => {
    setPhase('analyzing');
    const results: MoveAnalysis[] = [];
    let previousEval = 0;
    let totalMoves = 0;
    let excellentMoves = 0;
    let goodMoves = 0;
    let inaccuracies = 0;
    let mistakes = 0;
    let blunders = 0;

    // Phase 1: Stockfish Analysis
    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const isPlayerMove = (i % 2 === 0 && playerColor === 'white') ||
                          (i % 2 === 1 && playerColor === 'black');

      if (!isPlayerMove) continue;

      setProgress(Math.round((i / moves.length) * 50)); // 0-50% for analysis

      if (!move.fen) continue;

      const beforeAnalysis = await stockfish.analyzeMove(move.fen, move.notation, 12);
      if (!beforeAnalysis) continue;

      const evaluation = beforeAnalysis.evaluation;
      const evaluationChange = evaluation - previousEval;

      let classification: MoveAnalysis['classification'];
      let comment: string;

      if (Math.abs(evaluationChange) < 15) {
        classification = 'excellent';
        comment = '¡Excelente! Mejor jugada.';
        excellentMoves++;
      } else if (Math.abs(evaluationChange) < 50) {
        classification = 'good';
        comment = 'Buen movimiento.';
        goodMoves++;
      } else if (Math.abs(evaluationChange) < 100) {
        classification = 'inaccuracy';
        comment = `Imprecisión. Mejor era ${beforeAnalysis.bestMove}.`;
        inaccuracies++;
      } else if (Math.abs(evaluationChange) < 300) {
        classification = 'mistake';
        comment = `Error. ${beforeAnalysis.bestMove} era mucho mejor.`;
        mistakes++;
      } else {
        classification = 'blunder';
        comment = `¡Blunder! Jugada muy débil. ${beforeAnalysis.bestMove} mantenía ventaja.`;
        blunders++;
      }

      results.push({
        moveNumber: Math.floor(i / 2) + 1,
        notation: move.notation,
        evaluation,
        classification,
        comment,
        bestMove: beforeAnalysis.bestMove,
        evaluationChange
      });

      previousEval = evaluation;
      totalMoves++;
    }

    const accuracyPercent = totalMoves > 0 ? Math.round(((excellentMoves + goodMoves) / totalMoves) * 100) : 0;

    setAnalysis(results);
    setAccuracy(accuracyPercent);

    // Phase 2: LLM Feedback Generation
    setPhase('generating-feedback');
    setProgress(60);

    // Convert game result to GameRecord format
    let recordResult: 'win' | 'loss' | 'draw' | 'incomplete';
    if (gameResult === 'victory') {
      recordResult = 'win';
    } else if (gameResult === 'defeat') {
      recordResult = 'loss';
    } else if (gameResult === 'draw') {
      recordResult = 'draw';
    } else {
      recordResult = 'incomplete';
    }

    // CRITICAL FIX: Generate PGN string for video replay service
    // Convert moves array to PGN notation (e.g., "1. e4 e5 2. Nf3 Nc6")
    const pgnMoves = moves
      .map((move, index) => {
        if (index % 2 === 0) {
          // White's move: add move number
          return `${Math.floor(index / 2) + 1}. ${move.notation}`;
        } else {
          // Black's move: just the notation
          return move.notation;
        }
      })
      .join(' ');

    const newGameRecord: GameRecord = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      accuracy: accuracyPercent,
      totalMoves,
      excellentMoves,
      goodMoves,
      inaccuracies,
      mistakes,
      blunders,
      playerColor,
      result: recordResult, // Use actual game result
      moves: pgnMoves // Include PGN notation string for video replay
    };

    setGameRecord(newGameRecord); // Store for export
    setProgress(70);

    // Update player profile and check achievements
    const { profile: updatedProfile, newAchievements: unlockedAchievements } =
      await playerProfileService.updateWithGame(newGameRecord);

    setProfile(updatedProfile);
    setNewAchievements(unlockedAchievements);

    // Calculate skill metrics and recommendations
    const metrics = studyRecommendationService.calculateSkillMetrics(updatedProfile);
    setSkillMetrics(metrics);

    const recs = studyRecommendationService.generateRecommendations(updatedProfile, metrics);
    setRecommendations(recs);

    const goal = studyRecommendationService.getWeeklyGoal(updatedProfile, metrics);
    setWeeklyGoal(goal);

    // Show first achievement notification
    if (unlockedAchievements.length > 0) {
      setCurrentNotification(unlockedAchievements[0].achievementId);
    }

    setProgress(80);

    // Generate LLM feedback
    const feedback = await llmCoachService.generateFeedback(newGameRecord, updatedProfile, results);
    setCoachFeedback(feedback);

    setProgress(100);
    setPhase('complete');
  };

  const getClassificationColor = (classification: MoveAnalysis['classification']) => {
    switch (classification) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'inaccuracy': return 'text-yellow-400';
      case 'mistake': return 'text-orange-400';
      case 'blunder': return 'text-red-400';
    }
  };

  const getClassificationIcon = (classification: MoveAnalysis['classification']) => {
    switch (classification) {
      case 'excellent': return '✓✓';
      case 'good': return '✓';
      case 'inaccuracy': return '?!';
      case 'mistake': return '?';
      case 'blunder': return '??';
    }
  };

  const getTrendIcon = (profile: PlayerProfile) => {
    if (profile.gameHistory.length < 5) return '➡️';

    const recent = profile.gameHistory.slice(0, 5);
    const older = profile.gameHistory.slice(5, 10);
    if (older.length === 0) return '➡️';

    const recentAvg = recent.reduce((sum, g) => sum + g.accuracy, 0) / recent.length;
    const olderAvg = older.reduce((sum, g) => sum + g.accuracy, 0) / older.length;

    if (recentAvg > olderAvg + 5) return '📈';
    if (recentAvg < olderAvg - 5) return '📉';
    return '➡️';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border-2 border-slate-700 max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 p-6 border-b border-white/10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img
                src="/branding/logo-knight.png"
                alt="DeepM8 Coach"
                className="h-12 w-12 object-contain"
              />
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">DeepM8 Coach Engine</h2>
                  <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold text-white backdrop-blur-sm">V1</span>
                </div>
                <p className="text-purple-100 mt-1 text-sm">Análisis inteligente con IA</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Export buttons (only when analysis is complete) */}
              {phase === 'complete' && (
                <>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyToClipboard}
                      className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-2 text-sm transition-all flex items-center gap-2"
                      title="Copiar al portapapeles"
                    >
                      📋
                    </button>
                    <button
                      onClick={handleExportMarkdown}
                      className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-2 text-sm transition-all flex items-center gap-2"
                      title="Exportar como Markdown"
                    >
                      📄 MD
                    </button>
                    <button
                      onClick={handleExportJSON}
                      className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-2 text-sm transition-all flex items-center gap-2"
                      title="Exportar como JSON"
                    >
                      💾 JSON
                    </button>
                    <button
                      onClick={() => {
                        if (gameRecord && profile) {
                          const highlights = socialShareService.extractHighlights(analysis, gameRecord);
                          setShareModal({
                            type: 'game',
                            data: { gameRecord, profile, highlights }
                          });
                        }
                      }}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg px-3 py-2 text-sm transition-all flex items-center gap-2"
                      title="Compartir partida en redes sociales"
                    >
                      📤 Compartir
                    </button>
                  </div>

                  {exportMessage && (
                    <div className="bg-green-500/20 text-green-300 px-3 py-2 rounded-lg text-sm">
                      {exportMessage}
                    </div>
                  )}
                </>
              )}

              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-lg px-4 py-2 transition-all"
              >
                ✕ Cerrar
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {phase !== 'complete' ? (
            <div className="text-center py-12 px-6">
              <div className="mb-8 flex justify-center">
                <img
                  src="/branding/logo-knight.png"
                  alt="DeepM8 Coach"
                  className="h-24 w-24 object-contain animate-pulse"
                />
              </div>
              <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2">
                {phase === 'analyzing' ? 'Analizando partida con Stockfish...' : 'Generando feedback con IA...'}
              </h3>
              <p className="text-slate-400 mb-8">
                {phase === 'analyzing' ? 'Evaluando cada movimiento' : 'Creando plan de entrenamiento personalizado'}
              </p>
              <div className="w-full max-w-md mx-auto bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 h-full transition-all duration-300 relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                </div>
              </div>
              <p className="text-slate-400 mt-4 font-medium">{progress}% completado</p>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
                <div className="flex gap-2 p-4 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('feedback')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
                      activeTab === 'feedback'
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/50'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700'
                    }`}
                  >
                    💡 Feedback IA
                  </button>
                  <button
                    onClick={() => setActiveTab('recommendations')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
                      activeTab === 'recommendations'
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/50'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700'
                    }`}
                  >
                    📚 Recomendaciones
                  </button>
                  <button
                    onClick={() => setActiveTab('analysis')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
                      activeTab === 'analysis'
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/50'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700'
                    }`}
                  >
                    📊 Análisis Detallado
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
                      activeTab === 'profile'
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/50'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700'
                    }`}
                  >
                    👤 Mi Perfil
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Recommendations Tab */}
                {activeTab === 'recommendations' && profile && skillMetrics && weeklyGoal && (
                  <div className="space-y-6">
                    {/* Weekly Goal Card */}
                    <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 rounded-xl p-6 border border-yellow-500/50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <span>🎯</span> Objetivo Semanal
                        </h3>
                        <span className="text-sm text-yellow-200">{weeklyGoal.daysActive}/{weeklyGoal.daysTotal} días</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-200">Completar {weeklyGoal.modulesTotal} módulos de práctica</span>
                          <span className="text-green-400 font-bold">{weeklyGoal.modulesCompleted}/{weeklyGoal.modulesTotal}</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 h-full transition-all duration-500" style={{ width: `${(weeklyGoal.modulesCompleted / weeklyGoal.modulesTotal) * 100}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-300">Mejorar {weeklyGoal.skillImprovement.skill} +{weeklyGoal.skillImprovement.target - weeklyGoal.skillImprovement.current + 5} pts</span>
                          <span className="text-blue-400 font-bold">+{weeklyGoal.skillImprovement.current - (weeklyGoal.skillImprovement.target - 10)} pts</span>
                        </div>
                      </div>
                    </div>

                    {/* Section Title */}
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                        <span>🚀</span> Tu Evolución como Jugador
                      </h3>
                      <p className="text-slate-400">Áreas priorizadas según tus últimas 10 partidas</p>
                    </div>

                    {/* Skills Progress Bars */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h3 className="text-xl font-bold text-white mb-4">Tu Progreso por Área</h3>
                      <div className="space-y-4">
                        {/* Openings */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-200 font-medium">Aperturas</span>
                            <div className="flex items-center gap-3">
                              <span className={`font-bold ${skillMetrics.openings >= 70 ? 'text-green-400' : skillMetrics.openings >= 50 ? 'text-blue-400' : 'text-orange-400'}`}>
                                {skillMetrics.openings}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                skillMetrics.openings >= 70 ? 'text-green-400 bg-green-500/20' :
                                skillMetrics.openings >= 50 ? 'text-blue-400 bg-blue-500/20' :
                                'text-orange-400 bg-orange-500/20'
                              }`}>
                                {skillMetrics.openings >= 70 ? 'Fuerte' : skillMetrics.openings >= 50 ? 'Mejorando' : 'Necesita trabajo'}
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${
                              skillMetrics.openings >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                              skillMetrics.openings >= 50 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                              'bg-gradient-to-r from-orange-500 to-red-500'
                            }`} style={{ width: `${skillMetrics.openings}%` }} />
                          </div>
                        </div>

                        {/* Endgames */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-200 font-medium">Finales</span>
                            <div className="flex items-center gap-3">
                              <span className={`font-bold ${skillMetrics.endgames >= 70 ? 'text-green-400' : skillMetrics.endgames >= 50 ? 'text-blue-400' : 'text-orange-400'}`}>
                                {skillMetrics.endgames}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                skillMetrics.endgames >= 70 ? 'text-green-400 bg-green-500/20' :
                                skillMetrics.endgames >= 50 ? 'text-blue-400 bg-blue-500/20' :
                                'text-orange-400 bg-orange-500/20'
                              }`}>
                                {skillMetrics.endgames >= 70 ? 'Fuerte' : skillMetrics.endgames >= 50 ? 'Mejorando' : 'Necesita trabajo'}
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${
                              skillMetrics.endgames >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                              skillMetrics.endgames >= 50 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                              'bg-gradient-to-r from-orange-500 to-red-500'
                            }`} style={{ width: `${skillMetrics.endgames}%` }} />
                          </div>
                        </div>

                        {/* Tactics */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-200 font-medium">Táctica</span>
                            <div className="flex items-center gap-3">
                              <span className={`font-bold ${skillMetrics.tactics >= 70 ? 'text-green-400' : skillMetrics.tactics >= 50 ? 'text-blue-400' : 'text-orange-400'}`}>
                                {skillMetrics.tactics}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                skillMetrics.tactics >= 70 ? 'text-green-400 bg-green-500/20' :
                                skillMetrics.tactics >= 50 ? 'text-blue-400 bg-blue-500/20' :
                                'text-orange-400 bg-orange-500/20'
                              }`}>
                                {skillMetrics.tactics >= 70 ? 'Fuerte' : skillMetrics.tactics >= 50 ? 'Mejorando' : 'Necesita trabajo'}
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${
                              skillMetrics.tactics >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                              skillMetrics.tactics >= 50 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                              'bg-gradient-to-r from-orange-500 to-red-500'
                            }`} style={{ width: `${skillMetrics.tactics}%` }} />
                          </div>
                        </div>

                        {/* Middlegame */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-200 font-medium">Medio Juego</span>
                            <div className="flex items-center gap-3">
                              <span className={`font-bold ${skillMetrics.middlegame >= 70 ? 'text-green-400' : skillMetrics.middlegame >= 50 ? 'text-blue-400' : 'text-orange-400'}`}>
                                {skillMetrics.middlegame}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                skillMetrics.middlegame >= 70 ? 'text-green-400 bg-green-500/20' :
                                skillMetrics.middlegame >= 50 ? 'text-blue-400 bg-blue-500/20' :
                                'text-orange-400 bg-orange-500/20'
                              }`}>
                                {skillMetrics.middlegame >= 70 ? 'Fuerte' : skillMetrics.middlegame >= 50 ? 'Mejorando' : 'Necesita trabajo'}
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${
                              skillMetrics.middlegame >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                              skillMetrics.middlegame >= 50 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                              'bg-gradient-to-r from-orange-500 to-red-500'
                            }`} style={{ width: `${skillMetrics.middlegame}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Study Recommendations */}
                    <div className="space-y-4">
                      {recommendations.map((rec) => {
                        const priorityConfig = {
                          high: {
                            bgGradient: 'from-red-600/20 to-orange-600/20',
                            border: 'border-2 border-red-500/50',
                            textColor: 'text-red-200',
                            badge: 'bg-red-500/30 text-red-200',
                            badgeText: 'PRIORIDAD ALTA',
                            icon: '⚠️',
                            primaryButton: 'bg-red-500 hover:bg-red-600'
                          },
                          medium: {
                            bgGradient: 'from-blue-600/20 to-purple-600/20',
                            border: 'border border-blue-500/50',
                            textColor: 'text-blue-200',
                            badge: 'bg-blue-500/30 text-blue-200',
                            badgeText: 'RECOMENDADO',
                            icon: '🎯',
                            primaryButton: 'bg-blue-500 hover:bg-blue-600'
                          },
                          low: {
                            bgGradient: 'from-slate-800/50 to-slate-800/50',
                            border: 'border border-slate-700',
                            textColor: 'text-slate-400',
                            badge: 'bg-slate-600/50 text-slate-300',
                            badgeText: 'OPCIONAL',
                            icon: '📖',
                            primaryButton: 'bg-purple-500 hover:bg-purple-600'
                          }
                        };

                        const config = priorityConfig[rec.priority];

                        return (
                          <div key={rec.id} className={`bg-gradient-to-br ${config.bgGradient} rounded-xl p-6 ${config.border}`}>
                            <div className="flex items-start gap-4">
                              <div className="text-4xl">{config.icon}</div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <h4 className="text-xl font-bold text-white mb-1">{rec.title}</h4>
                                    <p className={`${config.textColor} text-sm`}>
                                      <span className="font-semibold">Por qué:</span> {rec.reason}
                                    </p>
                                  </div>
                                  <span className={`px-3 py-1 ${config.badge} rounded-full text-xs font-bold whitespace-nowrap`}>
                                    {config.badgeText}
                                  </span>
                                </div>
                                <p className="text-slate-200 mb-4">
                                  {rec.description}
                                </p>
                                <div className="flex gap-3">
                                  <button className={`flex-1 ${config.primaryButton} text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2`}>
                                    <span>👉</span> {rec.actionLabel}
                                  </button>
                                  <button className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-all">
                                    {rec.secondaryActionLabel}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Study Tips */}
                    <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-xl p-6 border border-purple-500/50">
                      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <span>💡</span> Consejo del Coach
                      </h3>
                      <p className="text-slate-200 leading-relaxed">
                        {studyRecommendationService.getCoachTip(skillMetrics)}
                      </p>
                    </div>
                  </div>
                )}

                {/* AI Feedback Tab */}
                {activeTab === 'feedback' && coachFeedback && (
                  <div className="space-y-6">
                    {/* Summary Card */}
                    <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-xl p-6 border border-purple-500/50">
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">🎯</div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-2">Resumen del Coach</h3>
                          <p className="text-slate-200 leading-relaxed">{coachFeedback.summary}</p>
                        </div>
                      </div>
                    </div>

                    {/* Key Insights */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span>💎</span> Insights Clave
                      </h3>
                      <div className="space-y-3">
                        {coachFeedback.keyInsights.map((insight, idx) => (
                          <div key={idx} className="flex items-start gap-3 bg-slate-900/50 rounded-lg p-4">
                            <span className="text-blue-400 font-bold text-lg">{idx + 1}.</span>
                            <p className="text-slate-200 flex-1">{insight}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Training Plan */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span>📚</span> Plan de Entrenamiento
                      </h3>
                      <div className="space-y-3">
                        {coachFeedback.trainingPlan.map((task, idx) => (
                          <div key={idx} className="flex items-start gap-3 bg-gradient-to-r from-green-900/20 to-blue-900/20 rounded-lg p-4 border border-green-700/30">
                            <span className="text-green-400 text-xl">✓</span>
                            <p className="text-slate-200 flex-1">{task}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Detailed Analysis */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span>🔍</span> Análisis Profundo
                      </h3>
                      <div className="text-slate-300 leading-relaxed whitespace-pre-line">
                        {coachFeedback.detailedAnalysis}
                      </div>
                    </div>

                    {/* Motivational Message */}
                    <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-xl p-6 border border-yellow-500/50 text-center">
                      <div className="text-3xl mb-3">✨</div>
                      <p className="text-lg text-slate-100 font-medium italic">
                        "{coachFeedback.motivationalMessage}"
                      </p>
                    </div>
                  </div>
                )}

                {/* Analysis Tab */}
                {activeTab === 'analysis' && (
                  <>
                    {/* Summary Stats */}
                    <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="text-center">
                          <div className="text-5xl font-bold text-purple-400 mb-2">{accuracy}%</div>
                          <div className="text-slate-400">Precisión</div>
                        </div>
                        <div className="text-center">
                          <div className="text-5xl font-bold text-blue-400 mb-2">{analysis.length}</div>
                          <div className="text-slate-400">Movimientos</div>
                        </div>
                        <div className="text-center">
                          <div className="text-5xl font-bold text-green-400 mb-2">
                            {analysis.filter(a => a.classification === 'excellent' || a.classification === 'good').length}
                          </div>
                          <div className="text-slate-400">Buenos</div>
                        </div>
                        <div className="text-center">
                          <div className="text-5xl font-bold text-red-400 mb-2">
                            {analysis.filter(a => a.classification === 'blunder').length}
                          </div>
                          <div className="text-slate-400">Blunders</div>
                        </div>
                      </div>
                    </div>

                    {/* Move-by-move analysis */}
                    <div className="space-y-3">
                      <h3 className="text-xl font-bold text-white mb-4">Análisis Movimiento por Movimiento</h3>
                      {analysis.map((moveAnalysis, index) => (
                        <div
                          key={index}
                          className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-all"
                        >
                          <div className="flex items-start gap-4">
                            <div className={`text-3xl font-bold ${getClassificationColor(moveAnalysis.classification)}`}>
                              {getClassificationIcon(moveAnalysis.classification)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-lg font-bold text-white">
                                  {moveAnalysis.moveNumber}. {moveAnalysis.notation}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  moveAnalysis.classification === 'excellent' ? 'bg-green-500/20 text-green-400' :
                                  moveAnalysis.classification === 'good' ? 'bg-blue-500/20 text-blue-400' :
                                  moveAnalysis.classification === 'inaccuracy' ? 'bg-yellow-500/20 text-yellow-400' :
                                  moveAnalysis.classification === 'mistake' ? 'bg-orange-500/20 text-orange-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {moveAnalysis.classification.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-slate-300">{moveAnalysis.comment}</p>
                              {moveAnalysis.evaluationChange !== undefined && (
                                <div className="mt-2 text-sm text-slate-400">
                                  Evaluación: {moveAnalysis.evaluation > 0 ? '+' : ''}{(moveAnalysis.evaluation / 100).toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Profile Tab */}
                {activeTab === 'profile' && profile && (
                  <div className="space-y-6">
                    {/* Profile Header */}
                    <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-xl p-6 border border-purple-500/50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                          <span>👤</span> Tu Perfil de Jugador
                        </h3>
                        <span className="text-4xl">{getTrendIcon(profile)}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-purple-400">{profile.totalGames}</div>
                          <div className="text-slate-400 text-sm">Partidas Jugadas</div>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-blue-400">{profile.averageAccuracy}%</div>
                          <div className="text-slate-400 text-sm">Precisión Promedio</div>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-green-400">{profile.totalMoves}</div>
                          <div className="text-slate-400 text-sm">Movimientos Totales</div>
                        </div>
                      </div>
                    </div>

                    {/* Achievements Gallery */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <span>🏆</span> Logros y Badges
                        </h3>
                        <div className="text-sm text-slate-400">
                          {achievementService.getStats(profile).unlocked} / {achievementService.getStats(profile).total}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-6">
                        <div className="flex justify-between text-xs text-slate-400 mb-2">
                          <span>Progreso de Logros</span>
                          <span>{achievementService.getStats(profile).percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-blue-500 h-full transition-all duration-500"
                            style={{ width: `${achievementService.getStats(profile).percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Achievement Grid */}
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                        {achievementService.getAllAchievements().map((achievement) => {
                          const unlocked = (profile.achievements || []).find(
                            a => a.achievementId === achievement.id
                          );

                          return (
                            <AchievementBadge
                              key={achievement.id}
                              achievementId={achievement.id}
                              unlockedAt={unlocked?.unlockedAt}
                              isLocked={!unlocked}
                              showUnlockDate={false}
                              size="medium"
                              onShare={unlocked ? () => {
                                setShareModal({
                                  type: 'achievement',
                                  data: {
                                    achievement,
                                    unlockedAt: unlocked.unlockedAt,
                                    profile
                                  }
                                });
                              } : undefined}
                            />
                          );
                        })}
                      </div>

                      {/* Stats by Category */}
                      <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
                        {Object.entries(achievementService.getStats(profile).byCategory).map(([category, stats]) => (
                          <div key={category} className="bg-slate-900/50 rounded-lg p-3 text-center">
                            <div className="text-sm text-slate-400 capitalize">{category}</div>
                            <div className="text-lg font-bold text-white">
                              {stats.unlocked}/{stats.total}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Strengths */}
                    {profile.strengths.length > 0 && (
                      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                          <span>💪</span> Tus Fortalezas
                        </h3>
                        <div className="flex flex-wrap gap-3">
                          {profile.strengths.map((strength, idx) => (
                            <span key={idx} className="px-4 py-2 bg-green-600/20 text-green-400 rounded-full border border-green-600/50 font-medium">
                              {strength}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Weaknesses */}
                    {profile.weaknesses.length > 0 && (
                      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                          <span>🎯</span> Áreas de Mejora
                        </h3>
                        <div className="space-y-3">
                          {profile.weaknesses.map((weakness, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-4">
                              <div>
                                <div className="text-slate-200 font-medium">{weakness.description}</div>
                                <div className="text-slate-500 text-sm mt-1">Tipo: {weakness.type}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-orange-400 font-bold">{weakness.occurrences}x</div>
                                <div className="text-slate-500 text-xs">ocurrencias</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Progress Chart */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span>📊</span> Gráfico de Progreso
                      </h3>
                      <ProgressChart gameHistory={profile.gameHistory} />
                    </div>

                    {/* Recent History */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span>📜</span> Historial Detallado
                      </h3>
                      <div className="space-y-2">
                        {profile.gameHistory.slice(0, 10).map((game, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3">
                            <div className="flex items-center gap-3">
                              <span className="text-slate-500 font-mono text-sm">#{profile.gameHistory.length - idx}</span>
                              <span className={`w-3 h-3 rounded-full ${game.playerColor === 'white' ? 'bg-slate-300' : 'bg-slate-700'}`}></span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`font-bold ${
                                game.accuracy >= 80 ? 'text-green-400' :
                                game.accuracy >= 60 ? 'text-blue-400' :
                                'text-orange-400'
                              }`}>
                                {game.accuracy}%
                              </span>
                              <span className="text-slate-500 text-sm">
                                {new Date(game.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Achievement Notifications */}
      {currentNotification && (
        <AchievementNotification
          achievementId={currentNotification}
          onClose={() => {
            // Remove current notification
            setCurrentNotification(null);

            // Show next notification if any
            const currentIndex = newAchievements.findIndex(
              a => a.achievementId === currentNotification
            );

            if (currentIndex >= 0 && currentIndex < newAchievements.length - 1) {
              setTimeout(() => {
                setCurrentNotification(newAchievements[currentIndex + 1].achievementId);
              }, 500);
            }
          }}
        />
      )}

      {/* Social Share Modal */}
      {shareModal && (
        <SocialShareModal
          type={shareModal.type}
          data={shareModal.data}
          onClose={() => setShareModal(null)}
        />
      )}
    </div>
  );
}
