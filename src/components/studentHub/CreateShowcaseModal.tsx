import React, { useState, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Building2, 
  Code2, 
  UserPlus, 
  Clock, 
  Github, 
  ExternalLink, 
  Award, 
  Layers, 
  AlertCircle,
  Plus,
  Video,
  UploadCloud,
  CheckCircle2,
  Trash2,
  Rocket,
  Users,
  Loader2
} from 'lucide-react';
import { CampusName, ShowcaseCategory, StudentShowcase, UserProfile } from '../../types';
import { 
  uploadShowcaseVideo, 
  validateVideoFile, 
  extractVideoMetadata, 
  MAX_VIDEO_DURATION_SECONDS,
  UploadProgressUpdate
} from '../../services/videoUploadService';
import { ShowcaseVideoPlayer } from './ShowcaseVideoPlayer';

interface CreateShowcaseModalProps {
  currentUser: UserProfile;
  initialShowcase?: StudentShowcase | null;
  onClose: () => void;
  onSubmit: (data: Omit<StudentShowcase, 'id' | 'createdAt' | 'expiresAt' | 'status' | 'userId' | 'ownerUid'>) => Promise<void>;
}

const SHOWCASE_CATEGORIES: ShowcaseCategory[] = [
  'Web Application',
  'Mobile Application',
  'AI / ML',
  'Generative AI',
  'Automation',
  'Hackathon',
  'Developer Tool',
  'Other'
];

export const CreateShowcaseModal: React.FC<CreateShowcaseModalProps> = ({
  currentUser,
  initialShowcase,
  onClose,
  onSubmit
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [projectTitle, setProjectTitle] = useState(initialShowcase?.projectTitle || '');
  const [category, setCategory] = useState<ShowcaseCategory>(initialShowcase?.category || 'Web Application');
  const [projectDescription, setProjectDescription] = useState(initialShowcase?.projectDescription || '');
  const [campus, setCampus] = useState<CampusName>(initialShowcase?.campus || currentUser.campus);
  const [batch, setBatch] = useState(initialShowcase?.batch || `${currentUser.year} (${currentUser.branch})`);
  
  // Video state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState(initialShowcase?.videoUrl || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(initialShowcase?.thumbnailUrl || '');
  const [videoDuration, setVideoDuration] = useState<number>(initialShowcase?.videoDuration || 0);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  
  // Optional links & metadata
  const [projectImage, setProjectImage] = useState(initialShowcase?.projectImage || '');
  const [githubUrl, setGithubUrl] = useState(initialShowcase?.githubUrl || '');
  const [liveUrl, setLiveUrl] = useState(initialShowcase?.liveUrl || '');
  const [technologiesInput, setTechnologiesInput] = useState(initialShowcase?.technologies?.join(', ') || '');
  const [teamMembersInput, setTeamMembersInput] = useState(initialShowcase?.teamMembers?.join(', ') || '');
  
  // Teammates needed
  const [isLookingForTeammates, setIsLookingForTeammates] = useState(
    Boolean(initialShowcase?.lookingFor && initialShowcase.lookingFor.length > 0)
  );
  const [lookingForInput, setLookingForInput] = useState(initialShowcase?.lookingFor?.join(', ') || '');
  const [teammateSkillsInput, setTeammateSkillsInput] = useState(initialShowcase?.teammateSkills?.join(', ') || '');
  const [about, setAbout] = useState(initialShowcase?.about || currentUser.bio || '');

  // Progress & processing states
  const [isPreparingVideo, setIsPreparingVideo] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStageMessage, setUploadStageMessage] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleVideoSelect = async (file: File) => {
    setError(null);
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid video file.');
      return;
    }

    try {
      setIsPreparingVideo(true);
      
      // Set instantaneous local preview
      const objectUrl = URL.createObjectURL(file);
      setVideoFile(file);
      setVideoPreviewUrl(objectUrl);

      // Inspect duration safely
      const meta = await extractVideoMetadata(file);
      if (meta.duration > MAX_VIDEO_DURATION_SECONDS) {
        setError(`Video duration (${meta.duration}s) exceeds the 90-second maximum limit. Please choose a shorter demo video.`);
        handleRemoveVideo();
        return;
      }
      
      setVideoDuration(meta.duration);
    } catch (err: any) {
      console.warn('[CreateShowcaseModal] Video preview preparation note:', err);
    } finally {
      setIsPreparingVideo(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleVideoSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleVideoSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoUrl('');
    setThumbnailUrl('');
    setVideoDuration(0);
    if (videoPreviewUrl) {
      try {
        URL.revokeObjectURL(videoPreviewUrl);
      } catch (e) {}
      setVideoPreviewUrl('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!projectTitle.trim()) {
      setError("Please enter a project title.");
      return;
    }

    if (!projectDescription.trim()) {
      setError("Please provide a description of the project or application.");
      return;
    }

    const technologies = technologiesInput.split(',').map(s => s.trim()).filter(Boolean);
    const teamMembers = teamMembersInput.split(',').map(s => s.trim()).filter(Boolean);
    const lookingFor = isLookingForTeammates 
      ? lookingForInput.split(',').map(s => s.trim()).filter(Boolean) 
      : [];
    const teammateSkills = isLookingForTeammates 
      ? teammateSkillsInput.split(',').map(s => s.trim()).filter(Boolean) 
      : [];

    try {
      setIsSubmitting(true);

      let finalVideoUrl = videoUrl;
      let finalThumbnailUrl = thumbnailUrl;
      let finalDuration = videoDuration;

      // 1. Upload video if a new file was chosen
      if (videoFile) {
        setIsUploading(true);
        setUploadProgress(0);
        setUploadStageMessage('Uploading Demo Video... 0%');

        const uploadRes = await uploadShowcaseVideo({
          file: videoFile,
          userId: currentUser.uid,
          postId: initialShowcase?.id || `sc_${Date.now()}`,
          duration: videoDuration,
          onProgress: (update: UploadProgressUpdate) => {
            setUploadStageMessage(update.stageMessage);
            setUploadProgress(update.percentage);
          }
        });

        if (!uploadRes.success) {
          throw new Error(uploadRes.error || 'Failed to upload showcase video.');
        }

        finalVideoUrl = uploadRes.videoUrl || '';
        finalThumbnailUrl = uploadRes.thumbnailUrl || '';
        finalDuration = uploadRes.duration || videoDuration;
      }

      // 2. Save Project Showcase Data to Database
      console.log('[CampusLink Upload] 21. Database write started');
      setUploadStageMessage('Saving Project Showcase...');
      
      await onSubmit({
        studentName: currentUser.name,
        profileImage: currentUser.avatar,
        campus,
        batch,
        skills: technologies,
        technologies,
        projectTitle: projectTitle.trim(),
        projectDescription: projectDescription.trim(),
        category,
        videoUrl: finalVideoUrl,
        videoDuration: finalDuration,
        thumbnailUrl: finalThumbnailUrl,
        projectImage: projectImage.trim() || finalThumbnailUrl,
        githubUrl: githubUrl.trim(),
        liveUrl: liveUrl.trim(),
        teamMembers,
        lookingFor,
        teammateSkills,
        about: about.trim()
      });

      console.log('[CampusLink Upload] 22. Database write completed');
      console.log('[CampusLink Upload] 23. SHOWCASE PUBLISHED');

      // 3. Complete
      setIsComplete(true);
      setUploadStageMessage('Project Showcase Published Successfully');
      
      // Clean up preview URL
      if (videoPreviewUrl) {
        try {
          URL.revokeObjectURL(videoPreviewUrl);
        } catch (e) {}
      }

      // Brief delay to allow student to see success state
      setTimeout(() => {
        onClose();
      }, 700);

    } catch (err: any) {
      console.error('[CreateShowcaseModal] Submission error:', err);
      setError(err?.message || "Failed to publish showcase. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-neutral-200 my-8 animate-in zoom-in-95 space-y-6 relative max-h-[92vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-50 text-red-900 rounded-2xl border border-red-100">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-neutral-900">
                {initialShowcase ? 'Edit Project Showcase' : 'Showcase Your Application & Project'}
              </h2>
              <p className="text-xs font-semibold text-neutral-500">
                Demonstrate student-built apps, technical projects, and AI systems across NIAT campuses
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isUploading}
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 30-Day Policy Alert */}
        <div className="p-4 bg-red-50/80 rounded-2xl border border-red-200/80 flex items-start gap-3">
          <Clock className="w-5 h-5 text-red-900 shrink-0 mt-0.5" />
          <div className="text-xs text-red-950 font-medium leading-relaxed">
            <strong className="font-bold">30-Day Active Showcase:</strong> Your video demo will be featured on the NIAT Student Hub for 30 days. Max video duration is <strong>90 seconds</strong>.
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-100 text-red-900 rounded-2xl text-xs font-bold flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECTION 1: Project Overview */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-red-900" />
              <span>Project Overview</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Project Title */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-neutral-800 block">
                  Application / Project Title <span className="text-red-900">*</span>
                </label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g., Campus Event Manager, AI Resume Scorer..."
                  className="w-full px-4 py-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-900 focus:bg-white transition-all"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-800 block">
                  Category <span className="text-red-900">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ShowcaseCategory)}
                  className="w-full px-3.5 py-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-red-900 focus:bg-white transition-all cursor-pointer"
                >
                  {SHOWCASE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Project Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-800 block">
                Project Description & Key Highlights <span className="text-red-900">*</span>
              </label>
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Describe the problem solved, core features, architecture, and what makes your project unique..."
                rows={4}
                className="w-full px-4 py-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-900 focus:bg-white transition-all resize-none"
                required
              />
            </div>
          </div>

          {/* SECTION 2: Demo Video Upload */}
          <div className="space-y-3 border-t border-neutral-100 pt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-red-900" />
                <span>Short Demo Video (Max 90s)</span>
              </h3>
              <span className="text-[11px] font-semibold text-neutral-500">
                MP4, WebM, MOV (Max 100MB)
              </span>
            </div>

            {/* Video Preparing Indicator */}
            {isPreparingVideo && (
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs font-bold text-amber-900 flex items-center gap-2.5 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-amber-700 shrink-0" />
                <span>Processing video preview & metadata...</span>
              </div>
            )}

            {/* Video File / Preview Display */}
            {videoPreviewUrl || videoUrl ? (
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-neutral-900 truncate max-w-[200px]">
                      {videoFile ? videoFile.name : 'Attached Demo Video'}
                    </span>
                    {videoDuration > 0 && (
                      <span className="px-2 py-0.5 bg-neutral-200 text-neutral-700 text-[10px] font-bold rounded-md">
                        {videoDuration}s duration
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    disabled={isSubmitting || isUploading}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>

                <div className="max-w-md mx-auto rounded-xl overflow-hidden shadow-xs">
                  <ShowcaseVideoPlayer
                    videoUrl={videoPreviewUrl || videoUrl}
                    thumbnailUrl={thumbnailUrl}
                    title={projectTitle || 'Video Preview'}
                    autoPlay={false}
                  />
                </div>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-red-900 bg-red-50/50'
                    : 'border-neutral-200 hover:border-red-900/60 bg-neutral-50/50 hover:bg-neutral-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-900 flex items-center justify-center border border-red-100">
                  <UploadCloud className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-extrabold text-neutral-900">
                    Click to select or drag and drop your project video
                  </p>
                  <p className="text-[11px] text-neutral-500 font-medium">
                    Maximum 90 seconds. Shows your live application, UI, or technical demo.
                  </p>
                </div>
              </div>
            )}

            {/* Real Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-2 p-3.5 bg-red-50 rounded-2xl border border-red-200 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-red-950">
                  <span className="flex items-center gap-1.5">
                    {isComplete ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-900 shrink-0" />
                    )}
                    <span>{uploadStageMessage || 'Uploading Demo Video...'}</span>
                  </span>
                  <span className="font-extrabold text-red-900">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2.5 bg-red-200/80 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-900 rounded-full transition-all duration-200 ease-out"
                    style={{ width: `${Math.max(0, Math.min(100, uploadProgress))}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Live Application & GitHub Links */}
          <div className="space-y-4 border-t border-neutral-100 pt-5">
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Rocket className="w-3.5 h-3.5 text-red-900" />
              <span>Live Application & Repository</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Live App URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-red-900" />
                  <span>Live Application URL (Optional)</span>
                </label>
                <input
                  type="url"
                  value={liveUrl}
                  onChange={(e) => setLiveUrl(e.target.value)}
                  placeholder="https://my-app.vercel.app"
                  className="w-full px-4 py-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-900 focus:bg-white transition-all"
                />
              </div>

              {/* GitHub URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <Github className="w-3.5 h-3.5 text-neutral-700" />
                  <span>GitHub Repository (Optional)</span>
                </label>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username/project"
                  className="w-full px-4 py-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-900 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Tech Stack & Team */}
          <div className="space-y-4 border-t border-neutral-100 pt-5">
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-red-900" />
              <span>Technologies & Collaboration</span>
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-800 block">
                Technologies Used (Comma separated)
              </label>
              <input
                type="text"
                value={technologiesInput}
                onChange={(e) => setTechnologiesInput(e.target.value)}
                placeholder="React, TypeScript, Firebase, Python, Tailwind, OpenCV..."
                className="w-full px-4 py-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-900 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-800 block">
                Team Members / Collaborators (Optional)
              </label>
              <input
                type="text"
                value={teamMembersInput}
                onChange={(e) => setTeamMembersInput(e.target.value)}
                placeholder="Rahul K, Priya S (Leave empty if individual project)"
                className="w-full px-4 py-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-900 focus:bg-white transition-all"
              />
            </div>

            {/* Looking for Teammates Toggle */}
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLookingForTeammates}
                  onChange={(e) => setIsLookingForTeammates(e.target.checked)}
                  className="rounded text-red-900 focus:ring-red-900"
                />
                <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-red-900" />
                  <span>I am actively looking for teammates for this project</span>
                </span>
              </label>

              {isLookingForTeammates && (
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-700 block">
                      Roles Needed (Comma separated)
                    </label>
                    <input
                      type="text"
                      value={lookingForInput}
                      onChange={(e) => setLookingForInput(e.target.value)}
                      placeholder="Frontend Developer, Backend Engineer, UI/UX Designer..."
                      className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-neutral-200 text-xs font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-red-900"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isUploading}
              className="px-6 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-2xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading || isPreparingVideo}
              className="px-8 py-3 bg-red-900 hover:bg-red-950 text-white text-xs font-extrabold rounded-2xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{uploadStageMessage || `Uploading Video (${uploadProgress}%)...`}</span>
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Publishing Showcase...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{initialShowcase ? 'Save Showcase Changes' : 'Publish 30-Day Showcase'}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
