import React, { useRef, useState, useEffect } from 'react';
import { 
  Camera, 
  Share2, 
  Eye, 
  EyeOff, 
  Edit3, 
  MessageSquare, 
  UserPlus, 
  UserCheck, 
  Clock, 
  Sparkles, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react';
import { UploadTask } from 'firebase/storage';
import { UserProfile } from '../../types';
import { VerifiedBadge, CampusBadge } from '../common/Badge';
import { COVER_PRESETS } from './profileConstants';
import { uploadAvatarImage } from '../../services/imageUploadService';

interface ProfileHeroProps {
  profile: UserProfile;
  isSelf: boolean;
  isPreviewMode: boolean;
  connectionState?: 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'pending' | 'incoming';
  onEditProfile: (tab?: string) => void;
  onTogglePreview: () => void;
  onShareProfile: () => void;
  onOpenMessage?: () => void;
  onSendConnection?: () => void;
  onUpdateAvatar: (url: string) => Promise<void>;
  onUpdateCover?: (url: string, preset?: string) => Promise<void>;
  onOpenCoverPresets: () => void;
}

export const ProfileHero: React.FC<ProfileHeroProps> = ({
  profile,
  isSelf,
  isPreviewMode,
  connectionState = 'none',
  onEditProfile,
  onTogglePreview,
  onShareProfile,
  onOpenMessage,
  onSendConnection,
  onUpdateAvatar,
  onOpenCoverPresets,
}) => {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const currentUploadTaskRef = useRef<UploadTask | null>(null);
  const lastSelectedFileRef = useRef<File | null>(null);
  const uploadSequenceRef = useRef<number>(0);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  // Reset image error state whenever avatar URL changes
  useEffect(() => {
    setImageLoadError(false);
  }, [profile.avatar]);

  // Active cover style
  const activePreset = COVER_PRESETS.find(p => p.id === profile.coverPreset) || COVER_PRESETS[0];
  const hasCustomCoverImage = Boolean(profile.coverImage && profile.coverImage.trim().length > 5);

  const performAvatarUpload = async (file: File) => {
    // Increment sequence ID to prevent race conditions if multiple uploads are initiated
    const currentSequence = ++uploadSequenceRef.current;
    
    // Abort previous pending upload task if one was active
    if (currentUploadTaskRef.current) {
      try {
        currentUploadTaskRef.current.cancel();
      } catch (err) {
        console.warn('[Avatar Upload] Aborted previous upload task:', err);
      }
    }

    lastSelectedFileRef.current = file;
    setIsUploadingAvatar(true);
    setAvatarUploadProgress(0);
    setAvatarError(null);
    setAvatarSuccess(false);

    try {
      const res = await uploadAvatarImage(
        file,
        (progress) => {
          if (uploadSequenceRef.current === currentSequence) {
            setAvatarUploadProgress(progress);
          }
        },
        (task) => {
          if (uploadSequenceRef.current === currentSequence) {
            currentUploadTaskRef.current = task;
          }
        }
      );

      // Check if another upload has taken over in the meantime
      if (uploadSequenceRef.current !== currentSequence) {
        return;
      }

      if (res.success && res.downloadUrl) {
        await onUpdateAvatar(res.downloadUrl);
        setAvatarSuccess(true);
        setTimeout(() => setAvatarSuccess(false), 4000);
      } else {
        setAvatarError(res.error || 'Failed to upload profile photo.');
      }
    } catch (err: any) {
      if (uploadSequenceRef.current === currentSequence) {
        setAvatarError(err?.message || 'Error uploading photo.');
      }
    } finally {
      if (uploadSequenceRef.current === currentSequence) {
        setIsUploadingAvatar(false);
        currentUploadTaskRef.current = null;
        if (avatarInputRef.current) {
          avatarInputRef.current.value = '';
        }
      }
    }
  };

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await performAvatarUpload(file);
  };

  const handleCancelUpload = () => {
    if (currentUploadTaskRef.current) {
      try {
        currentUploadTaskRef.current.cancel();
      } catch (err) {
        console.warn('[Avatar Upload] Cancel error:', err);
      }
    }
    uploadSequenceRef.current++;
    setIsUploadingAvatar(false);
    setAvatarUploadProgress(0);
    setAvatarError('Upload cancelled.');
    currentUploadTaskRef.current = null;
  };

  const handleRetryUpload = () => {
    if (lastSelectedFileRef.current) {
      performAvatarUpload(lastSelectedFileRef.current);
    } else if (avatarInputRef.current) {
      avatarInputRef.current.click();
    }
  };

  // Student Initials for professional fallback avatar
  const getInitials = (name: string) => {
    if (!name) return 'NI';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const hasValidCustomAvatar = Boolean(
    profile.avatar && 
    !profile.avatar.includes('ui-avatars.com') && 
    profile.avatar.trim().length > 5 && 
    !imageLoadError
  );

  return (
    <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs overflow-hidden relative">
      
      {/* Cover / Banner Section */}
      <div 
        className={`h-44 sm:h-56 relative w-full transition-all duration-300 ${
          hasCustomCoverImage ? 'bg-cover bg-center' : `bg-gradient-to-r ${activePreset.gradient}`
        }`}
        style={hasCustomCoverImage ? { backgroundImage: `url(${profile.coverImage})` } : undefined}
      >
        {/* Subtle overlay texture */}
        <div className="absolute inset-0 bg-black/20 backdrop-brightness-95" />
        
        {/* Top right cover tools for profile owner (hidden in preview mode) */}
        {isSelf && !isPreviewMode && (
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              onClick={onOpenCoverPresets}
              className="px-3 py-1.5 rounded-xl bg-black/50 hover:bg-black/75 backdrop-blur-md text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Change cover theme or upload background"
            >
              <ImageIcon className="w-3.5 h-3.5 text-red-300" />
              <span className="hidden sm:inline">Cover Style</span>
            </button>
          </div>
        )}

        {/* Preview Mode Badge Banner */}
        {isSelf && isPreviewMode && (
          <div className="absolute top-3 left-3 bg-amber-500/90 text-neutral-950 font-black text-[11px] px-3 py-1 rounded-full backdrop-blur-md border border-amber-300 shadow-md flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span>Public Student Preview Mode</span>
          </div>
        )}
      </div>

      {/* Profile Header Details Bar */}
      <div className="px-6 sm:px-8 pb-6 pt-0 relative">
        
        {/* Avatar & Floating Actions row */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
          
          {/* Avatar Container */}
          <div className="relative group self-start">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full ring-4 ring-white shadow-xl bg-neutral-900 overflow-hidden relative flex items-center justify-center">
              {hasValidCustomAvatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={() => setImageLoadError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-red-900 to-neutral-900 flex items-center justify-center text-white font-black text-2xl sm:text-3xl tracking-wider">
                  {getInitials(profile.name)}
                </div>
              )}

              {/* Uploading progress overlay */}
              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center text-white p-2 text-center z-20">
                  <Loader2 className="w-6 h-6 text-red-500 animate-spin mb-1" />
                  <span className="text-xs font-black tracking-tight">{avatarUploadProgress}%</span>
                  <p className="text-[10px] text-neutral-300 font-medium">Uploading...</p>
                  <button
                    onClick={handleCancelUpload}
                    type="button"
                    className="mt-1 px-2.5 py-0.5 bg-white/20 hover:bg-white/30 rounded-full text-[10px] font-bold text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Change Avatar Button (Self only, hidden in preview) */}
            {isSelf && !isPreviewMode && (
              <>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-1 right-1 p-2.5 rounded-full bg-red-900 hover:bg-red-950 text-white shadow-md ring-2 ring-white transition-all cursor-pointer hover:scale-105"
                  title="Upload profile picture"
                  aria-label="Upload profile picture"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarFileSelect}
                  className="hidden"
                />
              </>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {isSelf ? (
              <>
                {/* Toggle Preview Button */}
                <button
                  onClick={onTogglePreview}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    isPreviewMode 
                      ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100' 
                      : 'bg-neutral-100 text-neutral-800 border-neutral-200 hover:bg-neutral-200'
                  }`}
                  title={isPreviewMode ? 'Exit preview' : 'View profile as seen by other students'}
                >
                  {isPreviewMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-neutral-600" />}
                  <span>{isPreviewMode ? 'Exit Preview' : 'Preview'}</span>
                </button>

                {/* Edit Profile Button */}
                {!isPreviewMode && (
                  <button
                    onClick={() => onEditProfile()}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-red-900 hover:bg-red-950 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer hover:shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                )}

                {/* Share Profile Button */}
                <button
                  onClick={onShareProfile}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-neutral-600" />
                  <span className="hidden xs:inline">Share</span>
                </button>
              </>
            ) : (
              <>
                {/* Other student actions */}
                {onOpenMessage && (
                  <button
                    onClick={onOpenMessage}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-red-900 hover:bg-red-950 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message</span>
                  </button>
                )}

                {onSendConnection && connectionState === 'none' && (
                  <button
                    onClick={onSendConnection}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-black text-white transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Connect</span>
                  </button>
                )}

                {(connectionState === 'pending' || connectionState === 'pending_sent') && (
                  <span className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Request Sent</span>
                  </span>
                )}

                {connectionState === 'pending_received' && (
                  <span className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Incoming Request</span>
                  </span>
                )}

                {connectionState === 'accepted' && (
                  <span className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Connected</span>
                  </span>
                )}

                <button
                  onClick={onShareProfile}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Share profile"
                >
                  <Share2 className="w-3.5 h-3.5 text-neutral-600" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Upload feedback messages */}
        {avatarError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-900 flex flex-wrap items-center justify-between gap-2 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
              <span>{avatarError}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleRetryUpload}
                className="px-2.5 py-1 bg-red-900 hover:bg-red-950 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Try Again</span>
              </button>
              <button
                onClick={() => setAvatarError(null)}
                className="p-1 hover:bg-red-100 text-red-700 rounded-md transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {avatarSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-900 flex items-center gap-2 shadow-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Profile photo updated successfully!</span>
          </div>
        )}

        {/* Name, Badges & Academic Info */}
        <div className="space-y-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                {profile.name}
              </h1>
              <VerifiedBadge size="md" showText={true} />
            </div>

            {/* Academic Line */}
            <p className="text-sm font-bold text-neutral-700 mt-1 flex flex-wrap items-center gap-1.5">
              <span>{profile.year}</span>
              <span className="text-neutral-300">•</span>
              <span>{profile.branch}</span>
              {profile.section && (
                <>
                  <span className="text-neutral-300">•</span>
                  <span>Section {profile.section}</span>
                </>
              )}
            </p>

            {/* Campus Tag */}
            <div className="mt-2 flex items-center gap-2">
              <CampusBadge campus={profile.campus} size="md" />
              {profile.role === 'ADMIN' && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-50 text-purple-900 border border-purple-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-700" />
                  <span>Campus Admin</span>
                </span>
              )}
            </div>
          </div>

          {/* Bio Line */}
          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-medium max-w-3xl">
            {profile.bio || "NIAT student developing modern web applications, exploring emerging tech, and collaborating across campus."}
          </p>
        </div>

      </div>

    </div>
  );
};
