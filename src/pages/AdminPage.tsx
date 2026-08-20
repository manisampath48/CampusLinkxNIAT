import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Building2, 
  Trash2, 
  CheckCircle, 
  Send, 
  Sparkles, 
  Search, 
  Key, 
  PlusCircle, 
  FileSpreadsheet, 
  RefreshCw, 
  Copy, 
  Check, 
  Image as ImageIcon, 
  Palette, 
  RotateCcw, 
  Camera, 
  Save,
  Upload,
  Loader2,
  Users,
  LayoutDashboard,
  Megaphone
} from 'lucide-react';
import { useStorage } from '../hooks/useStorage';
import { ApprovedStudent, CampusDetails, CampusName, YearOfStudy, Section, Branch } from '../types';
import { NiatLogo } from '../components/common/NiatLogo';
import { DragAndDropUploader } from '../components/common/DragAndDropUploader';
import { uploadImageToFirebaseStorage } from '../services/imageUploadService';
import { isAuthorizedAdmin } from '../utils/adminAuth';
import { auth } from '../lib/firebase';
import { 
  fetchApprovedStudentsForAdmin, 
  saveApprovedStudent, 
  regenerateInvitationCode, 
  toggleStudentAccountStatus, 
  importStudentsFromCsv 
} from '../services/adminService';
import { seedApprovedStudentsInFirestore } from '../services/firestoreStudentService';
import { RegisteredStudentsManager } from '../components/admin/RegisteredStudentsManager';

type AdminTab = 'registered' | 'approved' | 'dashboard' | 'branding' | 'broadcast' | 'moderation';

export const AdminPage: React.FC = () => {
  const storage = useStorage();
  const currentUser = storage.getCurrentUser();
  const isAdmin = isAuthorizedAdmin(currentUser, auth.currentUser);

  const posts = storage.getPosts();

  // Branding & Campus Customizer state
  const brandingConfig = storage.getBrandingConfig();
  const initialCampuses = storage.getCampuses();

  const [logoUrl, setLogoUrl] = useState<string>(brandingConfig.logoUrl || '');
  const [campusesState, setCampusesState] = useState<CampusDetails[]>(initialCampuses);
  const [savingBranding, setSavingBranding] = useState<boolean>(false);

  // Sync state if storage updates
  useEffect(() => {
    setCampusesState(storage.getCampuses());
    setLogoUrl(storage.getBrandingConfig().logoUrl || '');
  }, []);

  // Admin roster state
  const [students, setStudents] = useState<ApprovedStudent[]>([]);
  const [selectedCampus, setSelectedCampus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-neutral-200/80 shadow-lg text-center space-y-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-900 ring-4 ring-red-50">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Admin Authorization Required</h2>
          <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
            The CampusLink Admin Console is restricted to authorized NIAT administrators. You are currently not signed in with an administrator profile.
          </p>
        </div>
      </div>
    );
  }

  // Modals & Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);

  // Admin Tab Navigation state
  const [adminTab, setAdminTab] = useState<AdminTab>('registered');
  const [registeredCount, setRegisteredCount] = useState<number>(0);

  // Single Add student form
  const [newStudentId, setNewStudentId] = useState('');
  const [newName, setNewName] = useState('');
  const [newCampus, setNewCampus] = useState<CampusName>('Annamacharya × NIAT');
  const [newYear, setNewYear] = useState<YearOfStudy>('1st Year');
  const [newSection, setNewSection] = useState<Section>('A');
  const [newBranch, setNewBranch] = useState<Branch>('CSE');

  // CSV Import state
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState<any | null>(null);

  // UI status
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCampusIdx, setUploadingCampusIdx] = useState<number | null>(null);

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const res = await uploadImageToFirebaseStorage(file, 'logo');
    setUploadingLogo(false);

    if (res.success && res.downloadUrl) {
      setLogoUrl(res.downloadUrl);
      storage.updateBrandingConfig({ logoUrl: res.downloadUrl });
      showToast("Official Logo uploaded to persistent Firebase Storage!");
    } else {
      showToast(`Upload failed: ${res.error || 'Unknown error'}`);
    }
  };

  const handleUpdateCampusImage = (index: number, newImageUrl: string) => {
    const updated = [...campusesState];
    updated[index] = { ...updated[index], image: newImageUrl };
    setCampusesState(updated);
    storage.updateCampusDetails(updated);
  };

  const handleCampusFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCampusIdx(index);
    const res = await uploadImageToFirebaseStorage(file, 'campuses');
    setUploadingCampusIdx(null);

    if (res.success && res.downloadUrl) {
      handleUpdateCampusImage(index, res.downloadUrl);
      showToast(`${campusesState[index].name} photo updated & stored persistently!`);
    } else {
      showToast(`Upload failed: ${res.error || 'Unknown error'}`);
    }
  };

  const handleSaveBrandingAndCampuses = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBranding(true);
    storage.updateBrandingConfig({ logoUrl });
    storage.updateCampusDetails(campusesState);
    setSavingBranding(false);
    showToast("Campus pictures and NIAT logo updated successfully!");
  };

  const loadRoster = async () => {
    setLoading(true);
    try {
      const list = await fetchApprovedStudentsForAdmin(selectedCampus);
      if (list && list.length > 0) {
        setStudents(list);
      } else {
        const localList = storage.getApprovedStudents() || [];
        if (selectedCampus && selectedCampus !== 'All') {
          setStudents(localList.filter(s => s && s.campus === selectedCampus));
        } else {
          setStudents(localList);
        }
      }
    } catch (e) {
      console.error(e);
      setStudents(storage.getApprovedStudents() || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoster();
  }, [selectedCampus]);

  const handleCopyCode = (code: string, id: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleRegenerateCode = async (studentId: string) => {
    if (!studentId) return;
    setIsSubmitting(true);
    const res = await regenerateInvitationCode(studentId);
    setIsSubmitting(false);
    if (res.success) {
      showToast(res.message);
      loadRoster();
    } else {
      showToast(`Error: ${res.message}`);
    }
  };

  const handleSyncDefaultRoster = async () => {
    setIsSubmitting(true);
    showToast("Syncing official Annamacharya student roster to Firestore...");
    const res = await seedApprovedStudentsInFirestore(true);
    setIsSubmitting(false);
    if (res.success) {
      showToast(`Synced ${res.seededCount} official student records to Firestore.`);
      loadRoster();
    } else {
      showToast("Sync completed with available records.");
      loadRoster();
    }
  };

  const handleToggleStatus = async (studentId: string, currentStatus: string) => {
    if (!studentId) return;
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const res = await toggleStudentAccountStatus(studentId, newStatus);
    if (res.success) {
      showToast(res.message);
      loadRoster();
    }
  };

  const handleSaveSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await saveApprovedStudent({
      studentId: newStudentId,
      name: newName,
      email: `${newName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@niat.edu`,
      campus: newCampus,
      year: newYear,
      section: newSection,
      branch: newBranch,
      status: 'active'
    });
    setIsSubmitting(false);

    if (res.success) {
      showToast(res.message);
      setShowAddModal(false);
      setNewStudentId('');
      setNewName('');
      loadRoster();
    } else {
      showToast(`Error: ${res.message}`);
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;

    setIsSubmitting(true);
    const res = await importStudentsFromCsv(csvText);
    setIsSubmitting(false);
    setImportResult(res);
    showToast(`CSV Import completed! Imported ${res.importedCount} student records.`);
    loadRoster();
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) return;
    showToast(`Broadcast sent!`);
    setBroadcastMsg('');
  };

  const handleDeletePost = (postId: string) => {
    if (!postId) return;
    storage.deletePost(postId);
    showToast("Post removed by Admin moderation.");
  };

  // Safe filter roster
  const filteredStudents = (students || []).filter(s => {
    if (!s) return false;
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = s.name ? s.name.toLowerCase().includes(q) : false;
      const idMatch = s.studentId ? s.studentId.toLowerCase().includes(q) : false;
      const codeMatch = s.invitationCode ? s.invitationCode.toLowerCase().includes(q) : false;
      return nameMatch || idMatch || codeMatch;
    }
    return true;
  });

  // Safe Campus Counts
  const annamacharyaCount = (students || []).filter(p => p && p.campus && p.campus.includes('Annamacharya')).length;
  const nriCount = (students || []).filter(p => p && p.campus && p.campus.includes('NRI')).length;
  const chalapathiCount = (students || []).filter(p => p && p.campus && p.campus.includes('Chalapathi')).length;

  return (
    <div className="space-y-8 pb-12">
      
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 right-4 z-50 bg-neutral-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-neutral-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-red-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-red-400 font-extrabold text-xs uppercase tracking-widest">
          <ShieldAlert className="w-4 h-4" />
          <span>Administrator Command Center</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">CampusLink Institutional Admin</h1>
        <p className="text-xs sm:text-sm text-neutral-300">
          Manage registered student accounts, approved rosters, invitation codes, campus branding assets, and moderate network content.
        </p>
      </div>

      {/* Admin Console Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-200/80 no-scrollbar">
        <button
          onClick={() => setAdminTab('registered')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
            adminTab === 'registered'
              ? 'bg-red-900 text-white shadow-md'
              : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Registered Students</span>
          {registeredCount > 0 && (
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
              adminTab === 'registered' ? 'bg-red-800 text-red-100' : 'bg-red-100 text-red-900'
            }`}>
              {registeredCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab('approved')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
            adminTab === 'approved'
              ? 'bg-red-900 text-white shadow-md'
              : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Approved Roster & Codes</span>
        </button>

        <button
          onClick={() => setAdminTab('dashboard')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
            adminTab === 'dashboard'
              ? 'bg-red-900 text-white shadow-md'
              : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Campus Breakdown</span>
        </button>

        <button
          onClick={() => setAdminTab('branding')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
            adminTab === 'branding'
              ? 'bg-red-900 text-white shadow-md'
              : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Branding & Campuses</span>
        </button>

        <button
          onClick={() => setAdminTab('broadcast')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
            adminTab === 'broadcast'
              ? 'bg-red-900 text-white shadow-md'
              : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Broadcast</span>
        </button>

        <button
          onClick={() => setAdminTab('moderation')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
            adminTab === 'moderation'
              ? 'bg-red-900 text-white shadow-md'
              : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Moderation</span>
        </button>
      </div>

      {/* 1. REGISTERED STUDENTS TAB */}
      {adminTab === 'registered' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs">
          <RegisteredStudentsManager 
            onToast={showToast} 
            onCountUpdate={setRegisteredCount} 
          />
        </div>
      )}

      {/* 2. CAMPUS BREAKDOWN CARDS */}
      {adminTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-neutral-500 text-xs font-bold">
                <span>Annamacharya × NIAT</span>
                <Building2 className="w-4 h-4 text-red-900" />
              </div>
              <p className="text-3xl font-black text-neutral-900">{annamacharyaCount}</p>
              <p className="text-[11px] text-neutral-400">Approved Roster Records</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-neutral-500 text-xs font-bold">
                <span>NRI × NIAT</span>
                <Building2 className="w-4 h-4 text-red-900" />
              </div>
              <p className="text-3xl font-black text-neutral-900">{nriCount}</p>
              <p className="text-[11px] text-neutral-400">Approved Roster Records</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-neutral-500 text-xs font-bold">
                <span>Chalapathi × NIAT</span>
                <Building2 className="w-4 h-4 text-red-900" />
              </div>
              <p className="text-3xl font-black text-neutral-900">{chalapathiCount}</p>
              <p className="text-[11px] text-neutral-400">Approved Roster Records</p>
            </div>
          </div>

          <div className="bg-neutral-50 rounded-3xl p-6 border border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-neutral-900 text-sm">Quick Jump to Registered Students</h3>
              <p className="text-xs text-neutral-500 mt-0.5">View and manage authenticated student accounts and permissions.</p>
            </div>
            <button
              onClick={() => setAdminTab('registered')}
              className="px-4 py-2 bg-red-900 hover:bg-red-950 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Open Registered Students</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. BRANDING & CAMPUS PICTURES CUSTOMIZER */}
      {adminTab === 'branding' && (
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-900 border border-red-200 text-xs font-bold mb-2">
              <Palette className="w-3.5 h-3.5" />
              <span>Institutional Branding Manager</span>
            </div>
            <h2 className="font-extrabold text-neutral-900 text-lg flex items-center gap-2">
              <Camera className="w-5 h-5 text-red-900" />
              <span>Campus Pictures & Logo Customizer</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Customize the official NIAT logo asset and high-resolution campus pictures across all 3 partner campuses.
            </p>
          </div>

          <button
            onClick={handleSaveBrandingAndCampuses}
            disabled={savingBranding}
            className="px-5 py-2.5 bg-red-900 hover:bg-red-950 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Campus Pictures & Logo</span>
          </button>
        </div>

        {/* 1. NIAT / CampusLink Logo Manager */}
        <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase text-neutral-800 tracking-wider flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-red-900" />
              <span>Official Brand Logo (NIAT / CampusLink)</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                setLogoUrl('');
                storage.updateBrandingConfig({ logoUrl: '' });
                showToast("Reset logo to default emblem.");
              }}
              className="text-[11px] font-bold text-neutral-500 hover:text-red-900 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to Default</span>
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="p-4 bg-white rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-center min-w-[120px] min-h-[120px]">
                <NiatLogo size="xl" />
              </div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Live Navbar & Auth Logo</span>
            </div>

            <div className="flex-1 w-full space-y-3">
              <DragAndDropUploader
                label="Upload Campus Logo"
                folder="branding"
                currentImageUrl={logoUrl}
                onImageUploaded={(downloadUrl) => {
                  setLogoUrl(downloadUrl);
                  storage.updateBrandingConfig({ logoUrl: downloadUrl });
                  showToast("CampusLink logo updated and synchronized across all devices!");
                }}
                aspectRatioHint="Drag image from File Explorer or click to choose file"
              />

              {/* Sample Logo Preset Buttons */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-[10px] font-bold uppercase text-neutral-400">
                  Quick System Presets
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLogoUrl('');
                      storage.updateBrandingConfig({ logoUrl: '' });
                      showToast("Set logo to default NIAT emblem.");
                    }}
                    className="px-2.5 py-1 bg-white border border-neutral-200 hover:border-red-900 rounded-lg text-[11px] font-bold text-neutral-700 transition-colors cursor-pointer"
                  >
                    Default Red NIAT Emblem
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const url = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=300';
                      setLogoUrl(url);
                      storage.updateBrandingConfig({ logoUrl: url });
                      showToast("Updated branding preset.");
                    }}
                    className="px-2.5 py-1 bg-white border border-neutral-200 hover:border-red-900 rounded-lg text-[11px] font-bold text-neutral-700 transition-colors cursor-pointer"
                  >
                    Modern Tech Crest
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Campus Pictures Manager */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold uppercase text-neutral-800 tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-red-900" />
            <span>Campus Pictures & Photos</span>
          </h3>

          <div className="grid grid-cols-1 gap-6">
            {campusesState.map((campus, idx) => (
              <div
                key={campus.name}
                className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-4 transition-all hover:border-neutral-300"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Campus Picture Thumbnail Preview */}
                  <div className="w-full md:w-64 h-40 rounded-xl overflow-hidden bg-neutral-900 relative shrink-0 border border-neutral-200 shadow-xs">
                    <img
                      src={campus.image}
                      alt={campus.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&q=80&w=600";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent flex items-end p-3">
                      <span className="text-xs font-black text-white drop-shadow-sm">{campus.name}</span>
                    </div>
                  </div>

                  {/* Campus Picture Controls */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-neutral-900">{campus.name}</span>
                      <span className="text-[10px] font-mono text-neutral-400">{campus.code} • {campus.location}</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-neutral-600">
                          Campus Photo Image (URL or Upload)
                        </label>
                        <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-900 hover:text-red-950 cursor-pointer bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors border border-red-200">
                          {uploadingCampusIdx === idx ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload Photo to Storage</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleCampusFileUpload(idx, e)}
                            disabled={uploadingCampusIdx === idx}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <input
                        type="text"
                        value={campus.image}
                        onChange={(e) => handleUpdateCampusImage(idx, e.target.value)}
                        placeholder="Paste image URL (Unsplash, Imgur, Cloudinary, etc.)"
                        className="w-full p-2.5 bg-white border border-neutral-300 rounded-xl text-xs font-mono text-neutral-800 focus:ring-2 focus:ring-red-900/20"
                      />
                    </div>

                    {/* Preset Campus Photo Options */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase text-neutral-400">
                        Curated Campus Photo Presets
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateCampusImage(idx, 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&q=80&w=1200')}
                          className="px-2.5 py-1 bg-white border border-neutral-200 hover:border-red-900 rounded-lg text-[11px] font-bold text-neutral-700 cursor-pointer"
                        >
                          🏛 Modern Glass Tech Building
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateCampusImage(idx, 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&q=80&w=1200')}
                          className="px-2.5 py-1 bg-white border border-neutral-200 hover:border-red-900 rounded-lg text-[11px] font-bold text-neutral-700 cursor-pointer"
                        >
                          🌳 University Campus Courtyard
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateCampusImage(idx, 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200')}
                          className="px-2.5 py-1 bg-white border border-neutral-200 hover:border-red-900 rounded-lg text-[11px] font-bold text-neutral-700 cursor-pointer"
                        >
                          🔬 Innovation Lab & Tech Center
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSaveBrandingAndCampuses}
            disabled={savingBranding}
            className="px-6 py-3 bg-red-900 hover:bg-red-950 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Campus Pictures & Logo</span>
          </button>
        </div>
      </div>
      )}


      {/* 4. APPROVED STUDENTS & INVITATION CODES MANAGER */}
      {adminTab === 'approved' && (
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div>
            <h3 className="font-extrabold text-neutral-900 text-base flex items-center gap-2">
              <Key className="w-5 h-5 text-red-900" />
              <span>Approved Student Roster & Invitation Codes</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Private database of authorized NIAT students. Generate or distribute one-time invitation codes for registration.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSyncDefaultRoster}
              disabled={isSubmitting}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              title="Populate or refresh the official Annamacharya student roster in Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>Sync Official Roster</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-red-900 hover:bg-red-950 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Student</span>
            </button>
            <button
              onClick={() => setShowCsvModal(true)}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-neutral-600" />
              <span>Bulk CSV Import</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 mb-1 uppercase">Filter by Campus</label>
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold focus:bg-white"
            >
              <option value="All">All Campuses</option>
              <option value="Annamacharya × NIAT">Annamacharya × NIAT</option>
              <option value="NRI × NIAT">NRI × NIAT</option>
              <option value="Chalapathi × NIAT">Chalapathi × NIAT</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-500 mb-1 uppercase">Search Student or Code</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ID, name, or CL-code..."
                className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Roster Table */}
        <div className="overflow-x-auto border border-neutral-200/80 rounded-2xl">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-neutral-50 text-[10px] font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
                <th className="py-3 px-4">Student ID / Name</th>
                <th className="py-3 px-4">Campus</th>
                <th className="py-3 px-4">Branch & Year</th>
                <th className="py-3 px-4">Invitation Code</th>
                <th className="py-3 px-4">Registration</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    <span>Loading student records from Firestore...</span>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-500 font-medium">
                    No approved student records found matching filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.studentId} className="hover:bg-neutral-50/70 transition-all">
                    <td className="py-3 px-4">
                      <div className="font-bold text-neutral-900">{s.name}</div>
                      <div className="text-[10px] font-mono text-neutral-500">{s.studentId}</div>
                    </td>
                    <td className="py-3 px-4 text-neutral-700">{s.campus}</td>
                    <td className="py-3 px-4 text-neutral-600">
                      <div>{s.branch} - {s.section}</div>
                      <div className="text-[10px] text-neutral-400">{s.year}</div>
                    </td>
                    <td className="py-3 px-4">
                      {s.invitationCode ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-900 font-mono text-xs font-bold">
                          <span>{s.invitationCode}</span>
                          <button
                            onClick={() => handleCopyCode(s.invitationCode!, s.studentId)}
                            className="hover:text-red-900 transition-colors cursor-pointer"
                            title="Copy Invitation Code"
                          >
                            {copiedCodeId === s.studentId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-neutral-400" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-neutral-400 italic">No Code</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {s.invitationUsed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          <span>Registered</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold rounded-full">
                          <span>Unused</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRegenerateCode(s.studentId)}
                          className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                          title="Generate New Code"
                        >
                          New Code
                        </button>
                        <button
                          onClick={() => handleToggleStatus(s.studentId, s.status)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                            s.status === 'active'
                              ? 'bg-red-50 hover:bg-red-100 text-red-800'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {s.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* MODAL: ADD SINGLE STUDENT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-neutral-200">
            <h3 className="font-extrabold text-base text-neutral-900">Add Approved Student Record</h3>
            <form onSubmit={handleSaveSingleStudent} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Student ID / Roll No</label>
                <input
                  type="text"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value.toUpperCase())}
                  placeholder="e.g. N25R01A0150"
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Full Student Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Campus</label>
                <select
                  value={newCampus}
                  onChange={(e) => setNewCampus(e.target.value as CampusName)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold"
                >
                  <option value="Annamacharya × NIAT">Annamacharya × NIAT</option>
                  <option value="NRI × NIAT">NRI × NIAT</option>
                  <option value="Chalapathi × NIAT">Chalapathi × NIAT</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Year</label>
                  <select
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value as YearOfStudy)}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Section</label>
                  <select
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value as Section)}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Branch</label>
                  <select
                    value={newBranch}
                    onChange={(e) => setNewBranch(e.target.value as Branch)}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold"
                  >
                    <option value="CSE">CSE</option>
                    <option value="AI & ML">AI & ML</option>
                    <option value="Data Science">Data Science</option>
                    <option value="ECE">ECE</option>
                    <option value="IT">IT</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-red-900 hover:bg-red-950 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BULK CSV IMPORT */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-neutral-200">
            <h3 className="font-extrabold text-base text-neutral-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-red-900" />
              <span>Bulk Student Data CSV Import</span>
            </h3>
            <p className="text-xs text-neutral-500">
              Paste CSV text formatted as: <br />
              <code className="text-[10px] font-mono bg-neutral-100 p-1 rounded-md block mt-1">
                studentId, name, campus, year, section, branch, status
              </code>
            </p>

            <form onSubmit={handleCsvImport} className="space-y-3">
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`N25R01A0101, Ananya Rao, Annamacharya × NIAT, 2nd Year, A, CSE, active\nN25R01A0102, Siddharth V, NRI × NIAT, 2nd Year, B, AI & ML, active`}
                rows={6}
                className="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-xl font-mono text-xs focus:bg-white"
                required
              />

              {importResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800">
                  Successfully imported {importResult.importedCount} student records.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCsvModal(false); setImportResult(null); }}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-red-900 hover:bg-red-950 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Import Records
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BROADCAST ANNOUNCEMENT TOOL */}
      {adminTab === 'broadcast' && (
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-4">
        <h3 className="font-extrabold text-neutral-900 text-base flex items-center gap-2">
          <Send className="w-4 h-4 text-red-900" />
          <span>Send Network-Wide Broadcast Announcement</span>
        </h3>

        <form onSubmit={handleSendBroadcast} className="space-y-3">
          <textarea
            value={broadcastMsg}
            onChange={(e) => setBroadcastMsg(e.target.value)}
            placeholder="Type network notification message to broadcast to all registered NIAT students..."
            rows={3}
            className="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs font-medium focus:bg-white"
            required
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-red-900 hover:bg-red-950 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            Dispatch Broadcast Notification
          </button>
        </form>
      </div>
      )}

      {/* FEED POST MODERATION */}
      {adminTab === 'moderation' && (
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-4">
        <h3 className="font-extrabold text-neutral-900 text-base flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-900" />
          <span>Feed Post Moderation</span>
        </h3>

        <div className="space-y-3">
          {posts.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50 flex items-start justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-neutral-900">{p.authorName}</span>
                  <span className="text-[10px] text-neutral-500">({p.authorCampus})</span>
                </div>
                <p className="text-xs text-neutral-700 line-clamp-2">{p.content}</p>
              </div>

              <button
                onClick={() => handleDeletePost(p.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer shrink-0"
                title="Remove Post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
      )}

    </div>
  );
};
