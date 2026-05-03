/**
 * Achievements Grid Component
 * Displays all achievements in a grid layout
 */

import { useEffect, useState } from 'react';
import AchievementBadge from './AchievementBadge';
import { achievementService, type Achievement } from '../services/achievementService';
import type { UnlockedAchievement } from '../services/playerProfileService';

interface AchievementsGridProps {
  unlockedAchievements: UnlockedAchievement[];
  size?: 'small' | 'medium' | 'large';
}

export default function AchievementsGrid({ unlockedAchievements, size = 'medium' }: AchievementsGridProps) {
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    const achievements = achievementService.getAllAchievements();
    setAllAchievements(achievements);
  }, []);

  const unlockedIds = new Set(unlockedAchievements.map(a => a.achievementId));

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
      {allAchievements.map((achievement) => {
        const unlocked = unlockedIds.has(achievement.id);
        const unlockedData = unlockedAchievements.find(a => a.achievementId === achievement.id);

        return (
          <AchievementBadge
            key={achievement.id}
            achievementId={achievement.id}
            unlockedAt={unlockedData?.unlockedAt}
            isLocked={!unlocked}
            size={size}
          />
        );
      })}
    </div>
  );
}
