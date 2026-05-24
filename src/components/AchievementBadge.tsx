/**
 * Achievement Badge Component
 * Displays individual achievement with visual effects
 */

import { achievementService, type Achievement } from '../services/achievementService';

interface AchievementBadgeProps {
  achievementId: string;
  unlockedAt?: number;
  isLocked?: boolean;
  showUnlockDate?: boolean;
  size?: 'small' | 'medium' | 'large';
  onShare?: () => void; // Callback for share button
}

export default function AchievementBadge({
  achievementId,
  unlockedAt,
  isLocked = false,
  showUnlockDate = true,
  size = 'medium',
  onShare
}: AchievementBadgeProps) {
  const achievement = achievementService.getAchievement(achievementId);

  if (!achievement) {
    return null;
  }

  const sizeClasses = {
    small: 'w-12 h-12 sm:w-16 sm:h-16 text-xl sm:text-2xl',
    medium: 'w-16 h-16 sm:w-24 sm:h-24 text-2xl sm:text-4xl',
    large: 'w-20 h-20 sm:w-32 sm:h-32 text-3xl sm:text-5xl'
  };

  const rarityGlow = {
    common: 'shadow-slate-500/50',
    rare: 'shadow-blue-500/50',
    epic: 'shadow-purple-500/50',
    legendary: 'shadow-yellow-500/50 animate-pulse'
  };

  return (
    <div className="flex flex-col items-center gap-1 sm:gap-2 group relative">
      {/* Badge Circle */}
      <div
        className={`
          ${sizeClasses[size]}
          rounded-full
          border-2 sm:border-4
          ${achievementService.getRarityColor(achievement.rarity)}
          ${isLocked ? 'bg-slate-800/50 grayscale opacity-40' : `bg-gradient-to-br from-slate-800 to-slate-700 ${rarityGlow[achievement.rarity]} shadow-lg`}
          flex items-center justify-center
          transition-all duration-300
          ${!isLocked && 'hover:scale-110 hover:rotate-6'}
          relative
        `}
      >
        <span className={isLocked ? 'filter grayscale' : ''}>
          {isLocked ? '🔒' : achievement.icon}
        </span>

        {/* Rarity indicator */}
        {!isLocked && (
          <div className={`
            absolute -top-1 -right-1 sm:-top-2 sm:-right-2
            w-4 h-4 sm:w-6 sm:h-6
            rounded-full
            ${achievement.rarity === 'legendary' ? 'bg-yellow-500' :
              achievement.rarity === 'epic' ? 'bg-purple-500' :
              achievement.rarity === 'rare' ? 'bg-blue-500' :
              'bg-slate-500'}
            border border-slate-900 sm:border-2
            text-white text-[8px] sm:text-xs
            flex items-center justify-center
            font-bold
          `}>
            {achievement.rarity === 'legendary' ? 'L' :
             achievement.rarity === 'epic' ? 'E' :
             achievement.rarity === 'rare' ? 'R' : 'C'}
          </div>
        )}
      </div>

      {/* Badge Info */}
      <div className="text-center max-w-[80px] sm:max-w-[120px]">
        <div className={`font-bold text-[10px] sm:text-sm leading-tight ${isLocked ? 'text-slate-500' : 'text-white'} line-clamp-2`}>
          {isLocked ? '???' : achievement.name}
        </div>

        <div className="text-[8px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 truncate">
          {isLocked ? 'Bloqueado' : achievementService.getRarityLabel(achievement.rarity)}
        </div>

        {!isLocked && unlockedAt && showUnlockDate && (
          <div className="text-[8px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 hidden sm:block">
            {new Date(unlockedAt).toLocaleDateString()}
          </div>
        )}

        {/* Share button (only for unlocked achievements) */}
        {!isLocked && onShare && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="mt-1 sm:mt-2 px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-600 hover:bg-blue-700 text-white text-[8px] sm:text-xs rounded-full transition-all opacity-0 group-hover:opacity-100"
          >
            📤 <span className="hidden sm:inline">Compartir</span>
          </button>
        )}
      </div>

      {/* Tooltip on hover (only desktop) */}
      <div className="
        absolute
        bottom-full
        mb-2
        left-1/2
        transform -translate-x-1/2
        bg-slate-800
        border border-slate-700
        rounded-lg
        px-3 sm:px-4 py-2 sm:py-3
        opacity-0 group-hover:opacity-100
        transition-opacity
        pointer-events-none
        z-50
        w-48 sm:w-64
        shadow-xl
        hidden sm:block
      ">
        <div className="text-white font-bold text-xs sm:text-sm mb-1">
          {isLocked ? '???' : achievement.name}
        </div>
        <div className="text-slate-300 text-[10px] sm:text-xs mb-2">
          {isLocked ? 'Sigue jugando para descubrir este logro' : achievement.description}
        </div>
        {!isLocked && achievement.reward && (
          <div className="text-purple-400 text-[10px] sm:text-xs italic">
            🎁 {achievement.reward}
          </div>
        )}
      </div>
    </div>
  );
}
