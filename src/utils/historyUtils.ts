import { MappedPixel } from './pixelation';
import { EditorActionType, HistoryEntry, HistoryState, PixelPatchCell } from '../types/history';

export function createHistoryEntry(
  actionType: EditorActionType,
  label: string,
  patch: PixelPatchCell[],
  metadata?: HistoryEntry['metadata']
): HistoryEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    actionType,
    label,
    patch,
    metadata
  };
}

export function createPatch(before: MappedPixel[][], after: MappedPixel[][]): PixelPatchCell[] {
  const patch: PixelPatchCell[] = [];

  for (let row = 0; row < before.length; row++) {
    for (let col = 0; col < before[row].length; col++) {
      const beforeCell = before[row][col];
      const afterCell = after[row]?.[col];
      if (!beforeCell || !afterCell) continue;

      const changed =
        beforeCell.key !== afterCell.key ||
        beforeCell.color !== afterCell.color ||
        Boolean(beforeCell.isExternal) !== Boolean(afterCell.isExternal);

      if (changed) {
        patch.push({
          row,
          col,
          before: { ...beforeCell },
          after: { ...afterCell }
        });
      }
    }
  }

  return patch;
}

export function applyPatch(pixelData: MappedPixel[][], patch: PixelPatchCell[], direction: 'forward' | 'backward'): MappedPixel[][] {
  const next = pixelData.map(row => row.map(cell => ({ ...cell })));

  patch.forEach(cellPatch => {
    if (!next[cellPatch.row]?.[cellPatch.col]) return;
    next[cellPatch.row][cellPatch.col] = {
      ...(direction === 'forward' ? cellPatch.after : cellPatch.before)
    };
  });

  return next;
}

export function pushHistoryEntry(history: HistoryState, entry: HistoryEntry): HistoryState {
  if (entry.patch.length === 0) return history;
  return {
    past: [...history.past, entry].slice(-200),
    future: []
  };
}

export function undoHistory(history: HistoryState): { history: HistoryState; entry: HistoryEntry | null } {
  const entry = history.past[history.past.length - 1];
  if (!entry) return { history, entry: null };

  return {
    entry,
    history: {
      past: history.past.slice(0, -1),
      future: [entry, ...history.future].slice(0, 200)
    }
  };
}

export function redoHistory(history: HistoryState): { history: HistoryState; entry: HistoryEntry | null } {
  const entry = history.future[0];
  if (!entry) return { history, entry: null };

  return {
    entry,
    history: {
      past: [...history.past, entry].slice(-200),
      future: history.future.slice(1)
    }
  };
}

export function formatHistoryTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}
