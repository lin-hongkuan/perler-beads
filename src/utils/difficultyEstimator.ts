import { MappedPixel } from './pixelation';
import { DifficultyEstimate, DifficultyLevel } from '../types/estimation';

interface RegionStats {
  totalRegions: number;
  smallRegions: number;
  largestRegionSize: number;
}

function getRegionStats(pixelData: MappedPixel[][]): RegionStats {
  const rows = pixelData.length;
  const cols = pixelData[0]?.length ?? 0;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  let totalRegions = 0;
  let smallRegions = 0;
  let largestRegionSize = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const start = pixelData[row][col];
      if (!start || start.isExternal || visited[row][col]) continue;

      totalRegions++;
      let regionSize = 0;
      const stack = [{ row, col }];
      visited[row][col] = true;

      while (stack.length > 0) {
        const current = stack.pop()!;
        regionSize++;

        const neighbors = [
          { row: current.row - 1, col: current.col },
          { row: current.row + 1, col: current.col },
          { row: current.row, col: current.col - 1 },
          { row: current.row, col: current.col + 1 }
        ];

        neighbors.forEach(next => {
          if (next.row < 0 || next.row >= rows || next.col < 0 || next.col >= cols || visited[next.row][next.col]) return;
          const cell = pixelData[next.row][next.col];
          if (!cell || cell.isExternal || cell.color.toUpperCase() !== start.color.toUpperCase()) return;
          visited[next.row][next.col] = true;
          stack.push(next);
        });
      }

      if (regionSize <= 3) smallRegions++;
      largestRegionSize = Math.max(largestRegionSize, regionSize);
    }
  }

  return { totalRegions, smallRegions, largestRegionSize };
}

function getLevel(score: number): DifficultyLevel {
  if (score < 30) return 'easy';
  if (score < 55) return 'medium';
  if (score < 78) return 'hard';
  return 'expert';
}

export function getDifficultyLabel(level: DifficultyLevel): string {
  switch (level) {
    case 'easy':
      return '简单';
    case 'medium':
      return '中等';
    case 'hard':
      return '困难';
    case 'expert':
      return '专家';
  }
}

export function estimateDifficulty(pixelData: MappedPixel[][] | null): DifficultyEstimate | null {
  if (!pixelData || pixelData.length === 0 || !pixelData[0]?.length) return null;

  const colors = new Set<string>();
  let totalCells = 0;
  let externalCells = 0;

  pixelData.forEach(row => {
    row.forEach(cell => {
      if (!cell || cell.isExternal) {
        externalCells++;
        return;
      }
      colors.add(cell.color.toUpperCase());
      totalCells++;
    });
  });

  if (totalCells === 0) return null;

  const { totalRegions, smallRegions, largestRegionSize } = getRegionStats(pixelData);
  const averageRegionSize = totalRegions > 0 ? totalCells / totalRegions : totalCells;
  const largestRegionRatio = largestRegionSize / totalCells;

  const colorScore = Math.min(24, colors.size * 1.8);
  const regionScore = Math.min(30, (totalRegions / Math.max(1, totalCells)) * 180);
  const smallRegionScore = Math.min(24, (smallRegions / Math.max(1, totalRegions)) * 60);
  const sizeScore = Math.min(18, totalCells / 180);
  const dominantPenalty = Math.max(0, 12 - largestRegionRatio * 18);
  const score = Math.round(Math.min(100, colorScore + regionScore + smallRegionScore + sizeScore + dominantPenalty));

  const estimatedMinutes = Math.max(
    5,
    Math.round(totalCells * 0.12 + colors.size * 2 + totalRegions * 0.45 + smallRegions * 0.7)
  );

  return {
    score,
    level: getLevel(score),
    estimatedMinutes,
    factors: {
      totalCells,
      uniqueColors: colors.size,
      totalRegions,
      smallRegions,
      averageRegionSize: Math.round(averageRegionSize * 10) / 10,
      largestRegionRatio: Math.round(largestRegionRatio * 100) / 100,
      externalCells
    },
    generatedAt: new Date().toISOString()
  };
}
