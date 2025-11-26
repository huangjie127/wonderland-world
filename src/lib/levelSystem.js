export const LEVEL_THRESHOLDS = [
  { level: 1, minPoints: 0, title: "新生的火苗" },
  { level: 2, minPoints: 50, title: "萌芽的轮廓" },
  { level: 3, minPoints: 120, title: "逐光行者" },
  { level: 4, minPoints: 200, title: "织梦旅人" },
  { level: 5, minPoints: 320, title: "世界书写者" },
  { level: 6, minPoints: 500, title: "灵魂塑造者" },
  { level: 7, minPoints: 750, title: "叙事编织者" },
  { level: 8, minPoints: 1100, title: "多元宇宙行者" },
  { level: 9, minPoints: 1600, title: "群星的主人" },
  { level: 10, minPoints: 2300, title: "世界的缔造者" },
];

export const POINT_REWARDS = {
  LOGIN: 5,
  COMMENT: 2,
  POST: 4,
  EVENT: 8,
};

export function getLevelInfo(points) {
  // Find the highest level where minPoints <= points
  // Reverse the array to find the highest match first, or just findLast (if supported)
  // Since array is sorted, we can iterate backwards
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i].minPoints) {
      return LEVEL_THRESHOLDS[i];
    }
  }
  return LEVEL_THRESHOLDS[0];
}

export function getNextLevelInfo(currentLevel) {
  const nextLevel = LEVEL_THRESHOLDS.find((l) => l.level === currentLevel + 1);
  return nextLevel || null;
}
