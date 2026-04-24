import React from 'react';
import { ProjectDocument, ProjectSummary, SavedPalettePreset } from '../../types/project';
import RecentProjectsList from '../library/RecentProjectsList';
import FavoritePalettesPanel from '../library/FavoritePalettesPanel';

interface ProjectLibrarySheetProps {
  projects: ProjectSummary[];
  lastProject: ProjectDocument | null;
  palettePresets: SavedPalettePreset[];
  isLoading: boolean;
  onOpenProject: (projectId: string) => void;
  onToggleFavorite: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onApplyPalette: (preset: SavedPalettePreset) => void;
  onDeletePalette: (presetId: string) => void;
}

const ProjectLibrarySheet: React.FC<ProjectLibrarySheetProps> = ({
  projects,
  lastProject,
  palettePresets,
  isLoading,
  onOpenProject,
  onToggleFavorite,
  onDeleteProject,
  onApplyPalette,
  onDeletePalette
}) => {
  const favoriteProjects = projects.filter(project => project.isFavorite);

  return (
    <div className="space-y-5">
      {isLoading && <div className="text-sm text-gray-500 dark:text-gray-400">正在加载项目库...</div>}

      {lastProject && (
        <div className="rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 p-4 text-white shadow-lg">
          <div className="text-sm opacity-90">继续上次</div>
          <div className="mt-1 text-lg font-semibold">{lastProject.summary.name}</div>
          <div className="mt-1 text-xs opacity-90">{lastProject.summary.dimensions.N}×{lastProject.summary.dimensions.M} · {lastProject.summary.beadCount} 颗</div>
          <button onClick={() => onOpenProject(lastProject.id)} className="mt-3 rounded-xl bg-white/95 px-4 py-2 text-sm font-medium text-purple-600">
            继续编辑
          </button>
        </div>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">最近作品</h3>
        <RecentProjectsList projects={projects} onOpen={onOpenProject} onToggleFavorite={onToggleFavorite} onDelete={onDeleteProject} />
      </section>

      {favoriteProjects.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">收藏作品</h3>
          <RecentProjectsList projects={favoriteProjects} onOpen={onOpenProject} onToggleFavorite={onToggleFavorite} onDelete={onDeleteProject} />
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">收藏色板</h3>
        <FavoritePalettesPanel presets={palettePresets} onApply={onApplyPalette} onDelete={onDeletePalette} />
      </section>
    </div>
  );
};

export default ProjectLibrarySheet;
