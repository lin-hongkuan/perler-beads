import { ChangeEvent } from 'react';
import { MappedPixel, PixelationMode } from '../../utils/pixelation';
import {
  colorSystemOptions,
  ColorSystem,
} from '../../utils/colorSystemUtils';
import { PaletteSelections } from '../../utils/localStorageUtils';

interface GridDimensions {
  N: number;
  M: number;
}

export interface HomeControlsPanelProps {
  granularityInput: string;
  similarityThresholdInput: string;
  pixelationMode: PixelationMode;
  selectedColorSystem: ColorSystem;
  customPaletteSelections: PaletteSelections;
  isCustomPalette: boolean;
  mappedPixelData: MappedPixel[][] | null;
  gridDimensions: GridDimensions | null;
  handleGranularityInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleSimilarityThresholdInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleConfirmParameters: () => void;
  handlePixelationModeChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  handleAutoRemoveBackground: () => void;
  setSelectedColorSystem: (colorSystem: ColorSystem) => void;
  setIsCustomPaletteEditorOpen: (isOpen: boolean) => void;
}

export default function HomeControlsPanel({
  granularityInput,
  similarityThresholdInput,
  pixelationMode,
  selectedColorSystem,
  customPaletteSelections,
  isCustomPalette,
  mappedPixelData,
  gridDimensions,
  handleGranularityInputChange,
  handleSimilarityThresholdInputChange,
  handleConfirmParameters,
  handlePixelationModeChange,
  handleAutoRemoveBackground,
  setSelectedColorSystem,
  setIsCustomPaletteEditorOpen,
}: HomeControlsPanelProps) {
  const selectedPaletteCount = Object.values(customPaletteSelections).filter(Boolean).length;

  return (
    <div className="w-full md:max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-xl shadow-md border border-gray-100 dark:border-gray-700">
      <div className="flex-1">
        <label
          htmlFor="granularityInput"
          className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2"
        >
          横轴切割数量 (10-300):
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            id="granularityInput"
            value={granularityInput}
            onChange={handleGranularityInputChange}
            className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 h-9 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
            min="10"
            max="300"
          />
        </div>
      </div>

      <div className="flex-1">
        <label
          htmlFor="similarityThresholdInput"
          className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2"
        >
          颜色合并阈值 (0-100):
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            id="similarityThresholdInput"
            value={similarityThresholdInput}
            onChange={handleSimilarityThresholdInputChange}
            className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 h-9 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
            min="0"
            max="100"
          />
        </div>
      </div>

      <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
        <button
          onClick={handleConfirmParameters}
          className="h-9 bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 rounded-md whitespace-nowrap transition-colors duration-200 shadow-sm"
        >
          应用数字
        </button>
        <button
          onClick={handleAutoRemoveBackground}
          disabled={!mappedPixelData || !gridDimensions}
          className="inline-flex items-center justify-center h-9 px-3 text-sm rounded-md border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          一键去背景
        </button>
      </div>

      <div className="sm:col-span-2">
        <label
          htmlFor="pixelationModeSelect"
          className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2"
        >
          处理模式:
        </label>
        <div className="flex items-center gap-2">
          <select
            id="pixelationModeSelect"
            value={pixelationMode}
            onChange={handlePixelationModeChange}
            className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 h-9 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
          >
            <option
              value={PixelationMode.Dominant}
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
            >
              卡通 (主色)
            </option>
            <option
              value={PixelationMode.Average}
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
            >
              真实 (平均)
            </option>
          </select>
        </div>
      </div>

      <div className="sm:col-span-2">
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
          色号系统:
        </label>
        <div className="flex flex-wrap gap-2">
          {colorSystemOptions.map(option => (
            <button
              key={option.key}
              onClick={() => setSelectedColorSystem(option.key as ColorSystem)}
              className={`px-3 py-2 text-sm rounded-lg border transition-all duration-200 flex-shrink-0 ${
                selectedColorSystem === option.key
                  ? 'bg-blue-500 text-white border-blue-500 shadow-md transform scale-105'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-600'
              }`}
            >
              {option.name}
            </button>
          ))}
        </div>
      </div>

      <div className="sm:col-span-2 mt-3">
        <button
          onClick={() => setIsCustomPaletteEditorOpen(true)}
          className="w-full py-2.5 px-3 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-lg shadow-sm transition-all duration-200 hover:shadow-md hover:from-blue-600 hover:to-purple-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z"
              clipRule="evenodd"
            />
          </svg>
          管理色板 ({selectedPaletteCount} 色)
        </button>
        {isCustomPalette && (
          <p className="text-xs text-center text-blue-500 dark:text-blue-400 mt-1.5">当前使用自定义色板</p>
        )}
      </div>
    </div>
  );
}
