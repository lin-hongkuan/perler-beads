import React from 'react';
import { SavedPalettePreset } from '../../types/project';

interface FavoritePalettesPanelProps {
  presets: SavedPalettePreset[];
  onApply: (preset: SavedPalettePreset) => void;
  onDelete: (presetId: string) => void;
}

const FavoritePalettesPanel: React.FC<FavoritePalettesPanelProps> = ({ presets, onApply, onDelete }) => {
  if (presets.length === 0) {
    return <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">暂无收藏色板。</div>;
  }

  return (
    <div className="space-y-2">
      {presets.map(preset => {
        const selectedCount = Object.values(preset.selections).filter(Boolean).length;
        return (
          <div key={preset.id} className="flex items-center justify-between rounded-xl border border-gray-200 p-3 dark:border-gray-700">
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{preset.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{selectedCount} 色</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onApply(preset)} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">应用</button>
              <button onClick={() => onDelete(preset.id)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-300">删除</button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FavoritePalettesPanel;
