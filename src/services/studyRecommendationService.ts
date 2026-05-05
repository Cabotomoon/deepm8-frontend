/**
 * Study Recommendation Service
 * Generates smart study recommendations based on real game analysis
 */

import type { PlayerProfile, GameRecord } from './playerProfileService';

export interface SkillMetrics {
  openings: number; // 0-100
  endgames: number; // 0-100
  tactics: number; // 0-100
  middlegame: number; // 0-100
}

export interface StudyRecommendation {
  id: string;
  title: string;
  description: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  category: 'openings' | 'endgames' | 'tactics' | 'middlegame';
  actionLabel: string;
  secondaryActionLabel: string;
}

export interface WeeklyGoal {
  modulesCompleted: number;
  modulesTotal: number;
  skillImprovement: {
    target: number;
    current: number;
    skill: string;
  };
  daysActive: number;
  daysTotal: number;
}

class StudyRecommendationService {
  /**
   * Calculate skill metrics from player profile
   * FIXED: Now works with PlayerProfile type and uses gameHistory from profile
   */
  calculateSkillMetrics(profile: PlayerProfile): SkillMetrics {
    const gameHistory = profile.gameHistory || [];

    // 🛡️ Si no hay partidas, retornar valores neutrales
    if (gameHistory.length === 0) {
      console.warn('⚠️ No hay historial de partidas, usando valores por defecto');
      return {
        openings: 50,
        endgames: 50,
        tactics: 50,
        middlegame: 50
      };
    }

    // Usar últimas 10 partidas para métricas
    const recentGames = gameHistory.slice(-10);
    const totalGames = gameHistory.length;

    console.log(`📊 Calculando métricas desde ${recentGames.length} partidas recientes (total: ${totalGames})`);

    // 1. Analizar WIN RATE
    const wins = recentGames.filter(g => g.result === 'win').length;
    const winRate = (wins / recentGames.length) * 100;

    // 2. Analizar duración de partidas (estimada por número de movimientos)
    // Partidas cortas (<15 movimientos) = problemas en apertura/táctica
    const shortGames = recentGames.filter(g => g.totalMoves < 15).length;
    const longGames = recentGames.filter(g => g.totalMoves > 40).length;

    // 3. Calcular OPENING SCORE
    // Si muchas partidas cortas (perdidas rápidas) = problemas en apertura
    const openingScore = Math.max(30, Math.min(85, 75 - (shortGames * 8)));

    // 4. Calcular TACTICS SCORE
    // Basado en win rate y número de blunders
    const avgBlunders = recentGames.reduce((sum, g) => sum + g.blunders, 0) / recentGames.length;
    const tacticsScore = Math.max(40, Math.min(90, 70 + (winRate * 0.3) - (avgBlunders * 5)));

    // 5. Calcular ENDGAME SCORE
    // Partidas largas (>40 movimientos) con derrota = problemas en finales
    const longLosses = longGames.filter(g => g.result === 'loss').length;
    const endgameScore = Math.max(35, Math.min(80, 70 - (longLosses * 10)));

    // 6. Calcular MIDDLEGAME SCORE
    // Basado en accuracy promedio y win rate general
    const avgAccuracy = profile.averageAccuracy || 50;
    const middlegameScore = Math.max(45, Math.min(85, avgAccuracy * 0.6 + (winRate * 0.3)));

    const metrics = {
      openings: Math.round(openingScore),
      endgames: Math.round(endgameScore),
      tactics: Math.round(tacticsScore),
      middlegame: Math.round(middlegameScore)
    };

    console.log('📈 Métricas calculadas:', metrics);
    return metrics;
  }

  /**
   * Generate prioritized study recommendations
   * FIXED: Now works with PlayerProfile type
   */
  generateRecommendations(
    profile: PlayerProfile,
    metrics: SkillMetrics
  ): StudyRecommendation[] {
    const gameHistory = profile.gameHistory || [];
    const recommendations: StudyRecommendation[] = [];

    console.log('🎯 Generando recomendaciones con métricas:', metrics);

    // 🛡️ Safety check: Si metrics es undefined, usar valores por defecto
    if (!metrics) {
      console.error('❌ Metrics is undefined! Using default values');
      metrics = {
        openings: 50,
        endgames: 50,
        tactics: 50,
        middlegame: 50
      };
    }

    // 1. Highest priority: Critical weaknesses (score < 50)
    if (metrics.endgames < 50) {
      const recentGames = gameHistory.slice(-10);
      const longGames = recentGames.filter(g => g.totalMoves > 40);
      const endgameLosses = longGames.filter(g => g.result === 'loss').length;

      recommendations.push({
        id: 'endgame-basics',
        title: 'Finales Básicos de Peones',
        description: 'Domina los finales de peones para convertir ventajas mínimas en victorias',
        reason: endgameLosses > 0
          ? `Perdiste ${endgameLosses} partida${endgameLosses > 1 ? 's' : ''} larga${endgameLosses > 1 ? 's' : ''} en tus últimas 10 partidas`
          : `Tu puntuación de finales (${metrics.endgames}) indica necesidad de refuerzo`,
        priority: 'high',
        category: 'endgames',
        actionLabel: 'Empezar Ahora',
        secondaryActionLabel: 'Ver Ejercicios'
      });
    }

    if (metrics.tactics < 50) {
      const recentGames = gameHistory.slice(-10);
      const losses = recentGames.filter(g => g.result === 'loss').length;

      recommendations.push({
        id: 'tactical-basics',
        title: 'Táctica Básica: Visión de Amenazas',
        description: 'Mejora tu cálculo táctico y reduce errores graves',
        reason: `${losses} derrotas en tus últimas 10 partidas - refuerza tu visión táctica`,
        priority: 'high',
        category: 'tactics',
        actionLabel: 'Empezar Ahora',
        secondaryActionLabel: 'Ver Ejercicios'
      });
    }

    if (metrics.openings < 50) {
      const recentGames = gameHistory.slice(-10);
      const shortLosses = recentGames.filter(g =>
        g.totalMoves < 15 && g.result === 'loss'
      ).length;

      recommendations.push({
        id: 'opening-principles',
        title: 'Principios de Apertura',
        description: 'Domina los fundamentos: desarrollo, centro y seguridad del rey',
        reason: shortLosses > 0
          ? `${shortLosses} derrota${shortLosses > 1 ? 's' : ''} rápida${shortLosses > 1 ? 's' : ''} (<15 movimientos) en tus últimas partidas`
          : `Tu puntuación de aperturas (${metrics.openings}) necesita refuerzo`,
        priority: 'high',
        category: 'openings',
        actionLabel: 'Empezar Ahora',
        secondaryActionLabel: 'Ver Teoría'
      });
    }

    // 2. Medium priority: Areas that need work (50-70)
    if (metrics.tactics >= 50 && metrics.tactics < 70 && recommendations.length < 3) {
      recommendations.push({
        id: 'advanced-tactics',
        title: 'Táctica Avanzada: Clavadas y Enfiladas',
        description: 'Refuerza tu visión táctica con patrones avanzados de ataque',
        reason: 'Buena oportunidad para consolidar tu táctica y llevarla al siguiente nivel',
        priority: 'medium',
        category: 'tactics',
        actionLabel: 'Practicar',
        secondaryActionLabel: 'Ver Ejemplos'
      });
    }

    if (metrics.middlegame >= 50 && metrics.middlegame < 65 && recommendations.length < 3) {
      recommendations.push({
        id: 'middlegame-plans',
        title: 'Planes en el Medio Juego',
        description: 'Aprende a crear y ejecutar planes estratégicos efectivos',
        reason: 'Desarrollar mejor juego posicional mejorará tu consistencia',
        priority: 'medium',
        category: 'middlegame',
        actionLabel: 'Practicar',
        secondaryActionLabel: 'Ver Ejemplos'
      });
    }

    if (metrics.endgames >= 50 && metrics.endgames < 65 && recommendations.length < 3) {
      recommendations.push({
        id: 'rook-endgames',
        title: 'Finales de Torre',
        description: 'Domina los finales de torres, los más comunes en partidas competitivas',
        reason: 'Los finales de torre aparecen en 50% de las partidas que llegan al final',
        priority: 'medium',
        category: 'endgames',
        actionLabel: 'Practicar',
        secondaryActionLabel: 'Ver Ejercicios'
      });
    }

    // 3. Low priority: Expansion areas (always fill to 3 recommendations)
    const lowPriorityOptions = [
      {
        id: 'sicilian-najdorf',
        title: 'Defensa Siciliana - Variante Najdorf',
        description: 'Aprende una de las defensas más agresivas y efectivas contra 1.e4',
        reason: 'Amplía tu repertorio de aperturas con negras',
        priority: 'low' as const,
        category: 'openings' as const,
        actionLabel: 'Explorar',
        secondaryActionLabel: 'Ver Teoría'
      },
      {
        id: 'tactical-patterns',
        title: 'Patrones Tácticos Avanzados',
        description: 'Domina combinaciones complejas y sacrificios posicionales',
        reason: 'Tu fuerte base táctica permite explorar conceptos avanzados',
        priority: 'low' as const,
        category: 'tactics' as const,
        actionLabel: 'Explorar',
        secondaryActionLabel: 'Ver Ejemplos'
      },
      {
        id: 'chess-strategy',
        title: 'Estrategia de Ajedrez',
        description: 'Comprende conceptos estratégicos: estructura de peones, piezas malas',
        reason: 'Amplía tu comprensión del juego posicional',
        priority: 'low' as const,
        category: 'middlegame' as const,
        actionLabel: 'Explorar',
        secondaryActionLabel: 'Ver Teoría'
      }
    ];

    // Agregar recomendaciones de baja prioridad hasta completar 3
    let lowPriorityIndex = 0;
    while (recommendations.length < 3 && lowPriorityIndex < lowPriorityOptions.length) {
      recommendations.push(lowPriorityOptions[lowPriorityIndex]);
      lowPriorityIndex++;
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    console.log(`✅ Generadas ${recommendations.length} recomendaciones`);

    // Return top 3 recommendations
    return recommendations.slice(0, 3);
  }

  /**
   * Get weekly goal data
   * FIXED: Now works with PlayerProfile type
   */
  getWeeklyGoal(profile: PlayerProfile, metrics: SkillMetrics): WeeklyGoal {
    const gameHistory = profile.gameHistory || [];

    // 🛡️ Safety check
    if (!metrics) {
      metrics = {
        openings: 50,
        endgames: 50,
        tactics: 50,
        middlegame: 50
      };
    }

    // Find lowest skill for improvement target
    const skills = Object.entries(metrics) as [keyof SkillMetrics, number][];
    const lowestSkill = skills.reduce((min, [skill, score]) =>
      score < min.score ? { skill, score } : min,
      { skill: skills[0][0], score: skills[0][1] }
    );

    const skillNames: Record<keyof SkillMetrics, string> = {
      openings: 'aperturas',
      endgames: 'finales',
      tactics: 'táctica',
      middlegame: 'medio juego'
    };

    // Calculate modules completed (based on games played this week)
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const gamesThisWeek = gameHistory.filter(g => g.timestamp >= oneWeekAgo).length;
    const modulesCompleted = Math.min(3, Math.floor(gamesThisWeek / 2)); // 2 games = 1 module

    // Calculate days active this week
    const daysWithGames = new Set(
      gameHistory
        .filter(g => g.timestamp >= oneWeekAgo)
        .map(g => new Date(g.timestamp).toDateString())
    ).size;

    return {
      modulesCompleted,
      modulesTotal: 3,
      skillImprovement: {
        target: Math.min(100, lowestSkill.score + 10),
        current: Math.min(100, lowestSkill.score + 5), // Simulated progress
        skill: skillNames[lowestSkill.skill]
      },
      daysActive: daysWithGames,
      daysTotal: 7
    };
  }

  /**
   * Get coach tip based on weakest area
   */
  getCoachTip(metrics: SkillMetrics): string {
    // 🛡️ Safety check
    if (!metrics) {
      return 'Sigue practicando para recibir consejos personalizados. ¡Cada partida es una oportunidad de aprendizaje!';
    }

    const skills = Object.entries(metrics) as [keyof SkillMetrics, number][];
    const lowestSkill = skills.reduce((min, [skill, score]) =>
      score < min.score ? { skill, score } : min,
      { skill: skills[0][0], score: skills[0][1] }
    );

    const tips: Record<keyof SkillMetrics, string> = {
      endgames: 'Enfócate en dominar finales básicos esta semana. Dedica 20 minutos diarios a resolver posiciones de finales de peones. Esto te ayudará a convertir más partidas igualadas en victorias.',
      tactics: 'Practica 15-20 minutos diarios de puzzles tácticos. Empieza con patrones simples (horquillas, clavadas) y verifica cada cálculo dos veces antes de ejecutar.',
      openings: 'Aprende los principios de apertura antes de memorizar variantes. Enfócate en: desarrollar piezas rápido, controlar el centro, y enrocar temprano.',
      middlegame: 'Mejora tu juego posicional creando planes concretos. Pregúntate en cada turno: ¿Cuál es mi peor pieza? ¿Cómo puedo mejorarla?'
    };

    return tips[lowestSkill.skill];
  }
}

export const studyRecommendationService = new StudyRecommendationService();
