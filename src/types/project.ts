11import { MappedPixel } from '../utils/pixelation';
import { ColorSystem } from '../utils/colorSystemUtils';
import { PaletteSelections } from '../utils/localStorageUtils';
import { DifficultyEstimate } from './estimation';
import { HistoryState } from './history';

export type ProjectStatus = 'draft' | 'in_progress' | 'completed';
export type ProjectSourceType = 'image' | 'csv' | 'manual';

export interface GridDimensions {
  N: number;
  M: number;
}

export interface ColorCountMap {
  [hexKey: string]: {
    count: number;
    color: string;
  };
}

export interface SavedPalettePreset {
  id: string;
  name: string;
  selections: PaletteSelections;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FocusProgressState {
  currentColor: string;
  selectedCell: { row: number; col: number } | null;
  canvasScale: number;
  canvasOffset: { x: number; y: number };
  completedCells: string[];
  colorProgress: Record<string, { completed: number; total: number }>;
  guidanceMode: 'nearest' | 'largest' | 'edge-first';
  timer: {
    startTime: number;
    totalElapsedTime: number;
    lastResumeTime: number;
    isPaused: boolean;
  };
}

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
  thumbnailDataUrl?: string;
  isFavorite: boolean;
  beadCount: number;
  colorCount: number;
  dimensions: GridDimensions;
  sourceType: ProjectSourceType;
  status: ProjectStatus;
  difficulty?: DifficultyEstimate;
}

export interface ProjectDocument {
  id: string;
  version: number;
  summary: ProjectSummary;
  originalImageSrc: string | null;
  mappedPixelData: MappedPixel[][];
  gridDimensions: GridDimensions;
  colorCounts: ColorCountMap;
  totalBeadCount: number;
  selectedColorSystem: ColorSystem;
  excludedColorKeys: string[];
  customPaletteSelections: PaletteSelections;
  history: HistoryState;
  focusProgress?: FocusProgressState;
}
