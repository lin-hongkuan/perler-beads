import Image from 'next/image';
import React from 'react';
import { ProjectSummary } from '../../types/project';
import { getDifficultyLabel } from '../../utils/difficultyEstimator';

interface ProjectCardProps {
  project: ProjectSummary;
  onOpen: (projectId: string) => void;
  onToggleFavorite: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onOpen, onToggleFavorite, onDelete }) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <button onClick={() => onOpen(project.id)} className="block w-full text-left">
        <div className="aspect-video bg-gray-100 dark:bg-gray-700">
          {project.thumbnailDataUrl ? (
            <Image src={project.thumbnailDataUrl} alt={project.name} width={320} height={180} className="h-full w-full object-contain" unoptimized />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">暂无预览</div>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{project.name}</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">{project.dimensions.N}×{project.dimensions.M}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-gray-600 dark:text-gray-300">
            <span className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-700">{project.beadCount} 颗</span>
            <span className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-700">{project.colorCount} 色</span>
            {project.difficulty && (
              <>
                <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                  {getDifficultyLabel(project.difficulty.level)}
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  约 {project.difficulty.estimatedMinutes} 分钟
                </span>
              </>
            )}
          </div>
        </div>
      </button>
      <div className="flex border-t border-gray-100 dark:border-gray-700">
        <button onClick={() => onToggleFavorite(project.id)} className="flex-1 px-3 py-2 text-xs text-pink-600 hover:bg-pink-50 dark:text-pink-300 dark:hover:bg-pink-900/20">
          {project.isFavorite ? '取消收藏' : '收藏'}
        </button>
        <button onClick={() => onDelete(project.id)} className="flex-1 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20">
          删除
        </button>
      </div>
    </div>
  );
};

export default ProjectCard;
