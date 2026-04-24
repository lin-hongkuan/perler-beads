import { MappedPixel } from './pixelation';
import { TRANSPARENT_KEY } from './pixelEditingUtils';

export interface ColorStatsResult {
  colorCounts: { [hexKey: string]: { count: number; color: string } };
  totalCount: number;
}

export function recalculateColorStats(pixelData: MappedPixel[][]): ColorStatsResult {
  const colorCounts: { [hexKey: string]: { count: number; color: string } } = {};
  let totalCount = 0;

  pixelData.flat().forEach(cell => {
    if (cell && !cell.isExternal && cell.key !== TRANSPARENT_KEY) {
      const hexKey = cell.color.toUpperCase();
      colorCounts[hexKey] = colorCounts[hexKey] ?? { count: 0, color: hexKey };
      colorCounts[hexKey].count++;
      totalCount++;
    }
  });

  return { colorCounts, totalCount };
}
