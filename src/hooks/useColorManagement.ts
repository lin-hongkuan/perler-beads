import { useCallback, useEffect, useMemo, useState, ChangeEvent } from 'react';
import { PaletteColor, findClosestPaletteColor, hexToRgb, MappedPixel } from '../utils/pixelation';
import {
  ColorSystem,
  convertPaletteToColorSystem,
} from '../utils/colorSystemUtils';
import {
  PaletteSelections,
  loadPaletteSelections,
  presetToSelections,
  savePaletteSelections,
} from '../utils/localStorageUtils';
import { SavedPalettePreset } from '../types/project';
import { recalculateColorStats } from '../utils/colorStatsUtils';

interface UseColorManagementOptions {
  fullBeadPalette: PaletteColor[];
  mappedPixelData: MappedPixel[][] | null;
  initialGridColorKeys: Set<string>;
  setMappedPixelData: (data: MappedPixel[][]) => void;
  setColorCounts: (counts: { [key: string]: { count: number; color: string } } | null) => void;
  setTotalBeadCount: (count: number) => void;
  onExitManualMode: () => void;
  onTriggerRemap: () => void;
}

export function useColorManagement({
  fullBeadPalette,
  mappedPixelData,
  initialGridColorKeys,
  setMappedPixelData,
  setColorCounts,
  setTotalBeadCount,
  onExitManualMode,
  onTriggerRemap,
}: UseColorManagementOptions) {
  const [selectedColorSystem, setSelectedColorSystem] = useState<ColorSystem>('MARD');
  const [customPaletteSelections, setCustomPaletteSelections] = useState<PaletteSelections>({});
  const [excludedColorKeys, setExcludedColorKeys] = useState<Set<string>>(new Set());
  const [isCustomPalette, setIsCustomPalette] = useState<boolean>(false);
  const [isCustomPaletteEditorOpen, setIsCustomPaletteEditorOpen] = useState<boolean>(false);
  const [showExcludedColors, setShowExcludedColors] = useState<boolean>(false);
  const [showFullPalette, setShowFullPalette] = useState<boolean>(false);

  useEffect(() => {
    const savedSelections = loadPaletteSelections();
    const allHexValues = fullBeadPalette.map(color => color.hex.toUpperCase());

    if (savedSelections && Object.keys(savedSelections).length > 0) {
      const validSelections: PaletteSelections = {};
      let hasValidData = false;

      Object.entries(savedSelections).forEach(([key, value]) => {
        if (/^#[0-9A-F]{6}$/i.test(key) && allHexValues.includes(key.toUpperCase())) {
          validSelections[key.toUpperCase()] = value;
          hasValidData = true;
        }
      });

      if (hasValidData) {
        setCustomPaletteSelections(validSelections);
        setIsCustomPalette(true);
        return;
      }

      localStorage.removeItem('customPerlerPaletteSelections');
    }

    const initialSelections = presetToSelections(allHexValues, allHexValues);
    setCustomPaletteSelections(initialSelections);
    setIsCustomPalette(false);
  }, [fullBeadPalette]);

  const activeBeadPalette = useMemo(() => {
    const filteredPalette = fullBeadPalette.filter(color => {
      const normalizedHex = color.hex.toUpperCase();
      const isSelected = customPaletteSelections[normalizedHex];
      const isNotExcluded = !excludedColorKeys.has(normalizedHex);
      return isSelected && isNotExcluded;
    });

    return convertPaletteToColorSystem(filteredPalette, selectedColorSystem);
  }, [customPaletteSelections, excludedColorKeys, fullBeadPalette, selectedColorSystem]);

  const handleSelectionChange = useCallback((hexValue: string, isSelected: boolean) => {
    const normalizedHex = hexValue.toUpperCase();
    setCustomPaletteSelections(prev => ({
      ...prev,
      [normalizedHex]: isSelected,
    }));
    setIsCustomPalette(true);
  }, []);

  const handleSaveCustomPalette = useCallback(() => {
    savePaletteSelections(customPaletteSelections);
    setIsCustomPalette(true);
    setIsCustomPaletteEditorOpen(false);
    onTriggerRemap();
    onExitManualMode();
  }, [customPaletteSelections, onExitManualMode, onTriggerRemap]);

  const handleApplyPalettePreset = useCallback((preset: SavedPalettePreset) => {
    setCustomPaletteSelections(preset.selections);
    savePaletteSelections(preset.selections);
    setIsCustomPalette(true);
  }, []);

  const handleExportCustomPalette = useCallback(() => {
    const selectedHexValues = Object.entries(customPaletteSelections)
      .filter(([, isSelected]) => isSelected)
      .map(([hexValue]) => hexValue);

    if (selectedHexValues.length === 0) {
      alert('当前没有选中的颜色，无法导出。');
      return;
    }

    const exportData = {
      version: '3.0',
      selectedHexValues,
      exportDate: new Date().toISOString(),
      totalColors: selectedHexValues.length,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'custom-perler-palette.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [customPaletteSelections]);

  const handleImportPaletteFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = e => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);

          if (!Array.isArray(data.selectedHexValues)) {
            throw new Error("无效的文件格式：文件必须包含 'selectedHexValues' 数组。");
          }

          const importedHexValues = data.selectedHexValues as string[];
          const validHexValues = importedHexValues
            .map(hex => hex.toUpperCase())
            .filter(hex => fullBeadPalette.some(color => color.hex.toUpperCase() === hex));

          if (validHexValues.length === 0) {
            alert('导入的文件中不包含任何有效的颜色。');
            return;
          }

          const allHexValues = fullBeadPalette.map(color => color.hex.toUpperCase());
          const newSelections = presetToSelections(allHexValues, validHexValues);
          setCustomPaletteSelections(newSelections);
          setIsCustomPalette(true);
          alert(`成功导入 ${validHexValues.length} 个颜色！`);
        } catch (error) {
          alert(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
          if (event.target) {
            event.target.value = '';
          }
        }
      };

      reader.onerror = () => {
        alert('读取文件失败。');
        if (event.target) {
          event.target.value = '';
        }
      };
      reader.readAsText(file);
    },
    [fullBeadPalette]
  );

  const handleToggleExcludeColor = useCallback(
    (hexKey: string) => {
      const currentExcluded = excludedColorKeys;
      const isExcluding = !currentExcluded.has(hexKey);

      if (isExcluding) {
        if (initialGridColorKeys.size === 0) {
          alert('无法排除颜色，初始颜色数据尚未准备好，请稍候。');
          return;
        }

        const nextExcludedKeys = new Set(currentExcluded);
        nextExcludedKeys.add(hexKey);

        const potentialRemapHexKeys = new Set(initialGridColorKeys);
        potentialRemapHexKeys.delete(hexKey);
        currentExcluded.forEach(excludedHex => potentialRemapHexKeys.delete(excludedHex));

        const remapTargetPalette = fullBeadPalette.filter(color =>
          potentialRemapHexKeys.has(color.hex.toUpperCase())
        );

        if (remapTargetPalette.length === 0) {
          alert(`无法排除颜色 ${hexKey}，因为图中最初存在的其他可用颜色也已被排除。请先恢复部分其他颜色。`);
          return;
        }

        const excludedColorData = fullBeadPalette.find(p => p.hex.toUpperCase() === hexKey);
        if (!excludedColorData || !mappedPixelData) {
          alert('无法排除颜色，缺少必要数据。');
          return;
        }

        const newMappedData = mappedPixelData.map(row => row.map(cell => ({ ...cell })));
        for (let row = 0; row < newMappedData.length; row++) {
          for (let col = 0; col < newMappedData[row].length; col++) {
            const cell = newMappedData[row][col];
            if (cell && !cell.isExternal && cell.color.toUpperCase() === hexKey) {
              const replacementColor = findClosestPaletteColor(excludedColorData.rgb, remapTargetPalette);
              newMappedData[row][col] = {
                ...cell,
                key: replacementColor.key,
                color: replacementColor.hex,
              };
            }
          }
        }

        const { colorCounts, totalCount } = recalculateColorStats(newMappedData);
        setExcludedColorKeys(nextExcludedKeys);
        setMappedPixelData(newMappedData);
        setColorCounts(colorCounts);
        setTotalBeadCount(totalCount);
      } else {
        const nextExcludedKeys = new Set(currentExcluded);
        nextExcludedKeys.delete(hexKey);
        setExcludedColorKeys(nextExcludedKeys);
        onTriggerRemap();
      }

      onExitManualMode();
    },
    [
      excludedColorKeys,
      fullBeadPalette,
      initialGridColorKeys,
      mappedPixelData,
      onExitManualMode,
      onTriggerRemap,
      setColorCounts,
      setMappedPixelData,
      setTotalBeadCount,
    ]
  );

  const setAllColorsSelected = useCallback((selected: boolean) => {
    const allHexValues = fullBeadPalette.map(color => color.hex.toUpperCase());
    const nextSelections = presetToSelections(allHexValues, selected ? allHexValues : []);
    setCustomPaletteSelections(nextSelections);
    setIsCustomPalette(true);
  }, [fullBeadPalette]);

  const resetExcludedColors = useCallback(() => {
    setExcludedColorKeys(new Set());
  }, []);

  const buildPaletteColorData = useCallback((hexValue: string) => {
    const normalizedHex = hexValue.toUpperCase();
    const rgb = hexToRgb(normalizedHex);
    if (!rgb) return null;
    return {
      key: normalizedHex,
      hex: normalizedHex,
      rgb,
    };
  }, []);

  return {
    selectedColorSystem,
    setSelectedColorSystem,
    customPaletteSelections,
    setCustomPaletteSelections,
    excludedColorKeys,
    setExcludedColorKeys,
    isCustomPalette,
    setIsCustomPalette,
    isCustomPaletteEditorOpen,
    setIsCustomPaletteEditorOpen,
    showExcludedColors,
    setShowExcludedColors,
    showFullPalette,
    setShowFullPalette,
    activeBeadPalette,
    handleSelectionChange,
    handleSaveCustomPalette,
    handleApplyPalettePreset,
    handleExportCustomPalette,
    handleImportPaletteFile,
    handleToggleExcludeColor,
    setAllColorsSelected,
    resetExcludedColors,
    buildPaletteColorData,
  };
}
