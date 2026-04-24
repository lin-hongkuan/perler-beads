import React from 'react';
import { HistoryState } from '../../types/history';
import { formatHistoryTime } from '../../utils/historyUtils';

interface HistoryTimelineProps {
  history: HistoryState;
  onUndo: () => void;
  onRedo: () => void;
}

const HistoryTimeline: React.FC<HistoryTimelineProps> = ({ history, onUndo, onRedo }) => {
  const entries = [...history.past].reverse();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onUndo}
          disabled={history.past.length === 0}
          className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300 dark:bg-gray-100 dark:text-gray-900 dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
        >
          撤销
        </button>
        <button
          onClick={onRedo}
          disabled={history.future.length === 0}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
        >
          重做
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
          还没有编辑历史。开始上色、擦除或替换颜色后，这里会记录时间线。
        </div>
      ) : (
        <ol className="space-y-2">
          {entries.map(entry => (
            <li key={entry.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    [{formatHistoryTime(entry.timestamp)}] {entry.label}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    影响 {entry.patch.length} 格
                  </div>
                </div>
                <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                  {entry.actionType}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default HistoryTimeline;
