import React from 'react';

interface ToolDrawerSheetProps {
  isManualColoringMode: boolean;
  isEraseMode: boolean;
  isCanvasLocked: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onEnterManualMode: () => void;
  onExitManualMode: () => void;
  onToggleErase: () => void;
  onToggleCanvasLock: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleMagnifier: () => void;
  isMagnifierActive: boolean;
}

const buttonClass = 'rounded-xl border border-gray-200 bg-white px-3 py-3 text-left text-sm shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700';

const ToolDrawerSheet: React.FC<ToolDrawerSheetProps> = ({
  isManualColoringMode,
  isEraseMode,
  isCanvasLocked,
  canUndo,
  canRedo,
  onEnterManualMode,
  onExitManualMode,
  onToggleErase,
  onToggleCanvasLock,
  onUndo,
  onRedo,
  onToggleMagnifier,
  isMagnifierActive
}) => {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
        手机编辑建议开启画布锁定：一指上色，双指移动/缩放，避免网页滚动误触。
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button className={buttonClass} onClick={isManualColoringMode ? onExitManualMode : onEnterManualMode}>
          <div className="font-medium">{isManualColoringMode ? '退出编辑' : '进入编辑'}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">切换手动上色模式</div>
        </button>
        <button className={buttonClass} onClick={onToggleCanvasLock}>
          <div className="font-medium">{isCanvasLocked ? '已锁定画布' : '锁定画布'}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">控制移动端手势</div>
        </button>
        <button className={buttonClass} onClick={onToggleErase} disabled={!isManualColoringMode}>
          <div className="font-medium">{isEraseMode ? '关闭区域擦除' : '区域擦除'}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">点击色块整片移除</div>
        </button>
        <button className={buttonClass} onClick={onToggleMagnifier} disabled={!isManualColoringMode}>
          <div className="font-medium">{isMagnifierActive ? '关闭放大镜' : '放大镜'}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">局部精细编辑</div>
        </button>
        <button className={buttonClass} onClick={onUndo} disabled={!canUndo}>
          <div className="font-medium">撤销</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">回到上一步</div>
        </button>
        <button className={buttonClass} onClick={onRedo} disabled={!canRedo}>
          <div className="font-medium">重做</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">恢复撤销操作</div>
        </button>
      </div>
    </div>
  );
};

export default ToolDrawerSheet;
