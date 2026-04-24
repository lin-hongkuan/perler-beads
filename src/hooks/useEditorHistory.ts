import { useCallback, useState } from 'react';
import { MappedPixel } from '../utils/pixelation';
import { EditorActionType, HistoryEntry, HistoryState, PixelPatchCell } from '../types/history';
import { applyPatch, createHistoryEntry, pushHistoryEntry, redoHistory, undoHistory } from '../utils/historyUtils';

interface CommitHistoryOptions {
  actionType: EditorActionType;
  label: string;
  patch: PixelPatchCell[];
  metadata?: HistoryEntry['metadata'];
}

export function useEditorHistory(initialHistory?: HistoryState) {
  const [history, setHistory] = useState<HistoryState>(initialHistory ?? { past: [], future: [] });

  const commitHistory = useCallback((options: CommitHistoryOptions): HistoryEntry | null => {
    if (options.patch.length === 0) return null;
    const entry = createHistoryEntry(options.actionType, options.label, options.patch, options.metadata);
    setHistory(prev => pushHistoryEntry(prev, entry));
    return entry;
  }, []);

  const undo = useCallback((pixelData: MappedPixel[][]): MappedPixel[][] | null => {
    const result = undoHistory(history);
    if (!result.entry) return null;
    setHistory(result.history);
    return applyPatch(pixelData, result.entry.patch, 'backward');
  }, [history]);

  const redo = useCallback((pixelData: MappedPixel[][]): MappedPixel[][] | null => {
    const result = redoHistory(history);
    if (!result.entry) return null;
    setHistory(result.history);
    return applyPatch(pixelData, result.entry.patch, 'forward');
  }, [history]);

  const replaceHistory = useCallback((nextHistory: HistoryState) => {
    setHistory(nextHistory);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory({ past: [], future: [] });
  }, []);

  return {
    history,
    commitHistory,
    undo,
    redo,
    replaceHistory,
    clearHistory,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0
  };
}
