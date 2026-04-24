import React from 'react';

interface EditorBottomSheetProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const EditorBottomSheet: React.FC<EditorBottomSheetProps> = ({ title, isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end bg-black/40 md:hidden" onClick={onClose}>
      <div
        className="max-h-[82vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-gray-900"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex justify-center py-2">
          <div className="h-1 w-12 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>
        <div className="flex items-center justify-between border-b border-gray-100 px-4 pb-3 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="max-h-[68vh] overflow-y-auto p-4 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default EditorBottomSheet;
