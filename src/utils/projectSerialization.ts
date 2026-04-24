import { MappedPixel } from './pixelation';
import { ColorSystem } from './colorSystemUtils';
import { PaletteSelections } from './localStorageUtils';
import { ColorCountMap, GridDimensions, ProjectDocument, ProjectSourceType } from '../types/project';
import { HistoryState } from '../types/history';
import { DifficultyEstimate } from '../types/estimation';

interface CreateProjectInput {
  existingProject?: ProjectDocument | null;
  name?: string;
  sourceType: ProjectSourceType;
  originalImageSrc: string | null;
  mappedPixelData: MappedPixel[][];
  gridDimensions: GridDimensions;
  colorCounts: ColorCountMap;
  totalBeadCount: number;
  selectedColorSystem: ColorSystem;
  excludedColorKeys: string[];
  customPaletteSelections: PaletteSelections;
  history?: HistoryState;
  difficulty?: DifficultyEstimate | null;
  thumbnailDataUrl?: string;
}

export function createProjectId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createProjectDocument(input: CreateProjectInput): ProjectDocument {
  const now = new Date().toISOString();
  const id = input.existingProject?.id ?? createProjectId();
  const createdAt = input.existingProject?.summary.createdAt ?? now;
  const name = input.name ?? input.existingProject?.summary.name ?? `拼豆项目 ${new Date().toLocaleDateString('zh-CN')}`;
  const colorCount = Object.keys(input.colorCounts).length;

  return {
    id,
    version: 1,
    summary: {
      id,
      name,
      createdAt,
      updatedAt: now,
      lastOpenedAt: now,
      thumbnailDataUrl: input.thumbnailDataUrl ?? input.existingProject?.summary.thumbnailDataUrl,
      isFavorite: input.existingProject?.summary.isFavorite ?? false,
      beadCount: input.totalBeadCount,
      colorCount,
      dimensions: input.gridDimensions,
      sourceType: input.sourceType,
      status: input.existingProject?.summary.status ?? 'draft',
      difficulty: input.difficulty ?? input.existingProject?.summary.difficulty
    },
    originalImageSrc: input.originalImageSrc,
    mappedPixelData: input.mappedPixelData,
    gridDimensions: input.gridDimensions,
    colorCounts: input.colorCounts,
    totalBeadCount: input.totalBeadCount,
    selectedColorSystem: input.selectedColorSystem,
    excludedColorKeys: input.excludedColorKeys,
    customPaletteSelections: input.customPaletteSelections,
    history: input.history ?? input.existingProject?.history ?? { past: [], future: [] },
    focusProgress: input.existingProject?.focusProgress
  };
}

export function createProjectThumbnail(pixelData: MappedPixel[][], size = 160): string | undefined {
  if (typeof document === 'undefined' || pixelData.length === 0 || !pixelData[0]?.length) return undefined;

  const rows = pixelData.length;
  const cols = pixelData[0].length;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;

  const scale = Math.max(1, Math.floor(size / Math.max(rows, cols)));
  canvas.width = cols * scale;
  canvas.height = rows * scale;

  pixelData.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      ctx.fillStyle = cell.isExternal ? '#F3F4F6' : cell.color;
      ctx.fillRect(colIndex * scale, rowIndex * scale, scale, scale);
    });
  });

  return canvas.toDataURL('image/png');
}
