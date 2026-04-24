import React from 'react';

export type MobileSheetKey = 'tools' | 'palette' | 'history' | 'library';

interface MobileEditorToolbarProps {
  isVisible: boolean;
  activeSheet: MobileSheetKey | null;
  onOpenSheet: (sheet: MobileSheetKey) => void;
  onDownload: () => void;
  onFocusMode: () => void;
}

const items: Array<{ key: MobileSheetKey; label: string; icon: string }> = [
  { key: 'tools', label: '工具', icon: '✎' },
  { key: 'palette', label: '色板', icon: '◼' },
  { key: 'history', label: '历史', icon: '↶' },
  { key: 'library', label: '项目', icon: '▦' }
];

const MobileEditorToolbar: React.FC<MobileEditorToolbarProps> = ({ isVisible, activeSheet, onOpenSheet, onDownload, onFocusMode }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[110] border-t border-gray-200 bg-white/95 px-2 py-2 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur md:hidden dark:border-gray-700 dark:bg-gray-900/95">
      <div className="grid grid-cols-6 gap-1">
        {items.map(item => (
          <button
            key={item.key}
            onClick={() => onOpenSheet(item.key)}
            className={`flex flex-col items-center rounded-xl px-1 py-2 text-xs transition-colors ${
              activeSheet === item.key
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="mt-1">{item.label}</span>
          </button>
        ))}
        <button onClick={onFocusMode} className="flex flex-col items-center rounded-xl px-1 py-2 text-xs text-purple-600 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-900/30">
          <span className="text-lg leading-none">◎</span>
          <span className="mt-1">专心</span>
        </button>
        <button onClick={onDownload} className="flex flex-col items-center rounded-xl px-1 py-2 text-xs text-green-600 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-900/30">
          <span className="text-lg leading-none">⇩</span>
          <span className="mt-1">下载</span>
        </button>
      </div>
    </div>
  );
};

export default MobileEditorToolbar;
