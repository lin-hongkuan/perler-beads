'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Script from 'next/script';

// 导入像素化工具和类型
import {
  PaletteColor,
  MappedPixel,
  hexToRgb
} from '../utils/pixelation';

// 导入新的类型和组件
import { GridDownloadOptions } from '../types/downloadTypes';
import { ProjectDocument } from '../types/project';
import DownloadSettingsModal, { gridLineColorOptions } from '../components/DownloadSettingsModal';
import { downloadImage } from '../utils/imageDownloader';

import {
  getColorKeyByHex,
  getMardToHexMapping,
  sortColorsByHue,
} from '../utils/colorSystemUtils';

// Helper function for sorting color keys - 保留原有实现，因为未在utils中导出
function sortColorKeys(a: string, b: string): number {
  const regex = /^([A-Z]+)(\d+)$/;
  const matchA = a.match(regex);
  const matchB = b.match(regex);

  if (matchA && matchB) {
    const prefixA = matchA[1];
    const numA = parseInt(matchA[2], 10);
    const prefixB = matchB[1];
    const numB = parseInt(matchB[2], 10);

    if (prefixA !== prefixB) {
      return prefixA.localeCompare(prefixB); // Sort by prefix first (A, B, C...)
    }
    return numA - numB; // Then sort by number (1, 2, 10...)
  }
  // Fallback for keys that don't match the standard pattern (e.g., T1, ZG1)
  return a.localeCompare(b);
}

// --- Define available palette key sets ---
// 从colorSystemMapping.json获取所有MARD色号
const mardToHexMapping = getMardToHexMapping();

// Pre-process the FULL palette data once - 使用colorSystemMapping而不是beadPaletteData
const fullBeadPalette: PaletteColor[] = Object.entries(mardToHexMapping)
  .map(([mardKey, hex]) => {
    const rgb = hexToRgb(hex);
    if (!rgb) {
      console.warn(`Invalid hex code "${hex}" for MARD key "${mardKey}". Skipping.`);
      return null;
    }
    // 使用hex值作为key，符合新的架构设计
    return { key: hex, hex, rgb };
  })
  .filter((color): color is PaletteColor => color !== null);

// ++ Add definition for background color keys ++

// 1. 导入新组件
import PixelatedPreviewCanvas from '../components/PixelatedPreviewCanvas';
import GridTooltip from '../components/GridTooltip';
import FloatingColorPalette from '../components/FloatingColorPalette';
import HomeHeroHeader from '../components/home/HomeHeroHeader';
import HomeControlsPanel from '../components/home/HomeControlsPanel';
import HomePaletteModal from '../components/home/HomePaletteModal';
import FloatingToolbar from '../components/FloatingToolbar';
import MagnifierTool from '../components/MagnifierTool';
import MagnifierSelectionOverlay from '../components/MagnifierSelectionOverlay';
import { TRANSPARENT_KEY, transparentColorData, floodFillErase } from '../utils/pixelEditingUtils';
import FocusModePreDownloadModal from '../components/FocusModePreDownloadModal';
import EditorBottomSheet from '../components/mobile/EditorBottomSheet';
import MobileEditorToolbar, { MobileSheetKey } from '../components/mobile/MobileEditorToolbar';
import ToolDrawerSheet from '../components/mobile/ToolDrawerSheet';
import PaletteSheet from '../components/mobile/PaletteSheet';
import HistorySheet from '../components/mobile/HistorySheet';
import ProjectLibrarySheet from '../components/mobile/ProjectLibrarySheet';
import { useEditorHistory } from '../hooks/useEditorHistory';
import { useProjectLibrary } from '../hooks/useProjectLibrary';
import { useProjectPersistence } from '../hooks/useProjectPersistence';
import { estimateDifficulty } from '../utils/difficultyEstimator';
import { createProjectDocument, createProjectThumbnail } from '../utils/projectSerialization';
import { saveProject } from '../utils/projectStorage';
import { createPatch } from '../utils/historyUtils';
import { useImagePixelation } from '../hooks/useImagePixelation';
import { useColorManagement } from '../hooks/useColorManagement';

export default function Home() {
  // 用于记录初始网格颜色（hex值），用于显示排除功能
  const [initialGridColorKeys, setInitialGridColorKeys] = useState<Set<string>>(new Set());
  const [mappedPixelData, setMappedPixelData] = useState<MappedPixel[][] | null>(null);
  const [gridDimensions, setGridDimensions] = useState<{ N: number; M: number } | null>(null);
  const [colorCounts, setColorCounts] = useState<{ [key: string]: { count: number; color: string } } | null>(null);
  const [totalBeadCount, setTotalBeadCount] = useState<number>(0);
  const [tooltipData, setTooltipData] = useState<{ x: number, y: number, key: string, color: string } | null>(null);
  const [isManualColoringMode, setIsManualColoringMode] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<MappedPixel | null>(null);
  // 新增：一键擦除模式状态
  const [isEraseMode, setIsEraseMode] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  // ++ 新增：下载设置相关状态 ++
  const [isDownloadSettingsOpen, setIsDownloadSettingsOpen] = useState<boolean>(false);
  const [downloadOptions, setDownloadOptions] = useState<GridDownloadOptions>({
    showGrid: true,
    gridInterval: 10,
    showCoordinates: true,
    showCellNumbers: true,
    gridLineColor: gridLineColorOptions[0].value,
    includeStats: true, // 默认包含统计信息
    exportCsv: false // 默认不导出CSV
  });

  // 新增：高亮相关状态
  const [highlightColorKey, setHighlightColorKey] = useState<string | null>(null);

  // 新增：颜色替换相关状态
  const [colorReplaceState, setColorReplaceState] = useState<{
    isActive: boolean;
    step: 'select-source' | 'select-target';
    sourceColor?: { key: string; color: string };
  }>({
    isActive: false,
    step: 'select-source'
  });

  // 新增：组件挂载状态
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // 新增：悬浮调色盘状态
  const [isFloatingPaletteOpen, setIsFloatingPaletteOpen] = useState<boolean>(true);

  // 新增：放大镜状态
  const [isMagnifierActive, setIsMagnifierActive] = useState<boolean>(false);
  const [magnifierSelectionArea, setMagnifierSelectionArea] = useState<{
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null>(null);

  // 新增：活跃工具层级管理
  const [activeFloatingTool, setActiveFloatingTool] = useState<'palette' | 'magnifier' | null>(null);

  // 新增：专心拼豆模式进入前下载提醒弹窗
  const [isFocusModePreDownloadModalOpen, setIsFocusModePreDownloadModalOpen] = useState<boolean>(false);
  const [currentProject, setCurrentProject] = useState<ProjectDocument | null>(null);
  const [activeMobileSheet, setActiveMobileSheet] = useState<MobileSheetKey | null>(null);
  const [isCanvasLocked, setIsCanvasLocked] = useState<boolean>(true);
  const { history, commitHistory, undo, redo, replaceHistory, canUndo, canRedo } = useEditorHistory();
  const projectLibrary = useProjectLibrary();
  const difficultyEstimate = useMemo(() => estimateDifficulty(mappedPixelData), [mappedPixelData]);
  useProjectPersistence(currentProject);

  const {
    selectedColorSystem,
    setSelectedColorSystem,
    customPaletteSelections,
    setCustomPaletteSelections,
    excludedColorKeys,
    setExcludedColorKeys,
    isCustomPalette,
    isCustomPaletteEditorOpen,
    setIsCustomPaletteEditorOpen,
    showExcludedColors,
    setShowExcludedColors,
    showFullPalette,
    activeBeadPalette,
    handleSelectionChange,
    handleSaveCustomPalette,
    handleApplyPalettePreset,
    handleExportCustomPalette,
    handleImportPaletteFile,
    handleToggleExcludeColor,
    resetExcludedColors,
  } = useColorManagement({
    fullBeadPalette,
    mappedPixelData,
    initialGridColorKeys,
    setMappedPixelData,
    setColorCounts,
    setTotalBeadCount,
    onExitManualMode: () => {
      setIsManualColoringMode(false);
      setSelectedColor(null);
      setIsEraseMode(false);
    },
    onTriggerRemap: () => {
      setCurrentProject(prev =>
        prev
          ? {
              ...prev,
              excludedColorKeys: Array.from(excludedColorKeys),
              customPaletteSelections,
              selectedColorSystem,
            }
          : prev
      );
    },
  });

  const {
    originalImageSrc,
    setOriginalImageSrc,
    granularityInput,
    similarityThresholdInput,
    pixelationMode,
    originalCanvasRef,
    pixelatedCanvasRef,
    handleFileChange,
    handleDrop,
    handleDragOver,
    handleGranularityInputChange,
    handleSimilarityThresholdInputChange,
    handleConfirmParameters,
    handlePixelationModeChange,
  } = useImagePixelation({
    activeBeadPalette,
    onPixelationComplete: result => {
      setMappedPixelData(result.mappedPixelData);
      setGridDimensions(result.gridDimensions);
      setColorCounts(result.colorCounts);
      setTotalBeadCount(result.totalBeadCount);
      setInitialGridColorKeys(new Set(Object.keys(result.colorCounts)));

      const snapshot = createProjectDocument({
        existingProject: currentProject,
        sourceType: 'image',
        originalImageSrc: result.originalImageSrc,
        mappedPixelData: result.mappedPixelData,
        gridDimensions: result.gridDimensions,
        colorCounts: result.colorCounts,
        totalBeadCount: result.totalBeadCount,
        selectedColorSystem,
        excludedColorKeys: Array.from(excludedColorKeys),
        customPaletteSelections,
        history,
        difficulty: estimateDifficulty(result.mappedPixelData),
        thumbnailDataUrl: createProjectThumbnail(result.mappedPixelData),
      });
      setCurrentProject(snapshot);
      saveProject(snapshot).then(() => projectLibrary.refresh()).catch(error => console.error('保存图片项目失败:', error));
    },
    onExitManualMode: () => {
      setIsManualColoringMode(false);
      setSelectedColor(null);
      setIsEraseMode(false);
    },
    onResetExcludedColors: () => setExcludedColorKeys(new Set()),
  });

  const handleToggleFullPalette = () => {
    setIsCustomPaletteEditorOpen(prev => !prev);
  };

  // 放大镜切换处理函数
  const buildProjectSnapshot = useCallback((overrides?: Partial<Pick<ProjectDocument, 'mappedPixelData' | 'gridDimensions' | 'colorCounts' | 'totalBeadCount' | 'originalImageSrc'>>) => {
    const nextPixelData = overrides?.mappedPixelData ?? mappedPixelData;
    const nextDimensions = overrides?.gridDimensions ?? gridDimensions;
    const nextColorCounts = overrides?.colorCounts ?? colorCounts;
    const nextTotalBeadCount = overrides?.totalBeadCount ?? totalBeadCount;

    if (!nextPixelData || !nextDimensions || !nextColorCounts) return null;

    return createProjectDocument({
      existingProject: currentProject,
      sourceType: originalImageSrc ? 'image' : 'csv',
      originalImageSrc: overrides?.originalImageSrc ?? originalImageSrc,
      mappedPixelData: nextPixelData,
      gridDimensions: nextDimensions,
      colorCounts: nextColorCounts,
      totalBeadCount: nextTotalBeadCount,
      selectedColorSystem,
      excludedColorKeys: Array.from(excludedColorKeys),
      customPaletteSelections,
      history,
      difficulty: estimateDifficulty(nextPixelData),
      thumbnailDataUrl: createProjectThumbnail(nextPixelData)
    });
  }, [colorCounts, currentProject, customPaletteSelections, excludedColorKeys, gridDimensions, history, mappedPixelData, originalImageSrc, selectedColorSystem, totalBeadCount]);

  const persistProjectSnapshot = useCallback(async (snapshot?: ReturnType<typeof buildProjectSnapshot>) => {
    const project = snapshot ?? buildProjectSnapshot();
    if (!project) return null;

    setCurrentProject(project);
    await saveProject(project);
    projectLibrary.refresh().catch(error => console.error('刷新项目库失败:', error));
    return project;
  }, [buildProjectSnapshot, projectLibrary]);

  const syncPixelDataState = useCallback((nextPixelData: MappedPixel[][], nextColorCounts: { [hexKey: string]: { count: number; color: string } }, nextTotalBeadCount: number) => {
    setMappedPixelData(nextPixelData);
    setColorCounts(nextColorCounts);
    setTotalBeadCount(nextTotalBeadCount);
  }, []);

  const syncSnapshotState = useCallback(async (snapshot: ProjectDocument) => {
    setCurrentProject(snapshot);
    await saveProject(snapshot);
  }, []);

  const applyPixelDataChange = useCallback((newPixelData: MappedPixel[][], label: string, actionType: Parameters<typeof commitHistory>[0]['actionType']) => {
    if (!mappedPixelData) return;

    const patch = createPatch(mappedPixelData, newPixelData);
    if (patch.length === 0) return;

    const nextStats = (() => {
      const counts: { [hexKey: string]: { count: number; color: string } } = {};
      let count = 0;

      newPixelData.flat().forEach(cell => {
        if (cell && !cell.isExternal && cell.key !== TRANSPARENT_KEY) {
          const hex = cell.color.toUpperCase();
          counts[hex] = counts[hex] ?? { count: 0, color: hex };
          counts[hex].count++;
          count++;
        }
      });

      return { counts, count };
    })();

    const entry = commitHistory({ actionType, label, patch, metadata: { affectedCells: patch.length } });
    const nextHistory = entry ? { past: [...history.past, entry].slice(-200), future: [] } : history;

    syncPixelDataState(newPixelData, nextStats.counts, nextStats.count);

    const snapshot = buildProjectSnapshot({
      mappedPixelData: newPixelData,
      colorCounts: nextStats.counts,
      totalBeadCount: nextStats.count,
    });

    if (!snapshot) return;

    snapshot.history = nextHistory;
    syncSnapshotState(snapshot)
      .then(() => projectLibrary.refresh())
      .catch(error => console.error('保存编辑历史失败:', error));
  }, [buildProjectSnapshot, commitHistory, history, mappedPixelData, projectLibrary, syncPixelDataState, syncSnapshotState]);

  const handleToggleMagnifier = () => {
    const newActiveState = !isMagnifierActive;
    setIsMagnifierActive(newActiveState);
    
    // 如果关闭放大镜，清除选择区域，重新开始
    if (!newActiveState) {
      setMagnifierSelectionArea(null);
    }
  };

  // 激活工具处理函数
  const handleActivatePalette = () => {
    setActiveFloatingTool('palette');
  };

  const handleActivateMagnifier = () => {
    setActiveFloatingTool('magnifier');
  };

  const syncPixelDataWithoutHistory = useCallback((nextPixelData: MappedPixel[][]) => {
    const counts: { [hexKey: string]: { count: number; color: string } } = {};
    let count = 0;

    nextPixelData.flat().forEach(cell => {
      if (cell && !cell.isExternal && cell.key !== TRANSPARENT_KEY) {
        const hex = cell.color.toUpperCase();
        counts[hex] = counts[hex] ?? { count: 0, color: hex };
        counts[hex].count++;
        count++;
      }
    });

    syncPixelDataState(nextPixelData, counts, count);

    const snapshot = buildProjectSnapshot({
      mappedPixelData: nextPixelData,
      colorCounts: counts,
      totalBeadCount: count,
    });

    if (!snapshot) return;

    syncSnapshotState(snapshot).catch(error => console.error('同步保存项目失败:', error));
  }, [buildProjectSnapshot, syncPixelDataState, syncSnapshotState]);

  const handleUndo = useCallback(() => {
    if (!mappedPixelData) return;
    const nextPixelData = undo(mappedPixelData);
    if (nextPixelData) {
      syncPixelDataWithoutHistory(nextPixelData);
    }
  }, [mappedPixelData, syncPixelDataWithoutHistory, undo]);

  const handleRedo = useCallback(() => {
    if (!mappedPixelData) return;
    const nextPixelData = redo(mappedPixelData);
    if (nextPixelData) {
      syncPixelDataWithoutHistory(nextPixelData);
    }
  }, [mappedPixelData, redo, syncPixelDataWithoutHistory]);

  const handleOpenProject = async (projectId: string) => {
    const project = await projectLibrary.openProject(projectId);
    if (!project) return;
    setCurrentProject(project);
    setOriginalImageSrc(project.originalImageSrc);
    setMappedPixelData(project.mappedPixelData);
    setGridDimensions(project.gridDimensions);
    setColorCounts(project.colorCounts);
    setTotalBeadCount(project.totalBeadCount);
    setSelectedColorSystem(project.selectedColorSystem);
    setExcludedColorKeys(new Set(project.excludedColorKeys));
    setCustomPaletteSelections(project.customPaletteSelections);
    replaceHistory(project.history);
  };

  const handleToggleProjectFavorite = async (projectId: string) => {
    await projectLibrary.toggleProjectFavorite(projectId);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm('确定删除这个项目吗？')) {
      await projectLibrary.removeProject(projectId);
    }
  };

  const handleDeletePalettePreset = async (presetId: string) => {
    await projectLibrary.removePreset(presetId);
  };

  const handleToggleCanvasLock = () => {
    setIsCanvasLocked(prev => !prev);
  };

  // 放大镜像素编辑处理函数
  const handleMagnifierPixelEdit = (row: number, col: number, colorData: { key: string; color: string }) => {
    if (!mappedPixelData) return;

    const newMappedPixelData = mappedPixelData.map((rowData, r) =>
      rowData.map((pixel, c) => {
        if (r === row && c === col) {
          return { key: colorData.key, color: colorData.color, isExternal: false } as MappedPixel;
        }
        return pixel;
      })
    );

    applyPixelDataChange(newMappedPixelData, '放大镜单格上色', 'paint-single');
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // 当前网格上的实际用色列表（用于色板显示）
  const currentGridColors = useMemo(() => {
    if (!mappedPixelData) return [];
    const uniqueColorsMap = new Map<string, MappedPixel>();
    mappedPixelData.flat().forEach(cell => {
      if (cell && cell.color && !cell.isExternal) {
        const hexKey = cell.color.toUpperCase();
        if (!uniqueColorsMap.has(hexKey)) {
          uniqueColorsMap.set(hexKey, { key: cell.key, color: cell.color });
        }
      }
    });
    const originalColors = Array.from(uniqueColorsMap.values());
    const colorData = originalColors.map(color => ({
      key: getColorKeyByHex(color.color.toUpperCase(), selectedColorSystem),
      color: color.color
    }));
    return sortColorsByHue(colorData);
  }, [mappedPixelData, selectedColorSystem]);

  const handleEnterFocusMode = () => {
    setIsFocusModePreDownloadModalOpen(true);
  };

  const handleProceedToFocusMode = async () => {
    const project = await persistProjectSnapshot();
    if (!project) {
      alert('请先生成图纸后再进入专心拼豆模式。');
      return;
    }

    window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/focus?project=${project.id}`;
  };

  const triggerFileInput = useCallback(() => {
    if (!isMounted) {
      setTimeout(() => triggerFileInput(), 200);
      return;
    }
    if (fileInputRef.current) {
      try {
        fileInputRef.current.click();
      } catch (error) {
        console.error('触发文件选择失败:', error);
        setTimeout(() => {
          try {
            fileInputRef.current?.click();
          } catch (retryError) {
            console.error('重试触发文件选择失败:', retryError);
          }
        }, 100);
      }
    } else {
      setTimeout(() => {
        if (fileInputRef.current) {
          try {
            fileInputRef.current.click();
          } catch (error) {
            console.error('延迟触发文件选择失败:', error);
          }
        }
      }, 100);
    }
  }, [isMounted]);

  const handleEraseToggle = () => {
    if (!isManualColoringMode) return;
    if (colorReplaceState.isActive) {
      setColorReplaceState({ isActive: false, step: 'select-source' });
      setHighlightColorKey(null);
    }
    setIsEraseMode(!isEraseMode);
    if (!isEraseMode) {
      setSelectedColor(null);
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (!isManualColoringMode) return;

      const isModifierPressed = event.ctrlKey || event.metaKey;
      if (!isModifierPressed) return;

      const key = event.key.toLowerCase();

      if (!event.shiftKey && key === 'z' && canUndo) {
        event.preventDefault();
        handleUndo();
        return;
      }

      if ((key === 'y' || (event.shiftKey && key === 'z')) && canRedo) {
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canRedo, canUndo, handleRedo, handleUndo, isManualColoringMode]);

  // URL 重定向检查（仅在非本地环境下触发）
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentUrl = window.location.href;
    const currentHostname = window.location.hostname;
    const targetDomain = currentUrl;

    const isLocalhost =
      currentHostname === 'localhost' ||
      currentHostname === '127.0.0.1' ||
      currentHostname.startsWith('192.168.') ||
      currentHostname.startsWith('10.') ||
      currentHostname.endsWith('.local');

    if (!currentUrl.startsWith(targetDomain) && !isLocalhost) {
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;
      const currentHash = window.location.hash;
      let redirectUrl = targetDomain;
      if (currentPath && currentPath !== '/') {
        redirectUrl = redirectUrl.replace(/\/$/, '') + currentPath;
      }
      redirectUrl += currentSearch + currentHash;
      window.location.replace(redirectUrl);
    }
  }, []);

  const handleDownloadRequest = async (options?: GridDownloadOptions) => {
    try {
      setIsDownloading(true);
      await downloadImage({
        mappedPixelData,
        gridDimensions,
        colorCounts,
        totalBeadCount,
        options: options || downloadOptions,
        activeBeadPalette,
        selectedColorSystem,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAutoRemoveBackground = () => {
    if (!mappedPixelData || !gridDimensions) {
      alert('请先生成图纸后再使用一键去背景。');
      return;
    }

    const { N, M } = gridDimensions;
    const borderCounts = new Map<string, number>();

    const countBorderCell = (row: number, col: number) => {
      const cell = mappedPixelData[row]?.[col];
      if (!cell || cell.isExternal || cell.key === TRANSPARENT_KEY) return;
      borderCounts.set(cell.key, (borderCounts.get(cell.key) || 0) + 1);
    };

    for (let col = 0; col < N; col++) {
      countBorderCell(0, col);
      if (M > 1) countBorderCell(M - 1, col);
    }
    for (let row = 1; row < M - 1; row++) {
      countBorderCell(row, 0);
      if (N > 1) countBorderCell(row, N - 1);
    }

    if (borderCounts.size === 0) {
      alert('边缘没有可识别的背景颜色。');
      return;
    }

    let targetKey = '';
    let maxCount = -1;
    borderCounts.forEach((count, key) => {
      if (count > maxCount) {
        maxCount = count;
        targetKey = key;
      }
    });

    const newPixelData = mappedPixelData.map(row => row.map(cell => ({ ...cell })));
    const visited = Array(M).fill(null).map(() => Array(N).fill(false));
    const stack: { row: number; col: number }[] = [];

    const pushIfTarget = (row: number, col: number) => {
      if (row < 0 || row >= M || col < 0 || col >= N || visited[row][col]) {
        return;
      }
      const cell = newPixelData[row][col];
      if (!cell || cell.isExternal || cell.key !== targetKey) return;
      visited[row][col] = true;
      stack.push({ row, col });
    };

    for (let col = 0; col < N; col++) {
      pushIfTarget(0, col);
      if (M > 1) pushIfTarget(M - 1, col);
    }
    for (let row = 1; row < M - 1; row++) {
      pushIfTarget(row, 0);
      if (N > 1) pushIfTarget(row, N - 1);
    }

    if (stack.length === 0) {
      alert('未找到可去除的背景区域。');
      return;
    }

    while (stack.length > 0) {
      const { row, col } = stack.pop()!;
      newPixelData[row][col] = { ...transparentColorData };
      pushIfTarget(row - 1, col);
      pushIfTarget(row + 1, col);
      pushIfTarget(row, col - 1);
      pushIfTarget(row, col + 1);
    }

    applyPixelDataChange(newPixelData, '自动去除背景', 'auto-background-remove');
    const newColorCounts: { [hexKey: string]: { count: number; color: string } } = {};
    newPixelData.flat().forEach(cell => {
      if (cell && !cell.isExternal && cell.key !== TRANSPARENT_KEY) {
        const cellHex = cell.color.toUpperCase();
        newColorCounts[cellHex] = newColorCounts[cellHex] ?? { count: 0, color: cellHex };
        newColorCounts[cellHex].count++;
      }
    });
    setInitialGridColorKeys(new Set(Object.keys(newColorCounts)));
  };

  const handleCanvasInteraction = (
    clientX: number, 
    clientY: number, 
    pageX: number, 
    pageY: number, 
    isClick: boolean = false,
    isTouchEnd: boolean = false
  ) => {
    if (isTouchEnd) {
      setTooltipData(null);
      return;
    }

    const canvas = pixelatedCanvasRef.current;
    if (!canvas || !mappedPixelData || !gridDimensions) {
      setTooltipData(null);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    const { N, M } = gridDimensions;
    const cellWidthOutput = canvas.width / N;
    const cellHeightOutput = canvas.height / M;

    const i = Math.floor(canvasX / cellWidthOutput);
    const j = Math.floor(canvasY / cellHeightOutput);

    if (i >= 0 && i < N && j >= 0 && j < M) {
      const cellData = mappedPixelData[j][i];

      // 颜色替换模式逻辑 - 选择源颜色
      if (isClick && colorReplaceState.isActive && colorReplaceState.step === 'select-source') {
        if (cellData && !cellData.isExternal && cellData.key && cellData.key !== TRANSPARENT_KEY) {
          // 执行选择源颜色
          handleCanvasColorSelect({
            key: cellData.key,
            color: cellData.color
          });
          setTooltipData(null);
        }
        return;
      }

      // 一键擦除模式逻辑
      if (isClick && isEraseMode) {
        if (cellData && !cellData.isExternal && cellData.key && cellData.key !== TRANSPARENT_KEY) {
          // 执行洪水填充擦除（使用 pixelEditingUtils 中的纯函数版本）
          if (mappedPixelData && gridDimensions) {
            const newPixelData = floodFillErase(mappedPixelData, gridDimensions, j, i, cellData.key);
            applyPixelDataChange(newPixelData, '区域擦除', 'erase-region');
          }
          setIsEraseMode(false); // 擦除完成后退出擦除模式
          setTooltipData(null);
        }
        return;
      }

      // Manual Coloring Logic - 保持原有的上色逻辑
      if (isClick && isManualColoringMode && selectedColor) {
        // 手动上色模式逻辑保持不变
        // ...现有代码...
        const newPixelData = mappedPixelData.map(row => row.map(cell => ({ ...cell })));
        const currentCell = newPixelData[j]?.[i];

        if (!currentCell) return;

        const previousKey = currentCell.key;
        const wasExternal = currentCell.isExternal;
        
        let newCellData: MappedPixel;
        
        if (selectedColor.key === TRANSPARENT_KEY) {
          newCellData = { ...transparentColorData };
        } else {
          newCellData = { ...selectedColor, isExternal: false };
        }

        if (newCellData.key !== previousKey || newCellData.isExternal !== wasExternal) {
          newPixelData[j][i] = newCellData;
          applyPixelDataChange(newPixelData, '单格上色', 'paint-single');
        }
        
        // 上色操作后隐藏提示
        setTooltipData(null);
      }
      // Tooltip Logic (非手动上色模式点击或悬停)
      else if (!isManualColoringMode) {
        // 只有单元格实际有内容（非背景/外部区域）才会显示提示
        if (cellData && !cellData.isExternal && cellData.key) {
          // 检查是否已经显示了提示框，并且是否点击的是同一个位置
          // 对于移动设备，位置可能有细微偏差，所以我们检查单元格索引而不是具体坐标
          if (tooltipData) {
            // 如果已经有提示框，计算当前提示框对应的格子的索引
            const tooltipRect = canvas.getBoundingClientRect();
            
            // 还原提示框位置为相对于canvas的坐标
            const prevX = tooltipData.x; // 页面X坐标
            const prevY = tooltipData.y; // 页面Y坐标
            
            // 转换为相对于canvas的坐标
            const prevCanvasX = (prevX - tooltipRect.left) * scaleX;
            const prevCanvasY = (prevY - tooltipRect.top) * scaleY;
            
            // 计算之前显示提示框位置对应的网格索引
            const prevCellI = Math.floor(prevCanvasX / cellWidthOutput);
            const prevCellJ = Math.floor(prevCanvasY / cellHeightOutput);
            
            // 如果点击的是同一个格子，则切换tooltip的显示/隐藏状态
            if (i === prevCellI && j === prevCellJ) {
              setTooltipData(null); // 隐藏提示
              return;
            }
          }
          
          // 计算相对于main元素的位置
          const mainElement = mainRef.current;
          if (mainElement) {
            const mainRect = mainElement.getBoundingClientRect();
            // 计算相对于main元素的坐标
            const relativeX = pageX - mainRect.left - window.scrollX;
            const relativeY = pageY - mainRect.top - window.scrollY;
            
            // 如果是移动/悬停到一个新的有效格子，或者点击了不同的格子，则显示提示
            setTooltipData({
              x: relativeX,
              y: relativeY,
              key: cellData.key,
              color: cellData.color,
            });
          } else {
            // 如果没有找到main元素，使用原始坐标
            setTooltipData({
              x: pageX,
              y: pageY,
              key: cellData.key,
              color: cellData.color,
            });
          }
        } else {
          // 如果点击/悬停在外部区域或背景上，隐藏提示
          setTooltipData(null);
        }
      }
    } else {
      // 如果点击/悬停在画布外部，隐藏提示
      setTooltipData(null);
    }
  };

  // 新增：处理颜色高亮
  const handleHighlightColor = (colorHex: string) => {
    setHighlightColorKey(colorHex);
  };

  // 新增：高亮完成回调
  const handleHighlightComplete = () => {
    setHighlightColorKey(null);
  };

  // 新增：处理颜色选择，同时管理模式切换
  const handleColorSelect = (colorData: { key: string; color: string; isExternal?: boolean }) => {
    // 如果选择的是橡皮擦（透明色）且当前在颜色替换模式，退出替换模式
    if (colorData.key === TRANSPARENT_KEY && colorReplaceState.isActive) {
      setColorReplaceState({
        isActive: false,
        step: 'select-source'
      });
      setHighlightColorKey(null);
    }
    
    // 选择任何颜色（包括橡皮擦）时，都应该退出一键擦除模式
    if (isEraseMode) {
      setIsEraseMode(false);
    }
    
    // 设置选中的颜色
    setSelectedColor(colorData);
  };

  // 新增：颜色替换相关处理函数
  const handleColorReplaceToggle = () => {
    setColorReplaceState(prev => {
      if (prev.isActive) {
        // 退出替换模式
        return {
          isActive: false,
          step: 'select-source'
        };
      } else {
        // 进入替换模式
        // 只退出冲突的模式，但保持在手动上色模式下
        setIsEraseMode(false);
        setSelectedColor(null);
        return {
          isActive: true,
          step: 'select-source'
        };
      }
    });
  };

  // 新增：处理从画布选择源颜色
  const handleCanvasColorSelect = (colorData: { key: string; color: string }) => {
    if (colorReplaceState.isActive && colorReplaceState.step === 'select-source') {
      // 高亮显示选中的颜色
      setHighlightColorKey(colorData.color);
      // 进入第二步：选择目标颜色
      setColorReplaceState({
        isActive: true,
        step: 'select-target',
        sourceColor: colorData
      });
    }
  };

  // 新增：执行颜色替换
  const handleColorReplace = (sourceColor: { key: string; color: string }, targetColor: { key: string; color: string }) => {
    if (!mappedPixelData || !gridDimensions) return;

    const { N, M } = gridDimensions;
    const newPixelData = mappedPixelData.map(row => row.map(cell => ({ ...cell })));
    let replaceCount = 0;

    // 遍历所有像素，替换匹配的颜色
    for (let j = 0; j < M; j++) {
      for (let i = 0; i < N; i++) {
        const currentCell = newPixelData[j][i];
        if (currentCell && !currentCell.isExternal && 
            currentCell.color.toUpperCase() === sourceColor.color.toUpperCase()) {
          // 替换颜色
          newPixelData[j][i] = {
            key: targetColor.key,
            color: targetColor.color,
            isExternal: false
          };
          replaceCount++;
        }
      }
    }

    if (replaceCount > 0) {
      applyPixelDataChange(newPixelData, `将 ${sourceColor.key} 替换为 ${targetColor.key}`, 'replace-color');
      console.log(`颜色替换完成：将 ${replaceCount} 个 ${sourceColor.key} 替换为 ${targetColor.key}`);
    }

    // 退出替换模式
    setColorReplaceState({
      isActive: false,
      step: 'select-source'
    });
    
    // 清除高亮
    setHighlightColorKey(null);
  };

  // 生成完整色板数据（用户自定义色板中选中的所有颜色）
  const fullPaletteColors = useMemo(() => {
    const selectedColors: { key: string; color: string }[] = [];
    
    Object.entries(customPaletteSelections).forEach(([hexValue, isSelected]) => {
      if (isSelected) {
        // 根据选择的色号系统获取显示的色号
        const displayKey = getColorKeyByHex(hexValue, selectedColorSystem);
        selectedColors.push({
          key: displayKey,
          color: hexValue
        });
      }
    });
    
    // 使用色相排序而不是色号排序
    return sortColorsByHue(selectedColors);
  }, [customPaletteSelections, selectedColorSystem]);

  return (
    <>
    {/* PWA 安装按钮 */}
    
    {/* ++ 修改：添加 onLoad 回调函数 ++ */}
    <Script
      async
      src="//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"
      strategy="lazyOnload"
      onLoad={() => {
        const basePV = 378536; // ++ 预设 PV 基数 ++
        const baseUV = 257864; // ++ 预设 UV 基数 ++

        const updateCount = (spanId: string, baseValue: number) => {
          const targetNode = document.getElementById(spanId);
          if (!targetNode) return;

          const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
              if (mutation.type === 'childList' || mutation.type === 'characterData') {
                const currentValueText = targetNode.textContent?.trim() || '0';
                if (currentValueText !== '...') {
                  const currentValue = parseInt(currentValueText.replace(/,/g, ''), 10) || 0;
                  targetNode.textContent = (currentValue + baseValue).toLocaleString();
                  observer.disconnect(); // ++ 更新后停止观察 ++ 
                  // console.log(`Updated ${spanId} from ${currentValueText} to ${targetNode.textContent}`);
                  break; // 处理完第一个有效更新即可
                }
              }
            }
          });

          observer.observe(targetNode, { childList: true, characterData: true, subtree: true });

          // ++ 处理初始值已经是数字的情况 (如果脚本加载很快) ++
          const initialValueText = targetNode.textContent?.trim() || '0';
          if (initialValueText !== '...') {
             const initialValue = parseInt(initialValueText.replace(/,/g, ''), 10) || 0;
             targetNode.textContent = (initialValue + baseValue).toLocaleString();
             observer.disconnect(); // 已更新，无需再观察
          }
        };

        updateCount('busuanzi_value_site_pv', basePV);
        updateCount('busuanzi_value_site_uv', baseUV);
      }}
    />

    {/* Apply dark mode styles to the main container */}
    <div className="min-h-screen p-4 sm:p-6 flex flex-col items-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 font-[family-name:var(--font-geist-sans)] overflow-x-hidden">
      <HomeHeroHeader />

      {/* Apply dark mode styles to the main section */}
      <main ref={mainRef} className="w-full md:max-w-5xl flex flex-col items-center space-y-4 sm:space-y-5 relative overflow-hidden">
        {/* Apply dark mode styles to the Drop Zone */}
        <div
          onDrop={handleDrop} onDragOver={handleDragOver} onDragEnter={handleDragOver}
          onClick={isMounted ? triggerFileInput : undefined}
          className={`w-full md:max-w-2xl rounded-[1.75rem] border border-white/70 bg-white/85 p-6 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/85 sm:p-8 ${isMounted ? 'cursor-pointer hover:border-sky-300 hover:bg-sky-50/70 dark:hover:border-sky-500 dark:hover:bg-gray-800' : 'cursor-wait'} transition-all duration-300`}
        >
          <div className="flex flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-pink-200 px-6 py-10 dark:border-gray-600">
          {/* Icon color */}
          <svg xmlns="http://www.w3.org/2000/svg" className="mb-3 h-10 w-10 text-pink-400 dark:text-pink-300 sm:h-12 sm:w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 sm:text-base">
            拖放图片到这里，或
            <span className="mx-1 text-sky-500 dark:text-sky-300">点击选择文件</span>
            开始生成图纸
          </p>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 sm:text-sm">
            支持 JPG、PNG 图片，或导入 CSV 数据文件
          </p>
          </div>
        </div>

        {/* Apply dark mode styles to the Tip Box */}
        {!originalImageSrc && (
          <div className="w-full md:max-w-2xl rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-pink-50 p-3.5 shadow-sm dark:border-gray-700 dark:from-gray-800 dark:via-gray-800 dark:to-gray-700">
            {/* Icon color */}
            <p className="text-xs text-indigo-700 dark:text-indigo-300 flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 flex-shrink-0 text-blue-500 dark:text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {/* Text color */}
              <span className="text-indigo-700 dark:text-indigo-300">小贴士：使用像素图进行转换前，请确保图片的边缘吻合像素格子的边界线，这样可以获得更精确的切割效果和更好的成品。</span>
            </p>
          </div>
        )}

                      <input type="file" accept="image/jpeg, image/png, .csv, text/csv, application/csv, text/plain" onChange={handleFileChange} ref={fileInputRef} className="hidden" />

        {/* Controls and Output Area */}
        {originalImageSrc && (
          <div className="w-full flex flex-col items-center space-y-5 sm:space-y-6">
            {!isManualColoringMode && (
              <HomeControlsPanel
                granularityInput={granularityInput}
                similarityThresholdInput={similarityThresholdInput}
                pixelationMode={pixelationMode}
                selectedColorSystem={selectedColorSystem}
                customPaletteSelections={customPaletteSelections}
                isCustomPalette={isCustomPalette}
                mappedPixelData={mappedPixelData}
                gridDimensions={gridDimensions}
                handleGranularityInputChange={handleGranularityInputChange}
                handleSimilarityThresholdInputChange={handleSimilarityThresholdInputChange}
                handleConfirmParameters={handleConfirmParameters}
                handlePixelationModeChange={handlePixelationModeChange}
                handleAutoRemoveBackground={handleAutoRemoveBackground}
                setSelectedColorSystem={setSelectedColorSystem}
                setIsCustomPaletteEditorOpen={setIsCustomPaletteEditorOpen}
              />
            )}

            <HomePaletteModal
              isOpen={isCustomPaletteEditorOpen}
              allColors={fullBeadPalette}
              currentSelections={customPaletteSelections}
              onSelectionChange={handleSelectionChange}
              onSaveCustomPalette={handleSaveCustomPalette}
              onClose={() => setIsCustomPaletteEditorOpen(false)}
              onExportCustomPalette={handleExportCustomPalette}
              onImportPaletteFile={handleImportPaletteFile}
              selectedColorSystem={selectedColorSystem}
            />

            {/* Output Section */}
            <div className="w-full md:max-w-2xl">
              <canvas ref={originalCanvasRef} className="hidden"></canvas>

              {/* ++ 手动编辑模式提示信息 ++ */}
              {isManualColoringMode && mappedPixelData && gridDimensions && (
                <div className="w-full mb-4 p-3 bg-blue-50 dark:bg-gray-800 rounded-lg shadow-sm border border-blue-100 dark:border-gray-700">
                  <div className="flex justify-center">
                    <div className="bg-blue-50 dark:bg-gray-700 border border-blue-100 dark:border-gray-600 rounded-lg p-2 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 text-xs text-gray-600 dark:text-gray-300 w-full sm:w-auto">
                      <div className="flex items-center gap-1 w-full sm:w-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <span>使用右上角菜单操作</span>
                      </div>
                      <span className="hidden sm:inline text-gray-300 dark:text-gray-500">|</span>
                      <div className="flex items-center gap-1 w-full sm:w-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span>推荐电脑操作，上色更精准</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Canvas Preview Container */}
              {/* Apply dark mode styles */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-100 dark:border-gray-700">
                {/* 大画布提示信息 */}
                {gridDimensions && gridDimensions.N > 100 && (
                  <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-700 dark:text-blue-300 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>高精度网格 ({gridDimensions.N}×{gridDimensions.M}) - 画布已自动放大，可左右滚动、放大查看精细图像</span>
                    </div>
                  </div>
                )}
                 {/* Inner container background - 允许水平滚动以适应大画布 */}
                <div className="flex justify-center mb-3 sm:mb-4 bg-gray-100 dark:bg-gray-700 p-2 rounded-lg overflow-x-auto overflow-y-hidden"
                     style={{ minHeight: '150px' }}>
                  {/* PixelatedPreviewCanvas component needs internal changes for dark mode drawing */}
                  <PixelatedPreviewCanvas
                    canvasRef={pixelatedCanvasRef}
                    mappedPixelData={mappedPixelData}
                    gridDimensions={gridDimensions}
                    isManualColoringMode={isManualColoringMode}
                    onInteraction={handleCanvasInteraction}
                    highlightColorKey={highlightColorKey}
                    onHighlightComplete={handleHighlightComplete}
                    isCanvasLocked={isCanvasLocked}
                  />
                </div>
              </div>
            </div>
          </div> // This closes the main div started after originalImageSrc check
        )}

        {originalImageSrc && mappedPixelData && difficultyEstimate && (
          <div className="w-full md:max-w-2xl mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-center text-xs text-blue-700 shadow-sm dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
            <div>
              <div className="font-semibold">难度</div>
              <div className="mt-1 text-sm">{difficultyEstimate.level === 'easy' ? '简单' : difficultyEstimate.level === 'medium' ? '中等' : difficultyEstimate.level === 'hard' ? '困难' : '专家'}</div>
            </div>
            <div>
              <div className="font-semibold">预计耗时</div>
              <div className="mt-1 text-sm">{difficultyEstimate.estimatedMinutes} 分钟</div>
            </div>
            <div>
              <div className="font-semibold">碎片区域</div>
              <div className="mt-1 text-sm">{difficultyEstimate.factors.totalRegions} 块</div>
            </div>
          </div>
        )}

        {/* ++ HIDE Color Counts in manual mode ++ */}
        {!isManualColoringMode && originalImageSrc && colorCounts && Object.keys(colorCounts).length > 0 && (
          // Apply dark mode styles to color counts container
          <div className="w-full md:max-w-2xl mt-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-100 dark:border-gray-700 color-stats-panel">
            {/* Title color */}
            <h3 className="text-lg font-semibold mb-1 text-gray-700 dark:text-gray-200 text-center">
              去除杂色 
            </h3>
            {/* Subtitle color */}
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-3">点击下方列表中的颜色可将其从可用列表中排除。总计: {totalBeadCount} 颗</p>
            <ul className="space-y-1 max-h-60 overflow-y-auto pr-2 text-sm">
              {Object.keys(colorCounts)
                .sort(sortColorKeys)
                .map((hexKey) => {
                  // 现在key是hex值，需要通过hex获取对应色号系统的色号
                  const displayColorKey = getColorKeyByHex(hexKey, selectedColorSystem);
                  const isExcluded = excludedColorKeys.has(hexKey);
                  const count = colorCounts[hexKey].count;
                  const colorHex = colorCounts[hexKey].color;

                  return (
                    <li
                      key={hexKey}
                      onClick={() => handleToggleExcludeColor(hexKey)}
                       // Apply dark mode styles for list items (normal and excluded)
                      className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${ 
                        isExcluded
                          ? 'bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800/60 opacity-60 dark:opacity-70' // Darker red background for excluded
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={isExcluded ? `点击恢复 ${displayColorKey}` : `点击排除 ${displayColorKey}`}
                    >
                      <div className={`flex items-center space-x-2 ${isExcluded ? 'line-through' : ''}`}>
                        {/* Adjust color swatch border */}
                        <span
                          className="inline-block w-4 h-4 rounded border border-gray-400 dark:border-gray-500 flex-shrink-0"
                          style={{ backgroundColor: isExcluded ? '#666' : colorHex }} // Darker gray for excluded swatch
                        ></span>
                        {/* Adjust text color for key (normal and excluded) */}
                        <span className={`font-mono font-medium ${isExcluded ? 'text-red-700 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>{displayColorKey}</span>
                      </div>
                      {/* Adjust text color for count (normal and excluded) */}
                      <span className={`text-xs ${isExcluded ? 'text-red-600 dark:text-red-400 line-through' : 'text-gray-600 dark:text-gray-300'}`}>{count} 颗</span>
                    </li>
                  );
                })}
            </ul>
            {excludedColorKeys.size > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowExcludedColors(prev => !prev)}
                    className="w-full text-xs py-1.5 px-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors flex items-center justify-between"
                  >
                    <span>已排除的颜色 ({excludedColorKeys.size})</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 text-gray-500 dark:text-gray-400 transform transition-transform ${showExcludedColors ? 'rotate-180' : ''}`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showExcludedColors && (
                    <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-gray-100 dark:bg-gray-800">
                      <div className="max-h-40 overflow-y-auto">
                        {Array.from(excludedColorKeys).length > 0 ? (
                          <ul className="space-y-1">
                            {Array.from(excludedColorKeys).sort(sortColorKeys).map(hexKey => {
                              const colorData = fullBeadPalette.find(color => color.hex.toUpperCase() === hexKey.toUpperCase());
                              return (
                                <li key={hexKey} className="flex justify-between items-center p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                                  <div className="flex items-center space-x-2">
                                    <span
                                      className="inline-block w-4 h-4 rounded border border-gray-400 dark:border-gray-500 flex-shrink-0"
                                      style={{ backgroundColor: colorData?.hex || hexKey }}
                                    ></span>
                                    <span className="font-mono text-xs text-gray-800 dark:text-gray-200">{getColorKeyByHex(hexKey, selectedColorSystem)}</span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      handleToggleExcludeColor(hexKey);
                                    }}
                                    className="text-xs py-0.5 px-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/40"
                                  >
                                    恢复
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="text-xs text-center text-gray-500 dark:text-gray-400 py-2">
                            没有排除的颜色
                          </p>
                        )}
                      </div>
                      
                      <button
                        onClick={() => {
                          resetExcludedColors();
                          setIsManualColoringMode(false);
                          setSelectedColor(null);
                        }}
                        className="mt-2 w-full text-xs py-1 px-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                      >
                        一键恢复所有颜色
                      </button>
                    </div>
                  )}
                </div>
            )}
          </div>
        )} {/* ++ End of HIDE Color Counts ++ */}

        {/* Message if palette becomes empty (Also hide in manual mode) */}
         {!isManualColoringMode && originalImageSrc && activeBeadPalette.length === 0 && excludedColorKeys.size > 0 && (
             // Apply dark mode styles to the warning box
             <div className="w-full md:max-w-2xl mt-6 bg-yellow-100 dark:bg-yellow-900/50 p-4 rounded-lg shadow border border-yellow-200 dark:border-yellow-800/60 text-center text-sm text-yellow-800 dark:text-yellow-300">
                 当前可用颜色过少或为空。请在上方统计列表中查看已排除的颜色并恢复部分，或更换色板。
                 {excludedColorKeys.size > 0 && (
                      // Apply dark mode styles to the inline "restore all" button
                      <button
                          onClick={() => {
                            setShowExcludedColors(true); // 展开排除颜色列表
                            // 滚动到颜色列表处
                            setTimeout(() => {
                              const listElement = document.querySelector('.color-stats-panel');
                              if (listElement) {
                                listElement.scrollIntoView({ behavior: 'smooth' });
                              }
                            }, 100);
                          }}
                          className="mt-2 ml-2 text-xs py-1 px-2 bg-yellow-200 dark:bg-yellow-700/60 text-yellow-900 dark:text-yellow-200 rounded hover:bg-yellow-300 dark:hover:bg-yellow-600/70 transition-colors"
                      >
                          查看已排除颜色 ({excludedColorKeys.size})
                      </button>
                  )}
             </div>
         )}

        {/* ++ RENDER Enter Manual Mode Button ONLY when NOT in manual mode (before downloads) ++ */}
        {!isManualColoringMode && originalImageSrc && mappedPixelData && gridDimensions && (
            <div className="w-full md:max-w-2xl mt-4 space-y-3"> {/* Wrapper div */} 
             {/* Manual Edit Mode Button */}
             <button
                onClick={() => {
                  setIsManualColoringMode(true); // Enter mode
                  setSelectedColor(null);
                  setTooltipData(null);
                }}
                className={`w-full py-2.5 px-4 text-sm sm:text-base rounded-lg transition-all duration-300 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg hover:translate-y-[-1px]`}
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"> <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /> </svg>
                 进入手动编辑模式
             </button>

             {/* Focus Mode Button */}
             <button
                onClick={handleEnterFocusMode}
                className={`w-full py-2.5 px-4 text-sm sm:text-base rounded-lg transition-all duration-300 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg hover:translate-y-[-1px]`}
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                 </svg>
                 进入专心拼豆模式（AplhaTest）
             </button>
            </div>
        )} {/* ++ End of RENDER Enter Manual Mode Button ++ */}

        {/* ++ HIDE Download Buttons in manual mode ++ */}
        {!isManualColoringMode && originalImageSrc && mappedPixelData && (
            <div className="w-full md:max-w-2xl mt-4">
              {/* 使用一个大按钮，现在所有的下载设置都通过弹窗控制 */}
              <button
                onClick={() => setIsDownloadSettingsOpen(true)}
                disabled={!mappedPixelData || !gridDimensions || gridDimensions.N === 0 || gridDimensions.M === 0 || activeBeadPalette.length === 0}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm sm:text-base rounded-lg hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg hover:translate-y-[-1px] disabled:hover:translate-y-0 disabled:hover:shadow-md"
               >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                下载拼豆图纸
              </button>
            </div>
        )} {/* ++ End of HIDE Download Buttons ++ */}

         {/* Tooltip Display (Needs update in GridTooltip.tsx) */}
         {tooltipData && (
            <GridTooltip tooltipData={tooltipData} selectedColorSystem={selectedColorSystem} />
          )}

      </main>

      <div className="md:hidden">
        <MobileEditorToolbar
          isVisible={Boolean(originalImageSrc)}
          activeSheet={activeMobileSheet}
          onOpenSheet={sheet => setActiveMobileSheet(activeMobileSheet === sheet ? null : sheet)}
          onDownload={() => setIsDownloadSettingsOpen(true)}
          onFocusMode={handleEnterFocusMode}
        />

        <EditorBottomSheet title="工具" isOpen={activeMobileSheet === 'tools'} onClose={() => setActiveMobileSheet(null)}>
          <ToolDrawerSheet
            isManualColoringMode={isManualColoringMode}
            isEraseMode={isEraseMode}
            isCanvasLocked={isCanvasLocked}
            canUndo={canUndo}
            canRedo={canRedo}
            onEnterManualMode={() => { setIsManualColoringMode(true); setActiveMobileSheet(null); }}
            onExitManualMode={() => { setIsManualColoringMode(false); setSelectedColor(null); setTooltipData(null); setActiveMobileSheet(null); }}
            onToggleErase={handleEraseToggle}
            onToggleCanvasLock={handleToggleCanvasLock}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onToggleMagnifier={handleToggleMagnifier}
            isMagnifierActive={isMagnifierActive}
          />
        </EditorBottomSheet>

        <EditorBottomSheet title="色板" isOpen={activeMobileSheet === 'palette'} onClose={() => setActiveMobileSheet(null)}>
          <PaletteSheet
            colors={currentGridColors}
            fullPaletteColors={fullPaletteColors}
            selectedColor={selectedColor}
            selectedColorSystem={selectedColorSystem}
            showFullPalette={showFullPalette}
            onToggleFullPalette={handleToggleFullPalette}
            onColorSelect={handleColorSelect}
          />
        </EditorBottomSheet>

        <EditorBottomSheet title="历史" isOpen={activeMobileSheet === 'history'} onClose={() => setActiveMobileSheet(null)}>
          <HistorySheet history={history} onUndo={handleUndo} onRedo={handleRedo} />
        </EditorBottomSheet>

        <EditorBottomSheet title="项目库" isOpen={activeMobileSheet === 'library'} onClose={() => setActiveMobileSheet(null)}>
          <ProjectLibrarySheet
            projects={projectLibrary.projects}
            lastProject={projectLibrary.lastProject}
            palettePresets={projectLibrary.palettePresets}
            isLoading={projectLibrary.isLoading}
            onOpenProject={handleOpenProject}
            onToggleFavorite={handleToggleProjectFavorite}
            onDeleteProject={handleDeleteProject}
            onApplyPalette={handleApplyPalettePreset}
            onDeletePalette={handleDeletePalettePreset}
          />
        </EditorBottomSheet>
      </div>

      {/* 悬浮工具栏 */}
      <FloatingToolbar
        isManualColoringMode={isManualColoringMode}
        isPaletteOpen={isFloatingPaletteOpen}
        onTogglePalette={() => setIsFloatingPaletteOpen(!isFloatingPaletteOpen)}
        onExitManualMode={() => {
          setIsManualColoringMode(false);
          setSelectedColor(null);
          setTooltipData(null);
          setIsEraseMode(false);
          setColorReplaceState({
            isActive: false,
            step: 'select-source'
          });
          setHighlightColorKey(null);
          setIsMagnifierActive(false);
          setMagnifierSelectionArea(null);
        }}
        onToggleMagnifier={handleToggleMagnifier}
        isMagnifierActive={isMagnifierActive}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* 悬浮调色盘 */}
      {isManualColoringMode && (
        <FloatingColorPalette
          colors={currentGridColors}
          selectedColor={selectedColor}
          onColorSelect={handleColorSelect}
          selectedColorSystem={selectedColorSystem}
          isEraseMode={isEraseMode}
          onEraseToggle={handleEraseToggle}
          fullPaletteColors={fullPaletteColors}
          showFullPalette={showFullPalette}
          onToggleFullPalette={handleToggleFullPalette}
          colorReplaceState={colorReplaceState}
          onColorReplaceToggle={handleColorReplaceToggle}
          onColorReplace={handleColorReplace}
          onHighlightColor={handleHighlightColor}
          isOpen={isFloatingPaletteOpen}
          onToggleOpen={() => setIsFloatingPaletteOpen(!isFloatingPaletteOpen)}
          isActive={activeFloatingTool === 'palette'}
          onActivate={handleActivatePalette}
        />
      )}

      {/* 放大镜工具 */}
      {isManualColoringMode && (
        <>
          <MagnifierTool
            isActive={isMagnifierActive}
            onToggle={handleToggleMagnifier}
            mappedPixelData={mappedPixelData}
            gridDimensions={gridDimensions}
            selectedColor={selectedColor}
            selectedColorSystem={selectedColorSystem}
            onPixelEdit={handleMagnifierPixelEdit}
            cellSize={gridDimensions ? Math.min(6, Math.max(4, 500 / Math.max(gridDimensions.N, gridDimensions.M))) : 6}
            selectionArea={magnifierSelectionArea}
            onClearSelection={() => setMagnifierSelectionArea(null)}
            isFloatingActive={activeFloatingTool === 'magnifier'}
            onActivateFloating={handleActivateMagnifier}
            highlightColorKey={highlightColorKey}
          />
          
          {/* 放大镜选择覆盖层 */}
          <MagnifierSelectionOverlay
            isActive={isMagnifierActive && !magnifierSelectionArea}
            canvasRef={pixelatedCanvasRef}
            gridDimensions={gridDimensions}
            cellSize={gridDimensions ? Math.min(6, Math.max(4, 500 / Math.max(gridDimensions.N, gridDimensions.M))) : 6}
            onSelectionComplete={setMagnifierSelectionArea}
          />
        </>
      )}

      {/* Apply dark mode styles to the Footer */}
      <footer className="w-full md:max-w-5xl mt-8 mb-6 rounded-[1.75rem] border border-gray-100 bg-gradient-to-b from-white to-gray-50 px-6 py-6 text-center text-xs text-gray-500 shadow-inner dark:border-gray-700 dark:from-gray-900 dark:to-gray-800/50 dark:text-gray-400 sm:text-sm">
        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
          一个送给婷婷的拼豆小网站，用来整理作品灵感、生成底稿和记录每次完成的成就感。
        </p>
        <p className="font-medium text-gray-600 dark:text-gray-300">
          婷婷的拼豆工坊 &copy; {new Date().getFullYear()}
        </p>
      </footer>

      {/* 使用导入的下载设置弹窗组件 */}
      <DownloadSettingsModal
        isOpen={isDownloadSettingsOpen}
        onClose={() => setIsDownloadSettingsOpen(false)}
        options={downloadOptions}
        onOptionsChange={setDownloadOptions}
        onDownload={handleDownloadRequest}
        isLoading={isDownloading}
      />

      {/* 专心拼豆模式进入前下载提醒弹窗 */}
      <FocusModePreDownloadModal
        isOpen={isFocusModePreDownloadModalOpen}
        onClose={() => setIsFocusModePreDownloadModalOpen(false)}
        onProceedWithoutDownload={handleProceedToFocusMode}
        mappedPixelData={mappedPixelData}
        gridDimensions={gridDimensions}
        selectedColorSystem={selectedColorSystem}
      />
    </div>
   </>
  );
}
