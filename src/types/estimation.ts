export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

export interface DifficultyEstimate {
  score: number;
  level: DifficultyLevel;
  estimatedMinutes: number;
  factors: {
    totalCells: number;
    uniqueColors: number;
    totalRegions: number;
    smallRegions: number;
    averageRegionSize: number;
    largestRegionRatio: number;
    externalCells: number;
  };
  generatedAt: string;
}
