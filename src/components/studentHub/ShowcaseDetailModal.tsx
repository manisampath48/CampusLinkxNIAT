import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  Clock, 
  Github, 
  ExternalLink, 
  Award, 
  UserPlus, 
  MessageSquare, 
  User, 
  Code2, 
  Check, 
  Sparkles,
  Layers,
  Heart,
  Bookmark,
  Eye,
  Flag,
  Share2,
  Rocket
} from 'lucide-react';
import { StudentShowcase, UserProfile } from '../../types';
import { storage } from '../../services/storage';
import { ShowcaseVideoPlayer } from './ShowcaseVideoPlayer';
import { ReportShowcaseModal } from './ReportShowcaseModal';

interface ShowcaseDetailModalProps {
  showcase: StudentShowcase | null;
  currentUser: UserProfile | null;
  connectionState: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
  onClose: () => void;
  onViewProfile?: (userId: string) => void;
  onConnect: (showcase: StudentShowcase) => void;
  onOpenMessage?: (userId: string) => void;
}

export const ShowcaseDetailModal: React.FC<ShowcaseDetailModalProps> = ({
  showcase,
  currentUser,
  connectionState,
  onClose,
  onViewProfile,
  onConnect,
  onOpenMessage
}) => {
  if (!showcase) return null;

  const isOwner = currentUser && (currentUser.uid === showcase.userId || currentUser.uid === showcase.ownerUid);

  const [isLiked, setIsLiked] = useState(() => storage.isLikedShowcase(showcase.id));
  const [likesCount, setLikesCount] = useState(() => showcase.likesCount || showcase.likes?.length || 0);
  const [isSaved, setIsSaved] = useState(() => storage.isSavedShowcase(showcase.id));
  const [viewsCount, setViewsCount] = useState(() => Number(showcase.viewsCount) || 0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const expTime = new Date(showcase.expiresAt).getTime();
  const now = Date.now();
  const daysLeft = Math.max(0, Math.ceil((expTime - now) / (1000 * 60 * 60 * 24)));

  const handleLike = async () => {
    if (!currentUser) {
      alert("Please sign in to like this project showcase.");
      return;
    }
    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikesCount(prev => nextState ? prev + 1 : Math.max(0, prev - 1));
    try {
      const res = await storage.toggleLikeShowcase(showcase.id);
      setIsLiked(res.liked);
      setLikesCount(res.count);
    } catch (err) {
      console.warn("Like error:", err);
    }
  };

  const handleSave = async () => {
    if (!currentUser) {
      alert("Please sign in to save this project showcase.");
      return;
    }
    const nextState = !isSaved;
    setIsSaved(nextState);
    try {
      const res = await storage.toggleSaveShowcase(showcase.id);
      setIsSaved(res.saved);
    } catch (err) {
      console.warn("Save error:", err);
    }
  };

  const handleViewTracked = () => {
    storage.recordShowcaseView(showcase.id);
    setViewsCount(prev => prev + 1);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-neutral-200 my-8 animate-in zoom-in-95 space-y-6 relative max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Creator Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-10 border-b border-neutral-100 pb-5">
          <div className="flex items-start gap-4">
            <img
              src={showcase.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(showcase.studentName || 'Student')}&background=800000&color=fff&bold=true`}
              alt={showcase.studentName}
              className="w-14 h-14 rounded-2xl object-cover ring-4 ring-neutral-100 shrink-0 shadow-xs"
              onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(showcase.studentName || 'Student')}&background=800000&color=fff&bold=true`;
              }}
            />
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 
                  onClick={() => onViewProfile && onViewProfile(showcase.userId)}
                  className="text-lg font-black text-neutral-900 truncate hover:text-red-900 cursor-pointer transition-colors"
                >
                  {showcase.studentName}
                </h2>
                <span className="px-2.5 py-0.5 bg-red-50 text-red-900 border border-red-200/80 text-xs font-extrabold rounded-full flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {showcase.campus}
                </span>
                {showcase.category && (
                  <span className="px-2.5 py-0.5 bg-purple-50 text-purple-900 border border-purple-200/80 text-xs font-extrabold rounded-full">
                    {showcase.category}
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-neutral-500">
                {showcase.batch || 'NIAT Student'}
              </p>
              <div className="flex items-center gap-3 pt-0.5 text-xs text-neutral-600 font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-red-900" />
                  <span><strong>{daysLeft} days left</strong> in 30-day showcase</span>
                </span>
                <span className="flex items-center gap-1 text-neutral-400">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{viewsCount} views</span>
                </span>
              </div>
            </div>
          </div>

          {/* Connect / Message Action Buttons */}
          {!isOwner && (
            <div className="flex items-center gap-2 shrink-0">
              {connectionState === 'accepted' ? (
                <button
                  type="button"
                  onClick={() => onOpenMessage && onOpenMessage(showcase.userId)}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Message</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onConnect(showcase)}
                  disabled={connectionState === 'pending_sent'}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    connectionState === 'pending_sent'
                      ? 'bg-neutral-100 text-neutral-500 cursor-not-allowed border border-neutral-200'
                      : 'bg-red-900 hover:bg-red-950 text-white'
                  }`}
                >
                  {connectionState === 'pending_sent' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Request Sent</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Connect</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Video Player or Project Showcase Image */}
        {showcase.videoUrl ? (
          <div className="w-full">
            <ShowcaseVideoPlayer
              showcaseId={showcase.id}
              videoUrl={showcase.videoUrl}
              thumbnailUrl={showcase.thumbnailUrl}
              posterImage={showcase.projectImage}
              title={showcase.projectTitle}
              autoPlay={false}
              onViewTracked={handleViewTracked}
              className="rounded-2xl shadow-md max-h-[420px]"
            />
          </div>
        ) : showcase.projectImage ? (
          <div className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200/60 shadow-sm">
            <img
              src={showcase.projectImage}
              alt={showcase.projectTitle}
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}

        {/* Project Title, Description & Action Links */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xl font-black text-neutral-900">{showcase.projectTitle}</h3>
            
            {/* Live demo and GitHub Links */}
            <div className="flex items-center gap-2">
              {showcase.liveUrl && (
                <a
                  href={showcase.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-red-900 hover:bg-red-950 text-white rounded-xl transition-all flex items-center gap-2 text-xs font-extrabold shadow-sm"
                >
                  <Rocket className="w-4 h-4" />
                  <span>Launch Live App</span>
                </a>
              )}
              {showcase.githubUrl && (
                <a
                  href={showcase.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold"
                >
                  <Github className="w-4 h-4" />
                  <span>GitHub</span>
                </a>
              )}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-neutral-700 font-medium leading-relaxed whitespace-pre-line">
            {showcase.projectDescription}
          </p>
        </div>

        {/* Technologies & Skills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-neutral-100 pt-5">
          {showcase.technologies && showcase.technologies.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-black text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-red-900" />
                <span>Technologies Used</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {showcase.technologies.map((tech, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-neutral-100 text-neutral-800 text-xs font-bold rounded-xl border border-neutral-200/80"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {showcase.teamMembers && showcase.teamMembers.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-black text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-red-900" />
                <span>Team Members / Collaborators</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {showcase.teamMembers.map((member, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-neutral-50 text-neutral-800 text-xs font-semibold rounded-xl border border-neutral-200/60"
                  >
                    {member}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Looking for Teammates */}
        {showcase.lookingFor && showcase.lookingFor.length > 0 && (
          <div className="p-4 bg-red-50/80 rounded-2xl border border-red-200/80 space-y-2">
            <div className="flex items-center gap-2 text-red-950 font-black text-xs">
              <UserPlus className="w-4 h-4 text-red-900" />
              <span>Looking for Collaborators & Teammates:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {showcase.lookingFor.map((role, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-white text-red-900 text-xs font-black rounded-xl border border-red-200/80 shadow-2xs"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer Engagement Bar */}
        <div className="flex items-center justify-between gap-3 border-t border-neutral-100 pt-4">
          <div className="flex items-center gap-3">
            {/* Like */}
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isLiked ? 'bg-red-50 text-red-900 font-extrabold border border-red-200' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-900 text-red-900' : ''}`} />
              <span>{likesCount} {likesCount === 1 ? 'Like' : 'Likes'}</span>
            </button>

            {/* Save */}
            <button
              type="button"
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSaved ? 'bg-neutral-900 text-white' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            {/* Share */}
            <button
              type="button"
              onClick={handleShare}
              className="p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
            >
              <Share2 className="w-4 h-4" />
              <span>{isCopied ? 'Copied' : 'Share'}</span>
            </button>
          </div>

          {/* Report Button */}
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="text-xs font-semibold text-neutral-400 hover:text-neutral-700 flex items-center gap-1 cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Report</span>
          </button>
        </div>

      </div>

      {/* Report Modal */}
      {showReportModal && (
        <ReportShowcaseModal
          showcase={showcase}
          onClose={() => setShowReportModal(false)}
        />
      )}

    </div>
  );
};
