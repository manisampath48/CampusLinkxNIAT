import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';
import { useStorage } from '../hooks/useStorage';
import { UserProfile, StructuredAchievement, StructuredHackathon } from '../types';
import { ProfileHero } from '../components/profile/ProfileHero';
import { ProfileCompletionCard } from '../components/profile/ProfileCompletionCard';
import { AboutSection } from '../components/profile/AboutSection';
import { SkillsAndInterestsSection } from '../components/profile/SkillsAndInterestsSection';
import { ProjectsSection } from '../components/profile/ProjectsSection';
import { AchievementsSection } from '../components/profile/AchievementsSection';
import { HackathonsSection } from '../components/profile/HackathonsSection';
import { SocialLinksCard } from '../components/profile/SocialLinksCard';
import { AcademicIdentityCard } from '../components/profile/AcademicIdentityCard';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { CoverPresetModal } from '../components/profile/CoverPresetModal';
import { ShareProfileModal } from '../components/profile/ShareProfileModal';

interface ProfilePageProps {
  profile?: UserProfile | null;
  onNavigateTab?: (tab: string) => void;
  onOpenMessage?: (user: UserProfile) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ 
  profile: customProfile,
  onNavigateTab,
  onOpenMessage
}) => {
  const storage = useStorage();
  const loggedUser = storage.getCurrentUser();
  const isSelf = Boolean(
    loggedUser && 
    (!customProfile || loggedUser.uid === customProfile.uid || (customProfile.studentId && loggedUser.studentId === customProfile.studentId))
  );
  const profileToDisplay = isSelf ? loggedUser : (customProfile || loggedUser);

  // View & Modal states
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalInitialTab, setEditModalInitialTab] = useState('about');
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Real Projects authored by this student
  const studentProjects = useMemo(() => {
    if (!profileToDisplay) return [];
    return storage.getProjects().filter(
      p => p.creatorId === profileToDisplay.uid || p.ownerUid === profileToDisplay.uid
    );
  }, [profileToDisplay, storage]);

  // Real showcases created by this student
  const studentShowcases = useMemo(() => {
    if (!profileToDisplay) return [];
    return storage.getStudentShowcases().filter(
      sc => sc.userId === profileToDisplay.uid || sc.ownerUid === profileToDisplay.uid
    );
  }, [profileToDisplay, storage]);

  // Connection status with this student
  const connectionState = useMemo(() => {
    if (!profileToDisplay || isSelf) return 'none' as const;
    return storage.getConnectionState(profileToDisplay.uid);
  }, [profileToDisplay, isSelf, storage]);

  // If no profile found / loading error state
  if (!profileToDisplay) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-white rounded-3xl border border-neutral-200/80 shadow-xs text-center space-y-4">
        <div className="p-3 bg-red-50 text-red-900 rounded-2xl border border-red-200">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-base font-black text-neutral-900">Unable to load profile</h2>
          <p className="text-xs text-neutral-500 font-medium mt-1">
            The requested student profile could not be found or you may not be authenticated.
          </p>
        </div>
        <button
          onClick={() => {
            if (onNavigateTab) onNavigateTab('home');
          }}
          className="px-4 py-2 bg-red-900 hover:bg-red-950 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
        >
          Return to Feed
        </button>
      </div>
    );
  }

  // Action Handlers
  const handleUpdateAvatar = async (downloadUrl: string) => {
    if (!isSelf) return;
    storage.updateProfile({ avatar: downloadUrl });
    showToast("Profile photo updated successfully!");
  };

  const handleUpdateCoverPreset = async (presetId: string) => {
    if (!isSelf) return;
    storage.updateProfile({ coverPreset: presetId, coverImage: undefined });
    showToast("Cover theme applied!");
  };

  const handleUpdateCustomCover = async (downloadUrl: string) => {
    if (!isSelf) return;
    storage.updateProfile({ coverImage: downloadUrl });
    showToast("Cover banner uploaded!");
  };

  const handleResetCover = async () => {
    if (!isSelf) return;
    storage.updateProfile({ coverPreset: 'crimson_mesh', coverImage: undefined });
    showToast("Cover reset to default.");
  };

  const handleSaveBio = async (newBio: string) => {
    if (!isSelf) return;
    storage.updateProfile({ bio: newBio });
    showToast("Bio updated successfully!");
  };

  const handleSaveSkillsAndInterests = async (skills: string[], interests: string[]) => {
    if (!isSelf) return;
    storage.updateProfile({ skills, interests });
    showToast("Skills and interests updated!");
  };

  const handleSaveAchievements = async (structured: StructuredAchievement[], legacy: string[]) => {
    if (!isSelf) return;
    storage.updateProfile({
      structuredAchievements: structured,
      achievements: legacy
    });
    showToast("Achievements updated!");
  };

  const handleSaveHackathons = async (structured: StructuredHackathon[], legacy: string[]) => {
    if (!isSelf) return;
    storage.updateProfile({
      structuredHackathons: structured,
      hackathons: legacy
    });
    showToast("Hackathons updated!");
  };

  const handleToggleVisibility = (newVisibility: 'public' | 'private') => {
    if (!isSelf) return;
    storage.updateProfile({ visibility: newVisibility });
    showToast(newVisibility === 'public' ? 'Profile is now Public to NIAT students.' : 'Profile is now Private to connections.');
  };

  const handleSaveFullProfile = async (updates: Partial<UserProfile>) => {
    if (!isSelf) return;
    storage.updateProfile(updates);
    showToast("Profile updated successfully!");
  };

  const handleOpenEditModalWithTab = (tab: string = 'about') => {
    setEditModalInitialTab(tab);
    setShowEditModal(true);
  };

  const handleSendConnection = () => {
    if (profileToDisplay && !isSelf) {
      storage.sendConnectionRequest(profileToDisplay.uid);
      showToast(`Connection request sent to ${profileToDisplay.name}!`);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-neutral-800 text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header Section */}
      <ProfileHero
        profile={profileToDisplay}
        isSelf={isSelf}
        isPreviewMode={isPreviewMode}
        connectionState={connectionState}
        onEditProfile={handleOpenEditModalWithTab}
        onTogglePreview={() => setIsPreviewMode(!isPreviewMode)}
        onShareProfile={() => setShowShareModal(true)}
        onOpenMessage={onOpenMessage ? () => onOpenMessage(profileToDisplay) : undefined}
        onSendConnection={handleSendConnection}
        onUpdateAvatar={handleUpdateAvatar}
        onUpdateCover={handleUpdateCustomCover}
        onOpenCoverPresets={() => setShowCoverModal(true)}
      />

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Main Narrative & Activities (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. About Me */}
          <AboutSection
            bio={profileToDisplay.bio}
            isSelf={isSelf}
            isPreviewMode={isPreviewMode}
            onSaveBio={handleSaveBio}
          />

          {/* 2. Technical Skills & Focus */}
          <SkillsAndInterestsSection
            skills={profileToDisplay.skills}
            interests={profileToDisplay.interests}
            isSelf={isSelf}
            isPreviewMode={isPreviewMode}
            onSaveSkillsAndInterests={handleSaveSkillsAndInterests}
          />

          {/* 3. My Projects */}
          <ProjectsSection
            projects={studentProjects}
            showcases={studentShowcases}
            isSelf={isSelf}
            isPreviewMode={isPreviewMode}
            onCreateProject={onNavigateTab ? () => onNavigateTab('projects') : undefined}
          />

          {/* 4. Achievements */}
          <AchievementsSection
            achievements={profileToDisplay.achievements}
            structuredAchievements={profileToDisplay.structuredAchievements}
            isSelf={isSelf}
            isPreviewMode={isPreviewMode}
            onSaveAchievements={handleSaveAchievements}
          />

          {/* 5. Hackathons & Competitions */}
          <HackathonsSection
            hackathons={profileToDisplay.hackathons}
            structuredHackathons={profileToDisplay.structuredHackathons}
            isSelf={isSelf}
            isPreviewMode={isPreviewMode}
            onSaveHackathons={handleSaveHackathons}
          />

        </div>

        {/* RIGHT COLUMN: Profile Sidebar (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 1. Profile Completion (Self only, hidden in preview) */}
          {isSelf && !isPreviewMode && (
            <ProfileCompletionCard
              profile={profileToDisplay}
              userProjectsCount={studentProjects.length + studentShowcases.length}
              onEditSection={handleOpenEditModalWithTab}
              onToggleVisibility={handleToggleVisibility}
            />
          )}

          {/* 2. Connect With Me / Social Links */}
          <SocialLinksCard
            profile={profileToDisplay}
            isSelf={isSelf}
            isPreviewMode={isPreviewMode}
            onEditSocials={() => handleOpenEditModalWithTab('socials')}
          />

          {/* 3. Academic Identity Card (Official locked info) */}
          <AcademicIdentityCard
            profile={profileToDisplay}
          />

        </div>

      </div>

      {/* Edit Profile Full Modal */}
      {showEditModal && (
        <EditProfileModal
          profile={profileToDisplay}
          initialTab={editModalInitialTab}
          onClose={() => setShowEditModal(false)}
          onSaveProfile={handleSaveFullProfile}
        />
      )}

      {/* Cover Preset & Upload Modal */}
      {showCoverModal && (
        <CoverPresetModal
          currentPreset={profileToDisplay.coverPreset}
          customCoverUrl={profileToDisplay.coverImage}
          onClose={() => setShowCoverModal(false)}
          onSavePreset={handleUpdateCoverPreset}
          onSaveCustomCover={handleUpdateCustomCover}
          onResetCover={handleResetCover}
        />
      )}

      {/* Share Profile Modal */}
      {showShareModal && (
        <ShareProfileModal
          profile={profileToDisplay}
          onClose={() => setShowShareModal(false)}
        />
      )}

    </div>
  );
};
