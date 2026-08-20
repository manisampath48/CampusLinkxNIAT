import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  RefreshCw, 
  Eye, 
  UserX, 
  UserCheck, 
  Trash2, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ExternalLink, 
  Building2, 
  GraduationCap, 
  Mail, 
  Calendar, 
  Clock, 
  Sparkles,
  Check,
  Globe,
  Github,
  Linkedin,
  KeyRound,
  Filter,
  Layers,
  Award
} from 'lucide-react';
import { UserProfile, CampusName } from '../../types';
import { 
  fetchRegisteredStudentsForAdmin, 
  toggleRegisteredStudentStatus, 
  deleteStudentAccountAdmin 
} from '../../services/adminService';

interface RegisteredStudentsManagerProps {
  onToast: (msg: string) => void;
  onCountUpdate?: (count: number) => void;
}

export const RegisteredStudentsManager: React.FC<RegisteredStudentsManagerProps> = ({
  onToast,
  onCountUpdate
}) => {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [campusFilter, setCampusFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Disabled'>('All');

  // Modals
  const [selectedStudentForView, setSelectedStudentForView] = useState<UserProfile | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<UserProfile | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  
  // Progress states
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Fetch registered students
  const loadRegisteredStudents = async () => {
    setLoading(true);
    try {
      const data = await fetchRegisteredStudentsForAdmin(campusFilter, statusFilter);
      setStudents(data);
      if (onCountUpdate) {
        onCountUpdate(data.length);
      }
    } catch (err: any) {
      console.error("Error loading registered students:", err);
      onToast("Failed to load registered student accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegisteredStudents();
  }, [campusFilter, statusFilter]);

  // Client-side search and filtering
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      if (!student) return false;

      // Status check
      if (statusFilter === 'Active' && (student.status === 'disabled' || student.status === 'suspended')) {
        return false;
      }
      if (statusFilter === 'Disabled' && student.status !== 'disabled' && student.status !== 'suspended') {
        return false;
      }

      // Campus check
      if (campusFilter !== 'All' && student.campus !== campusFilter && !student.campus?.includes(campusFilter)) {
        return false;
      }

      // Search query check (Name, Email, NIAT ID, Registration ID / UID)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (student.name || '').toLowerCase().includes(q) || 
                          (student.officialName || '').toLowerCase().includes(q);
        const emailMatch = (student.email || '').toLowerCase().includes(q) || 
                           (student.googleEmail || '').toLowerCase().includes(q);
        const idMatch = (student.studentId || '').toLowerCase().includes(q) || 
                        (student.niatRegistrationNumber || '').toLowerCase().includes(q);
        const uidMatch = (student.uid || '').toLowerCase().includes(q) || 
                         (student.firebaseUid || '').toLowerCase().includes(q);
        return nameMatch || emailMatch || idMatch || uidMatch;
      }

      return true;
    });
  }, [students, searchQuery, campusFilter, statusFilter]);

  // Stats calculation
  const totalCount = students.length;
  const activeCount = students.filter(s => s.status !== 'disabled' && s.status !== 'suspended').length;
  const disabledCount = students.filter(s => s.status === 'disabled' || s.status === 'suspended').length;

  // Toggle Disable / Enable Account
  const handleToggleStatus = async (student: UserProfile) => {
    const isCurrentlyDisabled = student.status === 'disabled' || student.status === 'suspended';
    const targetStatus: 'active' | 'disabled' = isCurrentlyDisabled ? 'active' : 'disabled';
    
    setActionLoadingId(student.uid);
    try {
      const res = await toggleRegisteredStudentStatus(student.uid, student.studentId, targetStatus);
      if (res.success) {
        onToast(res.message);
        // Optimistically update student state
        setStudents(prev => prev.map(s => {
          if (s.uid === student.uid) {
            return { ...s, status: targetStatus };
          }
          return s;
        }));
        if (selectedStudentForView && selectedStudentForView.uid === student.uid) {
          setSelectedStudentForView(prev => prev ? { ...prev, status: targetStatus } : null);
        }
      } else {
        onToast(`Error: ${res.message}`);
      }
    } catch (err: any) {
      onToast(`Failed to update account status: ${err.message || 'Unknown error'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Permanently Delete Account
  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    if (deleteConfirmText.trim() !== 'DELETE') {
      onToast("Please type DELETE exactly to confirm.");
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteStudentAccountAdmin({
        uid: studentToDelete.uid,
        studentId: studentToDelete.studentId,
        email: studentToDelete.email,
        name: studentToDelete.officialName || studentToDelete.name
      });

      if (res.success) {
        onToast(res.message);
        // Immediately remove student from displayed list state
        setStudents(prev => prev.filter(s => s.uid !== studentToDelete.uid));
        if (selectedStudentForView?.uid === studentToDelete.uid) {
          setSelectedStudentForView(null);
        }
        setStudentToDelete(null);
        setDeleteConfirmText('');
      } else {
        onToast(`Error: ${res.message}`);
      }
    } catch (err: any) {
      console.error("Deletion error:", err);
      onToast(`Failed to delete student: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Active Campus Registry</span>
          </div>
          <h2 className="font-extrabold text-neutral-900 text-xl sm:text-2xl tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-red-900" />
            <span>Registered Student Accounts</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Official list of students who have completed registration and created active CampusLink authentication accounts.
          </p>
        </div>

        <button
          onClick={loadRegisteredStudents}
          disabled={loading}
          className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          title="Refresh registered student accounts from Firestore"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-neutral-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Accounts</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Total Registered</p>
            <p className="text-2xl font-black text-neutral-900 mt-0.5">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-900 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Active Accounts</p>
            <p className="text-2xl font-black text-emerald-900 mt-0.5">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Disabled Accounts</p>
            <p className="text-2xl font-black text-red-900 mt-0.5">{disabledCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-900 flex items-center justify-center font-bold">
            <UserX className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-neutral-50/80 border border-neutral-200/80 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          
          {/* Search Box */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name, Email, NIAT ID, or Roll No..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-medium text-neutral-800 focus:ring-2 focus:ring-red-900/20 focus:border-red-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Campus Filter */}
          <div className="md:col-span-3">
            <select
              value={campusFilter}
              onChange={(e) => setCampusFilter(e.target.value)}
              className="w-full p-2 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-700 focus:ring-2 focus:ring-red-900/20 focus:border-red-900"
            >
              <option value="All">🏛 All Campuses</option>
              <option value="Annamacharya × NIAT">Annamacharya × NIAT</option>
              <option value="NRI × NIAT">NRI × NIAT</option>
              <option value="Chalapathi × NIAT">Chalapathi × NIAT</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <div className="grid grid-cols-3 bg-neutral-200/70 p-0.5 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter('All')}
                className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                  statusFilter === 'All'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Active')}
                className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                  statusFilter === 'Active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Disabled')}
                className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                  statusFilter === 'Disabled'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Disabled
              </button>
            </div>
          </div>

        </div>

        <div className="flex items-center justify-between text-[11px] text-neutral-500 font-medium px-1">
          <span>Showing {filteredStudents.length} of {totalCount} registered students</span>
          {(searchQuery || campusFilter !== 'All' || statusFilter !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCampusFilter('All');
                setStatusFilter('All');
              }}
              className="text-red-900 font-bold hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Registered Students Table */}
      <div className="overflow-x-auto border border-neutral-200/80 rounded-2xl shadow-xs bg-white">
        <table className="w-full text-left border-collapse min-w-[820px]">
          <thead>
            <tr className="bg-neutral-50 text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
              <th className="py-3.5 px-4">Student & Photo</th>
              <th className="py-3.5 px-4">NIAT / Roll ID</th>
              <th className="py-3.5 px-4">Email</th>
              <th className="py-3.5 px-4">Campus & Branch</th>
              <th className="py-3.5 px-4">Account Status</th>
              <th className="py-3.5 px-4">Registration Date</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-xs">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-neutral-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-red-900" />
                  <span className="font-semibold">Loading registered student profiles from Cloud Firestore...</span>
                </td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-neutral-500">
                  <UserX className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
                  <p className="font-bold text-neutral-800">No registered students found</p>
                  <p className="text-xs text-neutral-400 mt-1">Try adjusting your search query or campus filter.</p>
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => {
                const isAccountDisabled = student.status === 'disabled' || student.status === 'suspended';
                const avatarSrc = student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.officialName || student.name || 'Student')}&background=800000&color=fff&bold=true`;
                const isActionLoading = actionLoadingId === student.uid;

                return (
                  <tr 
                    key={student.uid} 
                    className={`hover:bg-neutral-50/80 transition-colors ${
                      isAccountDisabled ? 'bg-red-50/20' : ''
                    }`}
                  >
                    {/* Student & Avatar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={avatarSrc}
                          alt={student.name}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-full object-cover ring-2 ring-neutral-200 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name || 'Student')}&background=800000&color=fff&bold=true`;
                          }}
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-neutral-900 flex items-center gap-1.5 truncate">
                            <span>{student.officialName || student.name}</span>
                            {student.isVerified && (
                              <span title="Verified NIAT Student">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono truncate">
                            UID: {student.uid.slice(0, 10)}...
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* NIAT / Registration ID */}
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded-md font-mono text-xs font-bold text-neutral-800">
                        <span>{student.studentId || student.niatRegistrationNumber || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3 px-4">
                      <div className="text-neutral-700 font-medium truncate max-w-[180px]" title={student.email}>
                        {student.email}
                      </div>
                      {student.isGoogleLinked && (
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5 mt-0.5">
                          <span>Google Linked</span>
                        </span>
                      )}
                    </td>

                    {/* Campus & Department */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-neutral-900 text-xs truncate max-w-[170px]">
                        {student.campus || 'Annamacharya × NIAT'}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        {student.branch || 'CSE'} • {student.year || '1st Year'}
                      </div>
                    </td>

                    {/* Account Status */}
                    <td className="py-3 px-4">
                      {isAccountDisabled ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-900 border border-red-200 text-[10px] font-extrabold rounded-full">
                          <UserX className="w-3 h-3" />
                          <span>Disabled</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10px] font-extrabold rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      )}
                    </td>

                    {/* Registration Date */}
                    <td className="py-3 px-4 text-neutral-600 font-mono text-[11px]">
                      {formatDate(student.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* View Profile Button */}
                        <button
                          onClick={() => setSelectedStudentForView(student)}
                          className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          title="View Full Student Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">View</span>
                        </button>

                        {/* Disable / Enable Button */}
                        <button
                          onClick={() => handleToggleStatus(student)}
                          disabled={isActionLoading}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                            isAccountDisabled
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                          }`}
                          title={isAccountDisabled ? "Reactivate and Enable Account" : "Disable Account Access"}
                        >
                          {isActionLoading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : isAccountDisabled ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                              <span className="hidden lg:inline">Enable</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5 text-amber-700" />
                              <span className="hidden lg:inline">Disable</span>
                            </>
                          )}
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => {
                            setStudentToDelete(student);
                            setDeleteConfirmText('');
                          }}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          title="Permanently Delete Account"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          <span className="hidden lg:inline">Delete</span>
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: VIEW STUDENT PROFILE */}
      {selectedStudentForView && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border border-neutral-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedStudentForView.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStudentForView.officialName || selectedStudentForView.name || 'Student')}&background=800000&color=fff&bold=true`}
                  alt={selectedStudentForView.name}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-red-900/20"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-lg text-neutral-900">
                      {selectedStudentForView.officialName || selectedStudentForView.name}
                    </h3>
                    {selectedStudentForView.isVerified && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-neutral-500">
                    NIAT ID: <span className="font-bold text-neutral-800">{selectedStudentForView.studentId || selectedStudentForView.niatRegistrationNumber}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudentForView(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Grid Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Campus Location</span>
                <p className="font-bold text-neutral-800 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-red-900" />
                  <span>{selectedStudentForView.campus}</span>
                </p>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Branch & Cohort</span>
                <p className="font-bold text-neutral-800 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-red-900" />
                  <span>{selectedStudentForView.branch} • {selectedStudentForView.year} (Sec {selectedStudentForView.section})</span>
                </p>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Email Address</span>
                <p className="font-bold text-neutral-800 flex items-center gap-1.5 truncate" title={selectedStudentForView.email}>
                  <Mail className="w-3.5 h-3.5 text-red-900 shrink-0" />
                  <span className="truncate">{selectedStudentForView.email}</span>
                </p>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Account Status</span>
                <div className="mt-0.5">
                  {selectedStudentForView.status === 'disabled' || selectedStudentForView.status === 'suspended' ? (
                    <span className="inline-flex items-center gap-1 text-red-800 font-bold">
                      <UserX className="w-3.5 h-3.5 text-red-600" />
                      <span>Disabled by Administrator</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-emerald-800 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Active & Authorized</span>
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* Bio / About */}
            {selectedStudentForView.bio && (
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-bold uppercase text-neutral-500 tracking-wider">Bio / Summary</h4>
                <p className="text-xs text-neutral-700 bg-neutral-50 p-3 rounded-2xl border border-neutral-200 leading-relaxed">
                  {selectedStudentForView.bio}
                </p>
              </div>
            )}

            {/* Skills & Interests */}
            {selectedStudentForView.skills && selectedStudentForView.skills.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-bold uppercase text-neutral-500 tracking-wider">Skills & Expertise</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedStudentForView.skills.map((skill, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-red-50 text-red-900 border border-red-200 rounded-lg text-[11px] font-bold">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata Footer */}
            <div className="p-3.5 bg-neutral-100/70 rounded-2xl text-[11px] text-neutral-500 font-mono flex flex-wrap items-center justify-between gap-2">
              <span>Registered: {formatDate(selectedStudentForView.createdAt)}</span>
              <span>Firebase UID: {selectedStudentForView.uid}</span>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
              <button
                onClick={() => {
                  setStudentToDelete(selectedStudentForView);
                  setDeleteConfirmText('');
                }}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleStatus(selectedStudentForView)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    selectedStudentForView.status === 'disabled' || selectedStudentForView.status === 'suspended'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  {selectedStudentForView.status === 'disabled' || selectedStudentForView.status === 'suspended' ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Enable Account</span>
                    </>
                  ) : (
                    <>
                      <UserX className="w-3.5 h-3.5" />
                      <span>Disable Account</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setSelectedStudentForView(null)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: DESTRUCTIVE DELETE CONFIRMATION */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-neutral-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-red-200 animate-in fade-in zoom-in-95">
            
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-900 ring-4 ring-red-50 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-extrabold text-lg text-neutral-900 tracking-tight">
                Delete this CampusLink account permanently?
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                This permanently removes the student's CampusLink account and associated student data. This action cannot be undone.
              </p>
            </div>

            {/* Target Student Details Box */}
            <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Student Name:</span>
                <span className="font-bold text-neutral-900">{studentToDelete.officialName || studentToDelete.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">NIAT ID:</span>
                <span className="font-mono font-bold text-neutral-900">{studentToDelete.studentId || studentToDelete.niatRegistrationNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Email:</span>
                <span className="font-mono text-neutral-700 text-[11px] truncate max-w-[200px]">{studentToDelete.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Campus:</span>
                <span className="font-semibold text-neutral-800">{studentToDelete.campus}</span>
              </div>
            </div>

            {/* Typing Confirmation Requirement */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-neutral-700">
                To confirm permanent deletion, type <span className="font-mono font-black text-red-700">DELETE</span> below:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-mono font-bold text-center tracking-widest text-red-900 focus:bg-white focus:border-red-900 focus:ring-2 focus:ring-red-900/20"
                autoFocus
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => {
                  setStudentToDelete(null);
                  setDeleteConfirmText('');
                }}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteConfirmText.trim() !== 'DELETE' || isDeleting}
                className="px-5 py-2.5 bg-red-900 hover:bg-red-950 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Account & Data...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
