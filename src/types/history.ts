import { MappedPixel } from '../utils/pixelation';

export type EditorActionType =
  | 'paint-single'
  | 'paint-stroke'
  | 'erase-region'
  | 'replace-color'
  | 'auto-background-remove'
  | 'remap-palette'
  | 'import-image'
  | 'import-csv'
  | 'focus-progress-toggle';

export interface PixelPatchCell {
  row: number;
  col: number;
  before: MappedPixel;
  after: MappedPixel;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  actionType: EditorActionType;
  label: string;
  patch: PixelPatchCell[];
  metadata?: Record<string, string | number | boolean | null>;
}

export interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
}
