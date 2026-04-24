import {
  calculatePixelGrid,
  colorDistance,
  PaletteColor,
  PixelationMode,
  MappedPixel,
  RgbColor,
} from './pixelation';
import { TRANSPARENT_KEY } from './pixelEditingUtils';
import { recalculateColorStats } from './colorStatsUtils';

export interface PixelationProcessorParams {
  originalCtx: CanvasRenderingContext2D;
  imgWidth: number;
  imgHeight: number;
  granularity: number;
  similarityThreshold: number;
  palette: PaletteColor[];
  mode: PixelationMode;
}

export interface PixelationProcessorResult {
  mappedPixelData: MappedPixel[][];
  gridDimensions: { N: number; M: number };
  colorCounts: { [key: string]: { count: number; color: string } };
  totalBeadCount: number;
}

export function processPixelation({
  originalCtx,
  imgWidth,
  imgHeight,
  granularity,
  similarityThreshold,
  palette,
  mode,
}: PixelationProcessorParams): PixelationProcessorResult {
  if (palette.length === 0) {
    throw new Error('当前可用颜色板为空，无法处理图像。');
  }

  const aspectRatio = imgHeight / imgWidth;
  const N = granularity;
  const M = Math.max(1, Math.round(N * aspectRatio));

  if (N <= 0 || M <= 0) {
    throw new Error('无效的网格尺寸。');
  }

  const fallbackColor =
    palette.find(p => p.key === 'T1') ||
    palette.find(p => p.hex.toUpperCase() === '#FFFFFF') ||
    palette[0];

  const initialMappedData = calculatePixelGrid(
    originalCtx,
    imgWidth,
    imgHeight,
    N,
    M,
    palette,
    mode,
    fallbackColor
  );

  const keyToRgbMap = new Map<string, RgbColor>();
  const keyToColorDataMap = new Map<string, PaletteColor>();
  palette.forEach(color => {
    keyToRgbMap.set(color.key, color.rgb);
    keyToColorDataMap.set(color.key, color);
  });

  const initialColorCounts: { [key: string]: number } = {};
  initialMappedData.flat().forEach(cell => {
    if (cell && cell.key && !cell.isExternal && cell.key !== TRANSPARENT_KEY) {
      initialColorCounts[cell.key] = (initialColorCounts[cell.key] || 0) + 1;
    }
  });

  const colorsByFrequency = Object.entries(initialColorCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key);

  const mergedData: MappedPixel[][] = initialMappedData.map(row =>
    row.map(cell => ({ ...cell, isExternal: cell.isExternal ?? false }))
  );

  const replacedColors = new Set<string>();

  for (let i = 0; i < colorsByFrequency.length; i++) {
    const currentKey = colorsByFrequency[i];
    if (replacedColors.has(currentKey)) continue;

    const currentRgb = keyToRgbMap.get(currentKey);
    if (!currentRgb) continue;

    for (let j = i + 1; j < colorsByFrequency.length; j++) {
      const lowerFreqKey = colorsByFrequency[j];
      if (replacedColors.has(lowerFreqKey)) continue;

      const lowerFreqRgb = keyToRgbMap.get(lowerFreqKey);
      if (!lowerFreqRgb) continue;

      const distance = colorDistance(currentRgb, lowerFreqRgb);
      if (distance >= similarityThreshold) continue;

      replacedColors.add(lowerFreqKey);

      for (let row = 0; row < M; row++) {
        for (let col = 0; col < N; col++) {
          if (mergedData[row][col].key === lowerFreqKey) {
            const replacementColor = keyToColorDataMap.get(currentKey);
            if (replacementColor) {
              mergedData[row][col] = {
                key: currentKey,
                color: replacementColor.hex,
                isExternal: false,
              };
            }
          }
        }
      }
    }
  }

  const { colorCounts, totalCount } = recalculateColorStats(mergedData);

  return {
    mappedPixelData: mergedData,
    gridDimensions: { N, M },
    colorCounts,
    totalBeadCount: totalCount,
  };
}
