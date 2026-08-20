import React from 'react';
import { 
  FolderGit2, 
  Plus, 
  ExternalLink, 
  Github, 
  Calendar, 
  Users, 
  Sparkles,
  Layers
} from 'lucide-react';
import { ProjectRequirement, StudentShowcase } from '../../types';

interface ProjectsSectionProps {
  projects: ProjectRequirement[];
  showcases?: StudentShowcase[];
  isSelf: boolean;
  isPreviewMode: boolean;
  onCreateProject?: () => void;
}

export const ProjectsSection: React.FC<ProjectsSectionProps> = ({
  projects = [],
  showcases = [],
  isSelf,
  isPreviewMode,
  onCreateProject
}) => {
  const hasItems = projects.length > 0 || showcases.length > 0;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/80 shadow-xs space-y-5">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FolderGit2 className="w-4 h-4 text-red-900" />
          <h2 className="text-base font-extrabold text-neutral-900">
            {isSelf && !isPreviewMode ? 'My Projects & Creations' : 'Projects & Creations'}
          </h2>
          <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-full text-xs font-bold">
            {projects.length + showcases.length}
          </span>
        </div>

        {isSelf && !isPreviewMode && onCreateProject && (
          <button
            onClick={onCreateProject}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-900 hover:bg-red-950 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer hover:shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Project</span>
          </button>
        )}
      </div>

      {!hasItems ? (
        /* Empty State */
        <div className="py-10 px-4 text-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50">
          <Layers className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-neutral-700 mb-1">
            {isSelf ? 'No projects created yet' : 'No projects listed yet'}
          </p>
          <p className="text-[11px] text-neutral-400 font-medium max-w-sm mx-auto mb-4">
            {isSelf 
              ? 'Publish your development projects or find student teammates for hackathons and academic builds.'
              : 'This student hasn’t posted any public CampusLink projects yet.'
            }
          </p>
          {isSelf && !isPreviewMode && onCreateProject && (
            <button
              onClick={onCreateProject}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-900 hover:bg-red-950 text-white shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Project</span>
            </button>
          )}
        </div>
      ) : (
        /* Projects List */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 1. Projects posted by student */}
          {projects.map((proj) => (
            <div 
              key={proj.id} 
              className="p-5 rounded-2xl border border-neutral-200/90 hover:border-red-200 bg-neutral-50/40 hover:bg-white transition-all shadow-2xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-black text-neutral-900 line-clamp-1">
                    {proj.title}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    proj.status === 'open' 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {proj.status === 'open' ? 'Recruiting' : 'Completed'}
                  </span>
                </div>

                <p className="text-xs text-neutral-600 font-medium line-clamp-2 leading-relaxed">
                  {proj.description}
                </p>

                {/* Roles / Tech tags */}
                {proj.rolesNeeded && proj.rolesNeeded.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {proj.rolesNeeded.map((r, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white text-neutral-700 border border-neutral-200 rounded-md text-[10px] font-semibold">
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-medium pt-2 border-t border-neutral-100">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-neutral-400" />
                  <span>{new Date(proj.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                </span>
                <span className="flex items-center gap-1 text-neutral-600 font-semibold">
                  <Users className="w-3 h-3 text-red-900" />
                  <span>{proj.applicantsCount || 0} applicants</span>
                </span>
              </div>
            </div>
          ))}

          {/* 2. Showcases posted by student */}
          {showcases.map((sc) => (
            <div 
              key={sc.id} 
              className="p-5 rounded-2xl border border-neutral-200/90 hover:border-red-200 bg-neutral-50/40 hover:bg-white transition-all shadow-2xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-black text-neutral-900 line-clamp-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{sc.projectTitle}</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-200 shrink-0">
                    Showcase
                  </span>
                </div>

                <p className="text-xs text-neutral-600 font-medium line-clamp-2 leading-relaxed">
                  {sc.projectDescription}
                </p>

                {/* Technologies */}
                {sc.technologies && sc.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {sc.technologies.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white text-neutral-700 border border-neutral-200 rounded-md text-[10px] font-semibold">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* External project links */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs">
                <div className="flex items-center gap-2">
                  {sc.githubUrl && (
                    <a
                      href={sc.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-neutral-700 hover:text-red-900 flex items-center gap-1 font-semibold text-[11px]"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span>Code</span>
                    </a>
                  )}
                  {sc.liveUrl && (
                    <a
                      href={sc.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 hover:text-emerald-950 flex items-center gap-1 font-semibold text-[11px]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Live Demo</span>
                    </a>
                  )}
                </div>
                <span className="text-[10px] text-neutral-400 font-medium">
                  {new Date(sc.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          ))}

        </div>
      )}

    </div>
  );
};
