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
    small: 'w-16 h-16 text-2xl',
    medium: 'w-24 h-24 text-4xl',
    large: 'w-32 h-32 text-5xl'
  };

  const rarityGlow = {
    common: 'shadow-slate-500/50',
    rare: 'shadow-blue-500/50',
    epic: 'shadow-purple-500/50',
    legendary: 'shadow-yellow-500/50 animate-pulse'
  };

  return (
    <div className="flex flex-col items-center gap-2 group">
      {/* Badge Circle */}
      <div
        className={`
          ${sizeClasses[size]}
          rounded-full
          border-4
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
            absolute -top-2 -right-2
            w-6 h-6
            rounded-full
            ${achievement.rarity === 'legendary' ? 'bg-yellow-500' :
              achievement.rarity === 'epic' ? 'bg-purple-500' :
              achievement.rarity === 'rare' ? 'bg-blue-500' :
              'bg-slate-500'}
            border-2 border-slate-900
            text-white text-xs
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
      <div className="text-center max-w-[120px]">
        <div className={`font-bold text-sm ${isLocked ? 'text-slate-500' : 'text-white'}`}>
          {isLocked ? '???' : achievement.name}
        </div>

        <div className="text-xs text-slate-400 mt-1">
          {isLocked ? 'Bloqueado' : achievementService.getRarityLabel(achievement.rarity)}
        </div>

        {!isLocked && unlockedAt && showUnlockDate && (
          <div className="text-xs text-slate-500 mt-1">
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
            className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-full transition-all opacity-0 group-hover:opacity-100"
          >
            📤 Compartir
          </button>
        )}
      </div>

      {/* Tooltip on hover */}
      <div className="
        absolute
        bottom-full
        mb-2
        left-1/2
        transform -translate-x-1/2
        bg-slate-800
        border border-slate-700
        rounded-lg
        px-4 py-3
        opacity-0 group-hover:opacity-100
        transition-opacity
        pointer-events-none
        z-50
        w-64
        shadow-xl
      ">
        <div className="text-white font-bold text-sm mb-1">
          {isLocked ? '???' : achievement.name}
        </div>
        <div className="text-slate-300 text-xs mb-2">
          {isLocked ? 'Sigue jugando para descubrir este logro' : achievement.description}
        </div>
        {!isLocked && achievement.reward && (
          <div className="text-purple-400 text-xs italic">
            🎁 {achievement.reward}
          </div>
        )}
      </div>
    </div>
  );
}
