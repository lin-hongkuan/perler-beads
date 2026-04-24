import React from 'react';
import { getColorKeyByHex, ColorSystem } from '../../utils/colorSystemUtils';
import { MappedPixel } from '../../utils/pixelation';
import { TRANSPARENT_KEY } from '../../utils/pixelEditingUtils';

interface PaletteSheetProps {
  colors: Array<{ key: string; color: string }>;
  fullPaletteColors: Array<{ key: string; color: string }>;
  selectedColor: MappedPixel | null;
  selectedColorSystem: ColorSystem;
  showFullPalette: boolean;
  onToggleFullPalette: () => void;
  onColorSelect: (color: { key: string; color: string; isExternal?: boolean }) => void;
}

const PaletteSheet: React.FC<PaletteSheetProps> = ({
  colors,
  fullPaletteColors,
  selectedColor,
  selectedColorSystem,
  showFullPalette,
  onToggleFullPalette,
  onColorSelect
}) => {
  const paletteColors = showFullPalette ? fullPaletteColors : colors;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {showFullPalette ? '完整自定义色板' : '当前图纸用色'} · {paletteColors.length} 色
        </div>
        <button onClick={onToggleFullPalette} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {showFullPalette ? '只看图纸颜色' : '完整色板'}
        </button>
      </div>

      <button
        onClick={() => onColorSelect({ key: TRANSPARENT_KEY, color: '#FFFFFF', isExternal: true })}
        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${
          selectedColor?.key === TRANSPARENT_KEY ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        <span className="h-8 w-8 rounded-lg border border-dashed border-gray-400 bg-white" />
        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">橡皮擦 / 透明</span>
      </button>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {paletteColors.map(color => {
          const isSelected = selectedColor?.color?.toUpperCase() === color.color.toUpperCase() && selectedColor?.key !== TRANSPARENT_KEY;
          const label = color.key.startsWith('#') ? getColorKeyByHex(color.color, selectedColorSystem) : color.key;

          return (
            <button
              key={`${color.key}-${color.color}`}
              onClick={() => onColorSelect({ key: color.key, color: color.color, isExternal: false })}
              className={`rounded-xl border p-2 text-center transition ${
                isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
              }`}
            >
              <span className="mx-auto block h-9 w-9 rounded-lg border border-gray-300" style={{ backgroundColor: color.color }} />
              <span className="mt-1 block truncate text-[11px] font-mono text-gray-700 dark:text-gray-200">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PaletteSheet;
