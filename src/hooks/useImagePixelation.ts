import { useState, useEffect, useRef, useCallback, ChangeEvent, DragEvent } from 'react';
import { PaletteColor, PixelationMode, MappedPixel } from '../utils/pixelation';
import { processPixelation } from '../utils/pixelationProcessor';
import { importCsvData } from '../utils/imageDownloader';
import { recalculateColorStats } from '../utils/colorStatsUtils';

export interface PixelationResult {
  mappedPixelData: MappedPixel[][];
  gridDimensions: { N: number; M: number };
  colorCounts: { [key: string]: { count: number; color: string } };
  totalBeadCount: number;
  originalImageSrc: string;
}

interface UseImagePixelationOptions {
  /** 当前可用调色板（已应用排除逻辑） */
  activeBeadPalette: PaletteColor[];
  /** 像素化结果完成后的回调 */
  onPixelationComplete: (result: PixelationResult) => void;
  /** 需要退出手动编辑模式时的回调 */
  onExitManualMode: () => void;
  /** 排除颜色重置回调（新文件时） */
  onResetExcludedColors: () => void;
}

export function useImagePixelation({
  activeBeadPalette,
  onPixelationComplete,
  onExitManualMode,
  onResetExcludedColors,
}: UseImagePixelationOptions) {
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<number>(100);
  const [granularityInput, setGranularityInput] = useState<string>('100');
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0);
  const [similarityThresholdInput, setSimilarityThresholdInput] = useState<string>('0');
  const [pixelationMode, setPixelationMode] = useState<PixelationMode>(PixelationMode.Dominant);
  const [remapTrigger, setRemapTrigger] = useState<number>(0);

  // Canvas refs 由本 Hook 创建并向上暴露
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const pixelatedCanvasRef = useRef<HTMLCanvasElement>(null);

  // 同步输入框和实际值
  useEffect(() => {
    setGranularityInput(granularity.toString());
    setSimilarityThresholdInput(similarityThreshold.toString());
  }, [granularity, similarityThreshold]);

  // 核心像素化 Effect
  useEffect(() => {
    if (!originalImageSrc || activeBeadPalette.length === 0) return;
    if (!originalCanvasRef.current || !pixelatedCanvasRef.current) return;

    const timeoutId = setTimeout(() => {
      const originalCanvas = originalCanvasRef.current;
      const pixelatedCanvas = pixelatedCanvasRef.current;
      if (!originalCanvas || !pixelatedCanvas) return;

      const originalCtx = originalCanvas.getContext('2d', { willReadFrequently: true });
      const pixelatedCtx = pixelatedCanvas.getContext('2d');
      if (!originalCtx || !pixelatedCtx) return;

      const img = new window.Image();

      img.onerror = () => {
        console.error('图片加载失败');
        setOriginalImageSrc(null);
      };

      img.onload = () => {
        const aspectRatio = img.height / img.width;
        const N = granularity;
        const baseWidth = 500;
        const minCellSize = 4;
        const recommendedCellSize = 6;

        let outputWidth = baseWidth;
        if (N > 100) {
          const maxWidth = Math.min(1200, window.innerWidth * 0.9);
          outputWidth = Math.min(
            maxWidth,
            Math.max(baseWidth, N * recommendedCellSize, N * minCellSize)
          );
        }
        const outputHeight = Math.round(outputWidth * aspectRatio);

        originalCanvas.width = img.width;
        originalCanvas.height = img.height;
        pixelatedCanvas.width = outputWidth;
        pixelatedCanvas.height = outputHeight;

        originalCtx.drawImage(img, 0, 0, img.width, img.height);

        try {
          const result = processPixelation({
            originalCtx,
            imgWidth: img.width,
            imgHeight: img.height,
            granularity,
            similarityThreshold,
            palette: activeBeadPalette,
            mode: pixelationMode,
          });

          onPixelationComplete({
            ...result,
            originalImageSrc,
          });
        } catch (err) {
          console.error('像素化处理失败:', err);
          if (err instanceof Error) {
            alert(err.message);
          }
        }
      };

      img.src = originalImageSrc;
      onExitManualMode();
    }, 50);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalImageSrc, granularity, similarityThreshold, pixelationMode, remapTrigger, activeBeadPalette.length]);

  // 生成合成图（CSV导入时用）
  const generateSyntheticImage = useCallback(
    (pixelData: MappedPixel[][], dimensions: { N: number; M: number }): string => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      const pixelSize = 8;
      canvas.width = dimensions.N * pixelSize;
      canvas.height = dimensions.M * pixelSize;

      pixelData.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          if (cell) {
            ctx.fillStyle = cell.isExternal ? '#FFFFFF' : cell.color;
            ctx.fillRect(colIndex * pixelSize, rowIndex * pixelSize, pixelSize, pixelSize);
          }
        });
      });

      return canvas.toDataURL('image/png');
    },
    []
  );

  // 处理文件（图片 or CSV）
  const processFile = useCallback(
    (file: File) => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'csv') {
        importCsvData(file)
          .then(({ mappedPixelData, gridDimensions }) => {
            const { colorCounts, totalCount } = recalculateColorStats(mappedPixelData);
            const syntheticImageSrc = generateSyntheticImage(mappedPixelData, gridDimensions);

            setOriginalImageSrc(syntheticImageSrc);
            setGranularity(gridDimensions.N);
            setGranularityInput(gridDimensions.N.toString());

            onPixelationComplete({
              mappedPixelData,
              gridDimensions,
              colorCounts,
              totalBeadCount: totalCount,
              originalImageSrc: syntheticImageSrc,
            });
            onExitManualMode();

            alert(
              `成功导入CSV文件！图纸尺寸：${gridDimensions.N}x${gridDimensions.M}，共使用${Object.keys(colorCounts).length}种颜色。`
            );
          })
          .catch(error => {
            console.error('CSV导入失败:', error);
            alert(`CSV导入失败：${error.message}`);
          });
      } else {
        const reader = new FileReader();
        reader.onload = e => {
          const result = e.target?.result as string;
          setOriginalImageSrc(result);
          const defaultGranularity = 100;
          setGranularity(defaultGranularity);
          setGranularityInput(defaultGranularity.toString());
          setRemapTrigger(prev => prev + 1);
        };
        reader.onerror = () => {
          console.error('文件读取失败');
          alert('无法读取文件。');
        };
        reader.readAsDataURL(file);
        onExitManualMode();
      }
    },
    [generateSyntheticImage, onExitManualMode, onPixelationComplete]
  );

  // 文件验证辅助
  const isAcceptedFile = (file: File): { ok: boolean; type: 'image' | 'csv' | 'unknown' } => {
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();
    const supportedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const supportedCsvTypes = ['text/csv', 'application/csv', 'text/plain'];
    if (supportedImageTypes.includes(fileType) || fileType.startsWith('image/')) {
      return { ok: true, type: 'image' };
    }
    if (supportedCsvTypes.includes(fileType) || fileName.endsWith('.csv')) {
      return { ok: true, type: 'csv' };
    }
    return { ok: false, type: 'unknown' };
  };

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const { ok } = isAcceptedFile(file);
        if (ok) {
          onResetExcludedColors();
          processFile(file);
        } else {
          alert(
            `不支持的文件类型: ${file.type || '未知'}。请选择 JPG、PNG 格式的图片文件，或 CSV 数据文件。\n文件名: ${file.name}`
          );
        }
      }
      if (event.target) event.target.value = '';
    },
    [onResetExcludedColors, processFile]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        const file = event.dataTransfer.files?.[0];
        if (file) {
          const { ok } = isAcceptedFile(file);
          if (ok) {
            onResetExcludedColors();
            processFile(file);
          } else {
            alert(
              `不支持的文件类型: ${file.type || '未知'}。请拖放 JPG、PNG 格式的图片文件，或 CSV 数据文件。\n文件名: ${file.name}`
            );
          }
        }
      } catch (error) {
        console.error('处理拖拽文件时发生错误:', error);
        alert('处理文件时发生错误，请重试。');
      }
    },
    [onResetExcludedColors, processFile]
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleGranularityInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setGranularityInput(event.target.value);
  }, []);

  const handleSimilarityThresholdInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSimilarityThresholdInput(event.target.value);
    },
    []
  );

  const handleConfirmParameters = useCallback(() => {
    const MIN_GRANULARITY = 10;
    const MAX_GRANULARITY = 300;
    const MIN_SIMILARITY = 0;
    const MAX_SIMILARITY = 100;

    let newGranularity = parseInt(granularityInput, 10);
    if (isNaN(newGranularity) || newGranularity < MIN_GRANULARITY) newGranularity = MIN_GRANULARITY;
    if (newGranularity > MAX_GRANULARITY) newGranularity = MAX_GRANULARITY;

    let newSimilarity = parseInt(similarityThresholdInput, 10);
    if (isNaN(newSimilarity) || newSimilarity < MIN_SIMILARITY) newSimilarity = MIN_SIMILARITY;
    if (newSimilarity > MAX_SIMILARITY) newSimilarity = MAX_SIMILARITY;

    const granularityChanged = newGranularity !== granularity;
    const similarityChanged = newSimilarity !== similarityThreshold;

    if (granularityChanged) setGranularity(newGranularity);
    if (similarityChanged) setSimilarityThreshold(newSimilarity);

    if (granularityChanged || similarityChanged) {
      setRemapTrigger(prev => prev + 1);
      onExitManualMode();
    }

    setGranularityInput(newGranularity.toString());
    setSimilarityThresholdInput(newSimilarity.toString());
  }, [granularityInput, similarityThresholdInput, granularity, similarityThreshold, onExitManualMode]);

  const handlePixelationModeChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const newMode = event.target.value as PixelationMode;
      if (Object.values(PixelationMode).includes(newMode)) {
        setPixelationMode(newMode);
        setRemapTrigger(prev => prev + 1);
        onExitManualMode();
      }
    },
    [onExitManualMode]
  );

  const triggerRemap = useCallback(() => {
    setRemapTrigger(prev => prev + 1);
  }, []);

  return {
    // 状态
    originalImageSrc,
    setOriginalImageSrc,
    granularity,
    setGranularity,
    granularityInput,
    setGranularityInput,
    similarityThreshold,
    similarityThresholdInput,
    pixelationMode,
    remapTrigger,

    // Canvas refs
    originalCanvasRef,
    pixelatedCanvasRef,

    // 事件处理函数
    handleFileChange,
    handleDrop,
    handleDragOver,
    handleGranularityInputChange,
    handleSimilarityThresholdInputChange,
    handleConfirmParameters,
    handlePixelationModeChange,
    processFile,
    triggerRemap,
  };
}
