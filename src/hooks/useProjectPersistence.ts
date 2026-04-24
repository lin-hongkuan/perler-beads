import { useCallback, useEffect, useRef } from 'react';
import { ProjectDocument } from '../types/project';
import { saveProject } from '../utils/projectStorage';

export function useProjectPersistence(project: ProjectDocument | null, delay = 600) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveNow = useCallback(async (nextProject = project) => {
    if (!nextProject) return;
    await saveProject(nextProject);
  }, [project]);

  useEffect(() => {
    if (!project) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      saveProject(project).catch(error => console.error('自动保存项目失败:', error));
    }, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [project, delay]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && project) {
        saveProject(project).catch(error => console.error('保存项目失败:', error));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [project]);

  return { saveNow };
}
