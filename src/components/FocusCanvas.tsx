import React, { useRef, useEffect, useCallback, useState } from 'react';
import { MappedPixel } from '../utils/pixelation';

interface FocusCanvasProps {
  mappedPixelData: MappedPixel[][];
  gridDimensions: { N: number; M: number };
  currentColor: string;
  completedCells: Set<string>;
  recommendedCell: { row: number; col: number } | null;
  recommendedRegion: { row: number; col: number }[] | null;
  canvasScale: number;
  canvasOffset: { x: number; y: number };
  gridSectionInterval: number;
  showSectionLines: boolean;
  sectionLineColor: string;
  onCellClick: (row: number, col: number) => void;
  onScaleChange: (scale: number) => void;
  onOffsetChange: (offset: { x: number; y: number }) => void;
}

const FocusCanvas: React.FC<FocusCanvasProps> = ({
  mappedPixelData,
  gridDimensions,
  currentColor,
  completedCells,
  recommendedCell,
  recommendedRegion,
  canvasScale,
  canvasOffset,
  gridSectionInterval,
  showSectionLines,
  sectionLineColor,
  onCellClick,
  onScaleChange,
  onOffsetChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [lastPanPoint, setLastPanPoint] = useState<{ x: number; y: number } | null>(null);
  const [lastTouchPoint, setLastTouchPoint] = useState<{ x: number; y: number } | null>(null);
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null);
  const [hasTouchMoved, setHasTouchMoved] = useState(false);

  // 计算格子大小
  const cellSize = Math.max(15, Math.min(40, 300 / Math.max(gridDimensions.N, gridDimensions.M)));

  // 渲染画布
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mappedPixelData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布尺寸
    const canvasWidth = gridDimensions.N * cellSize;
    const canvasHeight = gridDimensions.M * cellSize;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    // 清空画布
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 渲染每个格子
    for (let row = 0; row < gridDimensions.M; row++) {
      for (let col = 0; col < gridDimensions.N; col++) {
        const pixel = mappedPixelData[row][col];
        const x = col * cellSize;
        const y = row * cellSize;
        const cellKey = `${row},${col}`;

        // 确定格子颜色
        let fillColor = pixel.color;

        // 如果不是当前颜色，显示为灰度
        if (pixel.color !== currentColor) {
          // 转换为灰度
          const hex = pixel.color.replace('#', '');
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          fillColor = `rgb(${gray}, ${gray}, ${gray})`;
        }

        // 绘制格子背景
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, cellSize, cellSize);

        // 如果是已完成的格子且是当前颜色，添加勾选标记
        if (completedCells.has(cellKey) && pixel.color === currentColor) {
          ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
          ctx.fillRect(x, y, cellSize, cellSize);
          
          // 绘制勾选图标
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + cellSize * 0.2, y + cellSize * 0.5);
          ctx.lineTo(x + cellSize * 0.4, y + cellSize * 0.7);
          ctx.lineTo(x + cellSize * 0.8, y + cellSize * 0.3);
          ctx.stroke();
        }

        // 如果是推荐区域的一部分，添加高亮边框
        const isInRecommendedRegion = recommendedRegion?.some(cell => 
          cell.row === row && cell.col === col
        );
        if (isInRecommendedRegion) {
          ctx.strokeStyle = '#ff4444';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
          ctx.setLineDash([]);
        }
        
        // 如果是推荐区域的中心点，添加特殊标记
        if (recommendedCell && recommendedCell.row === row && recommendedCell.col === col && isInRecommendedRegion) {
          // 绘制中心点标记
          ctx.fillStyle = '#ff4444';
          ctx.beginPath();
          ctx.arc(x + cellSize / 2, y + cellSize / 2, 4, 0, 2 * Math.PI);
          ctx.fill();
        }




      }
    }

    // 绘制分区线（在所有格子绘制完成后）
    if (showSectionLines) {
      ctx.strokeStyle = sectionLineColor;
      ctx.lineWidth = 2;
      
      // 绘制竖直分区线
      for (let col = gridSectionInterval; col < gridDimensions.N; col += gridSectionInterval) {
        const x = col * cellSize;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
      }
      
      // 绘制水平分区线
      for (let row = gridSectionInterval; row < gridDimensions.M; row += gridSectionInterval) {
        const y = row * cellSize;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
      }
    }
  }, [mappedPixelData, gridDimensions, cellSize, currentColor, completedCells, recommendedCell, recommendedRegion, gridSectionInterval, showSectionLines, sectionLineColor]);

  // 处理触摸/鼠标事件
  const getEventPosition = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in event) {
      if (event.touches.length === 0) return null;
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return {
      x: (clientX - rect.left) / canvasScale,
      y: (clientY - rect.top) / canvasScale
    };
  }, [canvasScale]);

  const getGridPosition = useCallback((x: number, y: number) => {
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    
    if (row >= 0 && row < gridDimensions.M && col >= 0 && col < gridDimensions.N) {
      return { row, col };
    }
    return null;
  }, [cellSize, gridDimensions]);

  // 计算两指间距离
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 处理点击
  const handleClick = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    
    const pos = getEventPosition(event);
    if (!pos) return;

    const gridPos = getGridPosition(pos.x, pos.y);
    if (gridPos) {
      onCellClick(gridPos.row, gridPos.col);
    }
  }, [onCellClick, getEventPosition, getGridPosition]);

  // 处理缩放
  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(3, canvasScale * delta));
    onScaleChange(newScale);
  }, [canvasScale, onScaleChange]);

  // 处理双指缩放（触摸）
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (event.touches.length === 1) {
      const point = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
      setLastTouchPoint(point);
      setLastPanPoint(point);
      setLastPinchDistance(null);
      setHasTouchMoved(false);
    } else if (event.touches.length === 2) {
      event.preventDefault();
      setLastTouchPoint(null);
      setLastPanPoint(null);
      setLastPinchDistance(getTouchDistance(event.touches));
      setHasTouchMoved(true);
    }
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    
    if (event.touches.length === 1 && lastPanPoint) {
      const currentPoint = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
      const deltaX = currentPoint.x - lastPanPoint.x;
      const deltaY = currentPoint.y - lastPanPoint.y;
      const totalDeltaX = lastTouchPoint ? Math.abs(currentPoint.x - lastTouchPoint.x) : 0;
      const totalDeltaY = lastTouchPoint ? Math.abs(currentPoint.y - lastTouchPoint.y) : 0;

      if (totalDeltaX > 6 || totalDeltaY > 6) {
        setHasTouchMoved(true);
      }

      onOffsetChange({
        x: canvasOffset.x + deltaX,
        y: canvasOffset.y + deltaY
      });

      setLastPanPoint(currentPoint);
    } else if (event.touches.length === 2 && lastPinchDistance !== null) {
      // 双指缩放处理
      const currentDistance = getTouchDistance(event.touches);
      const scaleRatio = currentDistance / lastPinchDistance;
      
      // 限制缩放范围并应用缩放
      const newScale = Math.max(0.3, Math.min(3, canvasScale * scaleRatio));
      onScaleChange(newScale);
      
      // 更新距离记录
      setLastPinchDistance(currentDistance);
    }
  }, [lastPanPoint, lastTouchPoint, canvasOffset, onOffsetChange, lastPinchDistance, canvasScale, onScaleChange]);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (event.touches.length === 0) {
      const shouldClick = !hasTouchMoved;
      setLastPanPoint(null);
      setLastTouchPoint(null);
      setLastPinchDistance(null);
      setHasTouchMoved(false);

      if (shouldClick) {
        handleClick(event);
      }
    } else if (event.touches.length === 1) {
      setLastPinchDistance(null);
      const point = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
      setLastPanPoint(point);
      setLastTouchPoint(point);
    }
  }, [hasTouchMoved, handleClick]);

  // 鼠标拖拽处理
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const point = {
      x: event.clientX,
      y: event.clientY
    };
    setLastTouchPoint(point);
    setLastPanPoint(point);
    setHasTouchMoved(false);
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (lastPanPoint) {
      const currentPoint = {
        x: event.clientX,
        y: event.clientY
      };
      const deltaX = currentPoint.x - lastPanPoint.x;
      const deltaY = currentPoint.y - lastPanPoint.y;
      const totalDeltaX = lastTouchPoint ? Math.abs(currentPoint.x - lastTouchPoint.x) : 0;
      const totalDeltaY = lastTouchPoint ? Math.abs(currentPoint.y - lastTouchPoint.y) : 0;

      if (totalDeltaX > 6 || totalDeltaY > 6) {
        setHasTouchMoved(true);
      }

      onOffsetChange({
        x: canvasOffset.x + deltaX,
        y: canvasOffset.y + deltaY
      });

      setLastPanPoint(currentPoint);
    }
  }, [lastPanPoint, lastTouchPoint, canvasOffset, onOffsetChange]);

  const handleMouseUp = useCallback(() => {
    setLastPanPoint(null);
    setLastTouchPoint(null);
    setHasTouchMoved(false);
  }, []);

  // 渲染画布
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden bg-gray-100"
      style={{ touchAction: 'none' }}
    >
      <div
        style={{
          transform: `scale(${canvasScale}) translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
          transformOrigin: 'center center'
        }}
      >
        <canvas
          ref={canvasRef}
          className="cursor-crosshair border border-gray-300"
          onClick={handleClick}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
};

export default FocusCanvas;