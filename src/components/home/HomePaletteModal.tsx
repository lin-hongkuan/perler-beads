'use client';

import React, { useCallback, useRef } from 'react';
import CustomPaletteEditor from '../CustomPaletteEditor';
import { PaletteColor } from '../../utils/pixelation';
import { PaletteSelections } from '../../utils/localStorageUtils';
import { ColorSystem } from '../../utils/colorSystemUtils';

interface HomePaletteModalProps {
  isOpen: boolean;
  allColors: PaletteColor[];
  currentSelections: PaletteSelections;
  onSelectionChange: (key: string, isSelected: boolean) => void;
  onSaveCustomPalette: () => void;
  onClose: () => void;
  onExportCustomPalette: () => void;
  onImportPaletteFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  selectedColorSystem: ColorSystem;
}

export default function HomePaletteModal({
  isOpen,
  allColors,
  currentSelections,
  onSelectionChange,
  onSaveCustomPalette,
  onClose,
  onExportCustomPalette,
  onImportPaletteFile,
  selectedColorSystem,
}: HomePaletteModalProps) {
  const importPaletteInputRef = useRef<HTMLInputElement>(null);

  const triggerImportPalette = useCallback(() => {
    importPaletteInputRef.current?.click();
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <input
          type="file"
          accept=".json"
          ref={importPaletteInputRef}
          onChange={onImportPaletteFile}
          className="hidden"
        />
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          <CustomPaletteEditor
            allColors={allColors}
            currentSelections={currentSelections}
            onSelectionChange={onSelectionChange}
            onSaveCustomPalette={onSaveCustomPalette}
            onClose={onClose}
            onExportCustomPalette={onExportCustomPalette}
            onImportCustomPalette={triggerImportPalette}
            selectedColorSystem={selectedColorSystem}
          />
        </div>
      </div>
    </div>
  );
}
