import React, { useState } from 'react';
import { 
  Building2, 
  Clock, 
  ExternalLink, 
  Github, 
  Sparkles, 
  User, 
  UserPlus, 
  Check, 
  MessageSquare, 
  Award, 
  Code2, 
  Layers,
  Heart,
  Bookmark,
  Eye,
  Flag,
  Share2,
  MoreVertical,
  Play,
  Rocket,
  Edit2,
  Trash2,
  ShieldAlert
} from 'lucide-react';
import { StudentShowcase, UserProfile } from '../../types';
import { storage } from '../../services/storage';
import { ShowcaseVideoPlayer } from './ShowcaseVideoPlayer';
import { ReportShowcaseModal } from './ReportShowcaseModal';

interface ShowcaseCardProps {
  showcase: StudentShowcase;
  currentUser: UserProfile | null;
  connectionState: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
  onViewDetails: (showcase: StudentShowcase) => void;
  onViewProfile?: (userId: string) => void;
  onConnect: (showcase: StudentShowcase) => void;
  onOpenMessage?: (userId: string) => void;
  onEditShowcase?: (showcase: StudentShowcase) => void;
  onDeleteShowcase?: (showcaseId: string) => void;
  onLikeToggle?: (showcaseId: string) => void;
  onSaveToggle?: (showcaseId: string) => void;
}

export const ShowcaseCard: React.FC<ShowcaseCardProps> = ({
  showcase,
  currentUser,
  connectionState,
  onViewDetails,
  onViewProfile,
  onConnect,
  onOpenMessage,
  onEditShowcase,
  onDeleteShowcase,
  onLikeToggle,
  onSaveToggle
}) => {
  const isOwner = currentUser && (currentUser.uid === showcase.userId || currentUser.uid === showcase.ownerUid);
  const isAdmin = Boolean(currentUser?.isAdmin || currentUser?.role === 'ADMIN');

  const [isLiked, setIsLiked] = useState(() => storage.isLikedShowcase(showcase.id));
  const [likesCount, setLikesCount] = useState(() => showcase.likesCount || showcase.likes?.length || 0);
  const [isSaved, setIsSaved] = useState(() => storage.isSavedShowcase(showcase.id));
  const [viewsCount, setViewsCount] = useState(() => Number(showcase.viewsCount) || 0);
  
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Expiry calculation
  const expTime = new Date(showcase.expiresAt).getTime();
  const now = Date.now();
  const isExpired = showcase.status === 'expired' || expTime <= now;
  const daysLeft = Math.max(0, Math.ceil((expTime - now) / (1000 * 60 * 60 * 24)));

  // Campus Badge Color styling
  const getCampusBadgeStyle = (campusName: string) => {
    if (campusName.includes('Annamacharya')) {
      return 'bg-red-50 text-red-900 border-red-200/80';
    }
    if (campusName.includes('NRI')) {
      return 'bg-blue-50 text-blue-900 border-blue-200/80';
    }
    if (campusName.includes('Chalapathi')) {
      return 'bg-emerald-50 text-emerald-900 border-emerald-200/80';
    }
    return 'bg-purple-50 text-purple-900 border-purple-200/80';
  };

  const getCategoryBadgeStyle = (category?: string) => {
    switch (category) {
      case 'AI / ML':
      case 'Generative AI':
        return 'bg-purple-50 text-purple-900 border-purple-200/80';
      case 'Mobile Application':
        return 'bg-blue-50 text-blue-900 border-blue-200/80';
      case 'Hackathon':
        return 'bg-amber-50 text-amber-900 border-amber-200/80';
      case 'Automation':
      case 'Developer Tool':
        return 'bg-emerald-50 text-emerald-900 border-emerald-200/80';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200/80';
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
      if (onLikeToggle) onLikeToggle(showcase.id);
    } catch (err) {
      console.warn("Like toggle error:", err);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      alert("Please sign in to save this project showcase.");
      return;
    }

    const nextState = !isSaved;
    setIsSaved(nextState);

    try {
      const res = await storage.toggleSaveShowcase(showcase.id);
      setIsSaved(res.saved);
      if (onSaveToggle) onSaveToggle(showcase.id);
    } catch (err) {
      console.warn("Save toggle error:", err);
    }
  };

  const handleViewTracked = () => {
    storage.recordShowcaseView(showcase.id);
    setViewsCount(prev => prev + 1);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group relative">
      
      <div className="p-5 sm:p-6 space-y-4">
        
        {/* Top Header: Student Profile & Expiry Countdown */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={showcase.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(showcase.studentName || 'Student')}&background=800000&color=fff&bold=true`}
              alt={showcase.studentName}
              loading="lazy"
              decoding="async"
              className="w-11 h-11 rounded-2xl object-cover ring-2 ring-neutral-100 shrink-0"
              onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(showcase.studentName || 'Student')}&background=800000&color=fff&bold=true`;
              }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 
                  onClick={() => onViewProfile && onViewProfile(showcase.userId)}
                  className="text-sm font-extrabold text-neutral-900 truncate hover:text-red-900 cursor-pointer transition-colors"
                >
                  {showcase.studentName}
                </h3>
                {isOwner && (
                  <span className="px-2 py-0.5 bg-neutral-900 text-white text-[10px] font-bold rounded-full">
                    You
                  </span>
                )}
              </div>
              <p className="text-[11px] font-semibold text-neutral-500 truncate">
                {showcase.batch || 'NIAT Student'}
              </p>
            </div>
          </div>

          {/* Featured 30-Day Badge & Options Menu */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-tight flex items-center gap-1 border ${
              isExpired
                ? 'bg-neutral-100 text-neutral-600 border-neutral-200'
                : daysLeft > 10 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80' 
                  : daysLeft > 3 
                    ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                    : 'bg-red-50 text-red-900 border-red-200/80'
            }`}>
              <Clock className="w-3 h-3 shrink-0" />
              <span>{isExpired ? 'EXPIRED' : `${daysLeft}D LEFT`}</span>
            </div>

            {/* Context Menu Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
                title="Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1 w-44 bg-white rounded-2xl shadow-xl border border-neutral-200 py-1.5 z-30 animate-in fade-in zoom-in-95"
                >
                  <button
                    type="button"
                    onClick={handleShare}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{isCopied ? 'Link Copied!' : 'Share Showcase'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setShowReportModal(true);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Report Project</span>
                  </button>

                  {isOwner && onEditShowcase && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onEditShowcase(showcase);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 cursor-pointer border-t border-neutral-100"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Edit Showcase</span>
                    </button>
                  )}

                  {(isOwner || isAdmin) && onDeleteShowcase && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onDeleteShowcase(showcase.id);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer border-t border-neutral-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isAdmin && !isOwner ? 'Admin Remove' : 'Delete Showcase'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Campus & Category Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-[11px] font-extrabold border ${getCampusBadgeStyle(showcase.campus)}`}>
              <Building2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{showcase.campus}</span>
            </span>

            {showcase.category && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-[11px] font-extrabold border ${getCategoryBadgeStyle(showcase.category)}`}>
                <Sparkles className="w-3 h-3 shrink-0" />
                <span className="truncate">{showcase.category}</span>
              </span>
            )}
          </div>

          {/* Quick External Demo / Code Links */}
          <div className="flex items-center gap-1.5">
            {showcase.githubUrl && (
              <a
                href={showcase.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="GitHub Repo"
                className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Github className="w-3.5 h-3.5" />
              </a>
            )}
            {showcase.liveUrl && (
              <a
                href={showcase.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Try Application"
                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-900 rounded-lg transition-colors border border-red-200/60"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Video Player OR Static Image Container */}
        {showcase.videoUrl ? (
          <div className="w-full">
            <ShowcaseVideoPlayer
              showcaseId={showcase.id}
              videoUrl={showcase.videoUrl}
              thumbnailUrl={showcase.thumbnailUrl}
              posterImage={showcase.projectImage}
              title={showcase.projectTitle}
              onViewTracked={handleViewTracked}
            />
          </div>
        ) : showcase.projectImage ? (
          <div 
            onClick={() => onViewDetails(showcase)}
            className="w-full h-44 rounded-2xl overflow-hidden bg-neutral-100 cursor-pointer relative group/img border border-neutral-200/60"
          >
            <img
              src={showcase.projectImage}
              alt={showcase.projectTitle}
              loading="lazy"
              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/10 group-hover/img:bg-black/20 transition-colors" />
          </div>
        ) : null}

        {/* Project Title & Description */}
        <div className="space-y-1 pt-0.5">
          <h4 
            onClick={() => onViewDetails(showcase)}
            className="text-base font-black text-neutral-900 line-clamp-1 hover:text-red-900 cursor-pointer transition-colors"
          >
            {showcase.projectTitle}
          </h4>
          <p className="text-xs text-neutral-600 font-medium line-clamp-2 leading-relaxed">
            {showcase.projectDescription}
          </p>
        </div>

        {/* Skills & Technologies Chips */}
        {((showcase.technologies && showcase.technologies.length > 0) || (showcase.skills && showcase.skills.length > 0)) && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {showcase.technologies?.slice(0, 4).map((tech, i) => (
              <span key={i} className="px-2 py-0.5 bg-neutral-100 text-neutral-700 text-[10px] font-bold rounded-lg border border-neutral-200/60">
                {tech}
              </span>
            ))}
            {showcase.skills?.filter(s => !showcase.technologies?.includes(s)).slice(0, 2).map((skill, i) => (
              <span key={i} className="px-2 py-0.5 bg-neutral-50 text-neutral-600 text-[10px] font-semibold rounded-lg border border-neutral-200/60">
                {skill}
              </span>
            ))}
            {(showcase.technologies?.length || 0) + (showcase.skills?.length || 0) > 6 && (
              <span className="px-2 py-0.5 text-neutral-400 text-[10px] font-bold">
                +{(showcase.technologies?.length || 0) + (showcase.skills?.length || 0) - 6} more
              </span>
            )}
          </div>
        )}

        {/* Team Members if present */}
        {showcase.teamMembers && showcase.teamMembers.length > 0 && (
          <div className="text-[11px] font-medium text-neutral-500 flex items-center gap-1">
            <User className="w-3 h-3 text-neutral-400" />
            <span>Team: {showcase.teamMembers.join(', ')}</span>
          </div>
        )}

        {/* Teammates Needed Box */}
        {showcase.lookingFor && showcase.lookingFor.length > 0 && (
          <div className="p-2.5 bg-red-50/60 rounded-2xl border border-red-100/80 space-y-1">
            <div className="flex items-center gap-1.5 text-red-950 text-xs font-black">
              <UserPlus className="w-3.5 h-3.5 text-red-900" />
              <span>Looking for Teammates:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {showcase.lookingFor.map((role, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-white text-red-900 text-[10px] font-extrabold rounded-md border border-red-200/80 shadow-2xs">
                  {role}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Interactive Card Action Bar */}
      <div className="px-5 sm:px-6 py-3.5 bg-neutral-50/80 border-t border-neutral-100 flex items-center justify-between gap-3">
        
        {/* Left Engagement Controls: Like, Save, View Count */}
        <div className="flex items-center gap-3">
          {/* Like Button */}
          <button
            type="button"
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              isLiked ? 'text-red-900 font-extrabold' : 'text-neutral-600 hover:text-red-900'
            }`}
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart className={`w-4 h-4 transition-transform active:scale-125 ${isLiked ? 'fill-red-900 text-red-900' : ''}`} />
            <span>{likesCount}</span>
          </button>

          {/* Save / Bookmark Button */}
          <button
            type="button"
            onClick={handleSave}
            className={`p-1 transition-colors cursor-pointer ${
              isSaved ? 'text-neutral-900 font-bold' : 'text-neutral-400 hover:text-neutral-800'
            }`}
            title={isSaved ? 'Remove from Saved' : 'Save Showcase'}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-neutral-900 text-neutral-900' : ''}`} />
          </button>

          {/* View Counter */}
          <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400">
            <Eye className="w-3.5 h-3.5" />
            <span>{viewsCount}</span>
          </div>
        </div>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-2">
          {showcase.liveUrl ? (
            <a
              href={showcase.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-red-900 hover:bg-red-950 text-white text-xs font-extrabold rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Try App</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => onViewDetails(showcase)}
              className="px-3 py-1.5 bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              View Demo
            </button>
          )}
        </div>

      </div>

      {/* Report Showcase Modal */}
      {showReportModal && (
        <ReportShowcaseModal
          showcase={showcase}
          onClose={() => setShowReportModal(false)}
        />
      )}

    </div>
  );
};
