/**
 * Achievement Unlock Notification
 * Shows animated notification when achievement is unlocked
 */

import { useEffect, useState } from 'react';
import { achievementService, type Achievement } from '../services/achievementService';

interface AchievementNotificationProps {
  achievementId: string;
  onClose: () => void;
  autoCloseDelay?: number;
}

export default function AchievementNotification({
  achievementId,
  onClose,
  autoCloseDelay = 5000
}: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const achievement = achievementService.getAchievement(achievementId);

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 100);

    // Auto close
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for animation
    }, autoCloseDelay);

    return () => clearTimeout(timer);
  }, [autoCloseDelay, onClose]);

  if (!achievement) {
    return null;
  }

  const rarityColors = {
    common: 'from-slate-600 to-slate-700',
    rare: 'from-blue-600 to-blue-700',
    epic: 'from-purple-600 to-purple-700',
    legendary: 'from-yellow-600 via-yellow-500 to-orange-600'
  };

  const rarityGlow = {
    common: 'shadow-slate-500/50',
    rare: 'shadow-blue-500/50',
    epic: 'shadow-purple-500/50',
    legendary: 'shadow-yellow-500/50'
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-[9999]
        transform transition-all duration-500 ease-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'}
      `}
    >
      <div
        className={`
          bg-gradient-to-br ${rarityColors[achievement.rarity]}
          border-2 border-white/30
          rounded-xl
          p-6
          ${rarityGlow[achievement.rarity]} shadow-2xl
          ${achievement.rarity === 'legendary' ? 'animate-pulse' : ''}
          max-w-sm
          backdrop-blur-lg
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-white/90 text-sm font-semibold uppercase tracking-wider">
            Logro Desbloqueado!
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="text-white/70 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Achievement Icon & Info */}
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={`
            text-6xl
            ${achievement.rarity === 'legendary' ? 'animate-bounce' : ''}
          `}>
            {achievement.icon}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="text-white font-bold text-xl mb-1">
              {achievement.name}
            </div>
            <div className="text-white/80 text-sm mb-2">
              {achievement.description}
            </div>
            <div className="inline-block px-2 py-1 bg-white/20 rounded text-xs text-white font-semibold">
              {achievementService.getRarityLabel(achievement.rarity)}
            </div>
          </div>
        </div>

        {/* Reward */}
        {achievement.reward && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="text-white/90 text-sm italic flex items-center gap-2">
              <span>🎁</span>
              <span>{achievement.reward}</span>
            </div>
          </div>
        )}

        {/* Sparkle Effects for Legendary */}
        {achievement.rarity === 'legendary' && (
          <>
            <div className="absolute top-2 left-2 text-yellow-300 animate-ping">✨</div>
            <div className="absolute top-2 right-2 text-yellow-300 animate-ping" style={{ animationDelay: '0.3s' }}>✨</div>
            <div className="absolute bottom-2 left-2 text-yellow-300 animate-ping" style={{ animationDelay: '0.6s' }}>✨</div>
            <div className="absolute bottom-2 right-2 text-yellow-300 animate-ping" style={{ animationDelay: '0.9s' }}>✨</div>
          </>
        )}
      </div>
    </div>
  );
}
