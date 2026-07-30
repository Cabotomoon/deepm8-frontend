/**
 * Training Modules Registry
 *
 * Maps stable module ids (shared with StudyRecommendation ids) to a
 * TrainingModule. Modules reuse category-level theory content, so there
 * is no content duplication. Any recommendation id resolves to a module;
 * unknown ids fall back to a generic module for the matching category.
 */

import type {
  TrainingModule,
  TrainingCategory
} from '../types/training.types';
import { getLessonsForCategory } from './trainingContent';

interface ModuleMeta {
  id: string;
  category: TrainingCategory;
  title: string;
  subtitle: string;
  icon: string;
  theme: string;
}

/** Metadata for known recommendation ids (from studyRecommendationService) */
const MODULE_META: ModuleMeta[] = [
  // High-priority recommendation ids
  { id: 'endgame-basics', category: 'endgames', title: 'Finales Básicos de Peones', subtitle: 'Convierte ventajas mínimas en victorias', icon: '♟️', theme: 'finales de peones' },
  { id: 'tactical-basics', category: 'tactics', title: 'Táctica Básica: Visión de Amenazas', subtitle: 'Reduce errores graves y ve las amenazas', icon: '⚔️', theme: 'táctica básica' },
  { id: 'opening-principles', category: 'openings', title: 'Principios de Apertura', subtitle: 'Desarrollo, centro y seguridad del rey', icon: '📖', theme: 'principios de apertura' },
  // Medium-priority
  { id: 'advanced-tactics', category: 'tactics', title: 'Táctica Avanzada: Clavadas y Enfiladas', subtitle: 'Patrones avanzados de ataque', icon: '⚔️', theme: 'clavadas y enfiladas' },
  { id: 'middlegame-plans', category: 'middlegame', title: 'Planes en el Medio Juego', subtitle: 'Crea y ejecuta planes estratégicos', icon: '🎯', theme: 'planes estratégicos' },
  { id: 'rook-endgames', category: 'endgames', title: 'Finales de Torre', subtitle: 'Los finales más comunes de la práctica', icon: '♜', theme: 'finales de torre' },
  // Low-priority / expansion
  { id: 'sicilian-najdorf', category: 'openings', title: 'Defensa Siciliana - Najdorf', subtitle: 'Una defensa agresiva contra 1.e4', icon: '📖', theme: 'defensa siciliana' },
  { id: 'tactical-patterns', category: 'tactics', title: 'Patrones Tácticos Avanzados', subtitle: 'Combinaciones y sacrificios', icon: '⚔️', theme: 'patrones tácticos avanzados' },
  { id: 'chess-strategy', category: 'middlegame', title: 'Estrategia de Ajedrez', subtitle: 'Estructura de peones y piezas malas', icon: '🎯', theme: 'estrategia posicional' }
];

/** Generic per-category modules (used from the permanent menu section) */
const CATEGORY_META: Record<TrainingCategory, ModuleMeta> = {
  openings: { id: 'cat-openings', category: 'openings', title: 'Aperturas', subtitle: 'Fundamentos de apertura', icon: '📖', theme: 'principios de apertura' },
  tactics: { id: 'cat-tactics', category: 'tactics', title: 'Táctica', subtitle: 'Patrones tácticos esenciales', icon: '⚔️', theme: 'táctica' },
  endgames: { id: 'cat-endgames', category: 'endgames', title: 'Finales', subtitle: 'Técnica de finales', icon: '♟️', theme: 'finales' },
  middlegame: { id: 'cat-middlegame', category: 'middlegame', title: 'Medio Juego', subtitle: 'Estrategia y planes', icon: '🎯', theme: 'medio juego' }
};

function buildModule(meta: ModuleMeta): TrainingModule {
  return {
    id: meta.id,
    category: meta.category,
    title: meta.title,
    subtitle: meta.subtitle,
    icon: meta.icon,
    theme: meta.theme,
    lessons: getLessonsForCategory(meta.category)
  };
}

/** Resolve a module by recommendation id, or fall back by category */
export function getModule(
  id: string,
  fallbackCategory: TrainingCategory = 'tactics'
): TrainingModule {
  const meta = MODULE_META.find(m => m.id === id);
  if (meta) return buildModule(meta);
  return buildModule(CATEGORY_META[fallbackCategory]);
}

/** Get the generic module for a category (permanent menu) */
export function getCategoryModule(category: TrainingCategory): TrainingModule {
  return buildModule(CATEGORY_META[category]);
}

/** All category modules (for the Teoría / Puzzles menus) */
export function getAllCategoryModules(): TrainingModule[] {
  return (Object.keys(CATEGORY_META) as TrainingCategory[]).map(getCategoryModule);
}

/** Category display metadata for menus */
export const CATEGORY_DISPLAY = CATEGORY_META;
