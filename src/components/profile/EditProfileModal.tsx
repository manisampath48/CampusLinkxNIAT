import React, { useState, useRef } from 'react';
import { 
  X, 
  User, 
  Code2, 
  Link2, 
  Trophy, 
  Terminal, 
  Image as ImageIcon, 
  Lock, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Plus, 
  Trash2, 
  Globe2,
  Camera,
  Loader2
} from 'lucide-react';
import { UserProfile, StructuredAchievement, StructuredHackathon } from '../../types';
import { SUGGESTED_SKILLS, SUGGESTED_INTERESTS, COVER_PRESETS, isValidUrl } from './profileConstants';
import { uploadAvatarImage } from '../../services/imageUploadService';

interface EditProfileModalProps {
  profile: UserProfile;
  initialTab?: string;
  onClose: () => void;
  onSaveProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  profile,
  initialTab = 'about',
  onClose,
  onSaveProfile
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Form State
  const [avatar, setAvatar] = useState(profile.avatar || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(0);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [bio, setBio] = useState(profile.bio || '');
  const [skills, setSkills] = useState<string[]>(profile.skills || []);
  const [newSkill, setNewSkill] = useState('');
  const [interests, setInterests] = useState<string[]>(profile.interests || []);
  const [newInterest, setNewInterest] = useState('');
  const [githubUrl, setGithubUrl] = useState(profile.githubUrl || '');
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl || '');
  const [portfolioUrl, setPortfolioUrl] = useState(profile.portfolioUrl || '');
  const [customWebsite, setCustomWebsite] = useState(profile.customWebsite || '');
  const [visibility, setVisibility] = useState<'public' | 'private'>(profile.visibility || 'public');
  const [coverPreset, setCoverPreset] = useState(profile.coverPreset || 'crimson_mesh');

  // Achievements state
  const [structuredAchievements, setStructuredAchievements] = useState<StructuredAchievement[]>(() => {
    if (profile.structuredAchievements && profile.structuredAchievements.length > 0) {
      return [...profile.structuredAchievements];
    }
    return (profile.achievements || []).map((a, i) => ({
      id: `ach_${i}_${Date.now()}`,
      title: a,
      type: 'award' as const
    }));
  });
  const [newAchTitle, setNewAchTitle] = useState('');
  const [newAchOrg, setNewAchOrg] = useState('');

  // Hackathons state
  const [structuredHackathons, setStructuredHackathons] = useState<StructuredHackathon[]>(() => {
    if (profile.structuredHackathons && profile.structuredHackathons.length > 0) {
      return [...profile.structuredHackathons];
    }
    return (profile.hackathons || []).map((h, i) => ({
      id: `hack_${i}_${Date.now()}`,
      name: h,
      role: 'Participant',
      result: 'Completed'
    }));
  });
  const [newHackName, setNewHackName] = useState('');
  const [newHackRole, setNewHackRole] = useState('');
  const [newHackResult, setNewHackResult] = useState('Participant');

  const markDirty = () => {
    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
  };

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    if (skills.some(s => s.toLowerCase() === trimmed.toLowerCase())) return;
    setSkills([...skills, trimmed]);
    setNewSkill('');
    markDirty();
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
    markDirty();
  };

  const handleAddInterest = (interest: string) => {
    const trimmed = interest.trim();
    if (!trimmed) return;
    if (interests.some(i => i.toLowerCase() === trimmed.toLowerCase())) return;
    setInterests([...interests, trimmed]);
    setNewInterest('');
    markDirty();
  };

  const handleRemoveInterest = (interestToRemove: string) => {
    setInterests(interests.filter(i => i !== interestToRemove));
    markDirty();
  };

  const handleAddAchievement = () => {
    if (!newAchTitle.trim()) return;
    setStructuredAchievements([
      ...structuredAchievements,
      {
        id: `ach_${Date.now()}`,
        title: newAchTitle.trim(),
        organization: newAchOrg.trim() || undefined,
        type: 'award'
      }
    ]);
    setNewAchTitle('');
    setNewAchOrg('');
    markDirty();
  };

  const handleRemoveAchievement = (id: string) => {
    setStructuredAchievements(structuredAchievements.filter(a => a.id !== id));
    markDirty();
  };

  const handleAddHackathon = () => {
    if (!newHackName.trim()) return;
    setStructuredHackathons([
      ...structuredHackathons,
      {
        id: `hack_${Date.now()}`,
        name: newHackName.trim(),
        role: newHackRole.trim() || 'Participant',
        result: newHackResult.trim() || 'Completed'
      }
    ]);
    setNewHackName('');
    setNewHackRole('');
    setNewHackResult('Participant');
    markDirty();
  };

  const handleRemoveHackathon = (id: string) => {
    setStructuredHackathons(structuredHackathons.filter(h => h.id !== id));
    markDirty();
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    setPhotoProgress(0);
    setErrorMessage(null);

    try {
      const res = await uploadAvatarImage(file, (pct) => setPhotoProgress(pct));
      if (res.success && res.downloadUrl) {
        setAvatar(res.downloadUrl);
        markDirty();
      } else {
        setErrorMessage(res.error || 'Failed to upload photo.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error uploading photo.');
    } finally {
      setIsUploadingPhoto(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleSaveAll = async () => {
    setErrorMessage(null);

    // Validate URLs if populated
    if (githubUrl.trim() && !isValidUrl(githubUrl)) {
      setErrorMessage('Please enter a valid GitHub URL (e.g. https://github.com/username).');
      setActiveTab('socials');
      return;
    }
    if (linkedinUrl.trim() && !isValidUrl(linkedinUrl)) {
      setErrorMessage('Please enter a valid LinkedIn URL (e.g. https://linkedin.com/in/username).');
      setActiveTab('socials');
      return;
    }
    if (portfolioUrl.trim() && !isValidUrl(portfolioUrl)) {
      setErrorMessage('Please enter a valid Portfolio URL.');
      setActiveTab('socials');
      return;
    }

    setIsSaving(true);
    try {
      const legacyAchievements = structuredAchievements.map(a => a.title);
      const legacyHackathons = structuredHackathons.map(h => h.name);

      await onSaveProfile({
        avatar: avatar || undefined,
        bio: bio.trim(),
        skills,
        interests,
        githubUrl: githubUrl.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
        customWebsite: customWebsite.trim() || undefined,
        visibility,
        coverPreset,
        structuredAchievements,
        achievements: legacyAchievements,
        structuredHackathons,
        hackathons: legacyHackathons,
      });

      setHasUnsavedChanges(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const navTabs = [
    { key: 'about', label: 'About & Bio', icon: <User className="w-4 h-4" /> },
    { key: 'skills', label: 'Skills & Interests', icon: <Code2 className="w-4 h-4" /> },
    { key: 'socials', label: 'Social & Web Links', icon: <Link2 className="w-4 h-4" /> },
    { key: 'achievements', label: 'Achievements', icon: <Trophy className="w-4 h-4" /> },
    { key: 'hackathons', label: 'Hackathons', icon: <Terminal className="w-4 h-4" /> },
    { key: 'theme', label: 'Cover & Theme', icon: <ImageIcon className="w-4 h-4" /> },
    { key: 'privacy', label: 'Privacy', icon: <Lock className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-neutral-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-red-900" />
              <span>Edit Student Profile</span>
            </h2>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              Update your personal narrative, technical stack, and campus presence.
            </p>
          </div>
          <button
            onClick={handleAttemptClose}
            className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 bg-neutral-50 border-b border-neutral-200/70 overflow-x-auto no-scrollbar">
          {navTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-red-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Content Body by Tab */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* TAB 1: ABOUT & BIO */}
          {activeTab === 'about' && (
            <div className="space-y-4 animate-in fade-in">
              
              {/* Profile Photo Management */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-full ring-2 ring-neutral-200 bg-neutral-900 overflow-hidden shrink-0 relative flex items-center justify-center">
                    {avatar && !avatar.includes('ui-avatars.com') ? (
                      <img src={avatar} alt={profile.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-white font-black text-lg">
                        {profile.name ? profile.name.slice(0, 2).toUpperCase() : 'NI'}
                      </div>
                    )}

                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white">
                        <Loader2 className="w-4 h-4 animate-spin text-red-500 mb-0.5" />
                        <span className="text-[10px] font-black">{photoProgress}%</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-neutral-900">Student Profile Photo</h4>
                    <p className="text-[11px] text-neutral-500 font-medium mt-0.5">
                      JPG, PNG, or WebP. Under 10 MB.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="px-3 py-1.5 bg-red-900 hover:bg-red-950 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{avatar ? 'Change Photo' : 'Upload Photo'}</span>
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200/80 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                  <Lock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Official Academic Record (Locked)</span>
                </div>
                <p className="text-xs text-neutral-600 font-medium">
                  {profile.name} • {profile.campus} • {profile.year} ({profile.branch})
                </p>
                <p className="text-[10px] text-neutral-400">
                  Official name and campus details are verified by university administration.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-black text-neutral-800 uppercase tracking-wider">
                    Bio & Personal Narrative
                  </label>
                  <span className="text-[11px] font-semibold text-neutral-400">
                    {750 - bio.length} chars remaining
                  </span>
                </div>
                <textarea
                  value={bio}
                  onChange={(e) => {
                    if (e.target.value.length <= 750) {
                      setBio(e.target.value);
                      markDirty();
                    }
                  }}
                  rows={5}
                  placeholder="Introduce yourself to fellow students. What technologies are you passionate about? What projects are you currently hacking on? What are your career aspirations?"
                  className="w-full p-3.5 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-900/20 focus:border-red-900"
                />
              </div>
            </div>
          )}

          {/* TAB 2: SKILLS & INTERESTS */}
          {activeTab === 'skills' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Technical Skills */}
              <div className="space-y-3">
                <label className="block text-xs font-black text-neutral-800 uppercase tracking-wider">
                  Technical Skills ({skills.length})
                </label>
                
                <div className="flex flex-wrap gap-2 p-3 bg-neutral-50 rounded-2xl border border-neutral-200 min-h-[50px]">
                  {skills.map((s) => (
                    <span key={s} className="px-3 py-1 bg-white border border-red-200 rounded-xl text-xs font-bold text-neutral-900 flex items-center gap-1.5 shadow-2xs">
                      <span>{s}</span>
                      <button type="button" onClick={() => handleRemoveSkill(s)} className="text-neutral-400 hover:text-red-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill(newSkill);
                      }
                    }}
                    placeholder="Add a new skill (e.g. Next.js, Python)..."
                    className="flex-1 px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSkill(newSkill)}
                    className="px-4 py-2 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-xl"
                  >
                    Add
                  </button>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-neutral-400 mb-1.5">Quick Suggestions:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_SKILLS.filter(s => !skills.includes(s)).slice(0, 8).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleAddSkill(s)}
                        className="px-2.5 py-1 bg-neutral-100 hover:bg-red-50 text-neutral-700 hover:text-red-900 rounded-lg text-[11px] font-semibold border border-neutral-200/80 flex items-center gap-1"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>{s}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interests */}
              <div className="space-y-3 pt-4 border-t border-neutral-100">
                <label className="block text-xs font-black text-neutral-800 uppercase tracking-wider">
                  Areas of Interest ({interests.length})
                </label>
                
                <div className="flex flex-wrap gap-2 p-3 bg-neutral-50 rounded-2xl border border-neutral-200 min-h-[50px]">
                  {interests.map((i) => (
                    <span key={i} className="px-3 py-1 bg-white border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-800 flex items-center gap-1.5 shadow-2xs">
                      <span>{i}</span>
                      <button type="button" onClick={() => handleRemoveInterest(i)} className="text-neutral-400 hover:text-neutral-800">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddInterest(newInterest);
                      }
                    }}
                    placeholder="Add an interest (e.g. Open Source, Generative AI)..."
                    className="flex-1 px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddInterest(newInterest)}
                    className="px-4 py-2 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-xl"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SOCIALS & WEB */}
          {activeTab === 'socials' && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">GitHub Profile URL</label>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => { setGithubUrl(e.target.value); markDirty(); }}
                  placeholder="https://github.com/yourhandle"
                  className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">LinkedIn Profile URL</label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => { setLinkedinUrl(e.target.value); markDirty(); }}
                  placeholder="https://linkedin.com/in/yourhandle"
                  className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Personal Portfolio URL</label>
                <input
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => { setPortfolioUrl(e.target.value); markDirty(); }}
                  placeholder="https://yourportfolio.dev"
                  className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Custom Website or Blog URL</label>
                <input
                  type="url"
                  value={customWebsite}
                  onChange={(e) => { setCustomWebsite(e.target.value); markDirty(); }}
                  placeholder="https://myblog.com"
                  className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium"
                />
              </div>
            </div>
          )}

          {/* TAB 4: ACHIEVEMENTS */}
          {activeTab === 'achievements' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAchTitle}
                  onChange={(e) => setNewAchTitle(e.target.value)}
                  placeholder="Achievement title (e.g. 1st Place CodeSprint)..."
                  className="flex-1 px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium"
                />
                <button
                  type="button"
                  onClick={handleAddAchievement}
                  className="px-4 py-2 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-xl"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {structuredAchievements.map((ach) => (
                  <div key={ach.id} className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-neutral-900 truncate">{ach.title}</span>
                    <button type="button" onClick={() => handleRemoveAchievement(ach.id)} className="p-1 text-neutral-400 hover:text-red-700">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {structuredAchievements.length === 0 && (
                  <p className="text-xs text-neutral-400 italic py-2 text-center">No achievements added.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: HACKATHONS */}
          {activeTab === 'hackathons' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newHackName}
                  onChange={(e) => setNewHackName(e.target.value)}
                  placeholder="Hackathon Name..."
                  className="px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium"
                />
                <input
                  type="text"
                  value={newHackRole}
                  onChange={(e) => setNewHackRole(e.target.value)}
                  placeholder="Your Role (e.g. Frontend Lead)..."
                  className="px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium"
                />
              </div>

              <button
                type="button"
                onClick={handleAddHackathon}
                className="w-full py-2 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-xl"
              >
                Add Hackathon Entry
              </button>

              <div className="space-y-2">
                {structuredHackathons.map((hack) => (
                  <div key={hack.id} className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 truncate">{hack.name}</p>
                      <p className="text-[10px] text-neutral-500">{hack.role || 'Participant'}</p>
                    </div>
                    <button type="button" onClick={() => handleRemoveHackathon(hack.id)} className="p-1 text-neutral-400 hover:text-red-700">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {structuredHackathons.length === 0 && (
                  <p className="text-xs text-neutral-400 italic py-2 text-center">No hackathon entries added.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: THEME & BANNER */}
          {activeTab === 'theme' && (
            <div className="space-y-4 animate-in fade-in">
              <label className="block text-xs font-black text-neutral-800 uppercase tracking-wider">
                Select Cover Banner Theme
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {COVER_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setCoverPreset(p.id); markDirty(); }}
                    className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden h-20 flex flex-col justify-between cursor-pointer ${
                      coverPreset === p.id 
                        ? 'border-red-900 ring-2 ring-red-900/30' 
                        : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r ${p.gradient}`} />
                    <div className="absolute inset-0 bg-black/20" />
                    <span className="relative z-10 text-xs font-black text-white">{p.name}</span>
                    {coverPreset === p.id && (
                      <span className="relative z-10 self-end bg-white text-red-900 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Selected
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-2">
                <label className="block text-xs font-black text-neutral-800 uppercase tracking-wider">
                  Campus Profile Visibility
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setVisibility('public'); markDirty(); }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      visibility === 'public'
                        ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-600/20'
                        : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Globe2 className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold text-neutral-900">Public to NIAT Network</span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      All verified NIAT students and recruiters can view your profile and portfolio.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setVisibility('private'); markDirty(); }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      visibility === 'private'
                        ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-600/20'
                        : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="w-4 h-4 text-amber-700" />
                      <span className="text-xs font-bold text-neutral-900">Private (Connections Only)</span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Only students whom you have connected with can view your full details.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleAttemptClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-900 hover:bg-red-950 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer hover:shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>

      </div>

      {/* Discard Confirmation Dialog */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-neutral-200 shadow-2xl space-y-4">
            <h4 className="text-sm font-black text-neutral-900">You have unsaved changes</h4>
            <p className="text-xs text-neutral-600 font-medium leading-relaxed">
              Are you sure you want to discard your edits and close the profile editor?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 cursor-pointer"
              >
                Keep Editing
              </button>
              <button
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-900 text-white hover:bg-red-950 shadow-xs cursor-pointer"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
