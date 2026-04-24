import React from 'react';
import { ProjectSummary } from '../../types/project';
import ProjectCard from './ProjectCard';

interface RecentProjectsListProps {
  projects: ProjectSummary[];
  onOpen: (projectId: string) => void;
  onToggleFavorite: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}

const RecentProjectsList: React.FC<RecentProjectsListProps> = ({ projects, onOpen, onToggleFavorite, onDelete }) => {
  if (projects.length === 0) {
    return <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">还没有保存过项目。</div>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} onOpen={onOpen} onToggleFavorite={onToggleFavorite} onDelete={onDelete} />
      ))}
    </div>
  );
};

export default RecentProjectsList;
