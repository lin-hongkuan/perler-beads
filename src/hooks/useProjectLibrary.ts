import { useCallback, useEffect, useState } from 'react';
import { ProjectDocument, ProjectSummary, SavedPalettePreset } from '../types/project';
import {
  deletePalettePreset,
  deleteProject,
  getLastOpenedProject,
  listPalettePresets,
  listProjects,
  loadProject,
  savePalettePreset,
  saveProject,
  toggleFavoriteProject
} from '../utils/projectStorage';

export function useProjectLibrary() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [palettePresets, setPalettePresets] = useState<SavedPalettePreset[]>([]);
  const [lastProject, setLastProject] = useState<ProjectDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [nextProjects, nextPresets, nextLastProject] = await Promise.all([
        listProjects(),
        listPalettePresets(),
        getLastOpenedProject()
      ]);
      setProjects(nextProjects);
      setPalettePresets(nextPresets);
      setLastProject(nextLastProject);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(error => console.error('加载项目库失败:', error));
  }, [refresh]);

  const openProject = useCallback(async (projectId: string) => {
    const project = await loadProject(projectId);
    if (project) {
      await saveProject({
        ...project,
        summary: {
          ...project.summary,
          lastOpenedAt: new Date().toISOString()
        }
      });
      await refresh();
    }
    return project;
  }, [refresh]);

  const removeProject = useCallback(async (projectId: string) => {
    await deleteProject(projectId);
    await refresh();
  }, [refresh]);

  const toggleProjectFavorite = useCallback(async (projectId: string) => {
    await toggleFavoriteProject(projectId);
    await refresh();
  }, [refresh]);

  const savePreset = useCallback(async (preset: SavedPalettePreset) => {
    await savePalettePreset(preset);
    await refresh();
  }, [refresh]);

  const removePreset = useCallback(async (presetId: string) => {
    await deletePalettePreset(presetId);
    await refresh();
  }, [refresh]);

  return {
    projects,
    palettePresets,
    lastProject,
    isLoading,
    refresh,
    openProject,
    removeProject,
    toggleProjectFavorite,
    savePreset,
    removePreset
  };
}
