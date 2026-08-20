import { useState, useEffect, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { seedApprovedStudentsInFirestore } from './services/firestoreStudentService';
import { storage } from './services/storage';
import { CampusName, UserProfile } from './types';
import { lazyWithRetry } from './utils/lazyWithRetry';

import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';

// Primary landing and auth pages eager loaded for instant first paint
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';

// Code-split secondary pages with automated retry for robust module fetching
const ProfilePage = lazyWithRetry(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const ConnectionsPage = lazyWithRetry(() => import('./pages/ConnectionsPage').then(m => ({ default: m.ConnectionsPage })));
const ProjectsPage = lazyWithRetry(() => import('./pages/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const OpportunitiesPage = lazyWithRetry(() => import('./pages/OpportunitiesPage').then(m => ({ default: m.OpportunitiesPage })));
const MessagesPage = lazyWithRetry(() => import('./pages/MessagesPage').then(m => ({ default: m.MessagesPage })));
const NotificationsPage = lazyWithRetry(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const CampusExplorerPage = lazyWithRetry(() => import('./pages/CampusExplorerPage').then(m => ({ default: m.CampusExplorerPage })));
const StudentHubPage = lazyWithRetry(() => import('./pages/StudentHubPage').then(m => ({ default: m.StudentHubPage })));
const AdminPage = lazyWithRetry(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const SettingsPage = lazyWithRetry(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

import { ErrorBoundary } from './components/common/ErrorBoundary';
import { NiatLogo } from './components/common/NiatLogo';
import { InAppNotificationToast } from './components/common/InAppNotificationToast';
import { RefreshCw, ShieldAlert, LogOut } from 'lucide-react';

const PageLoader = () => (
  <div className="min-h-[350px] flex items-center justify-center p-8">
    <div className="flex items-center gap-3 text-neutral-500 font-medium text-xs bg-white py-3 px-5 rounded-2xl border border-neutral-200/80 shadow-sm">
      <RefreshCw className="w-4 h-4 animate-spin text-red-900" />
      <span>Loading page...</span>
    </div>
  </div>
);

function AppContent() {
  const { authState, studentProfile, isAdmin, logout } = useAuth();

  // Navigation state
  const [activeTab, setActiveTab] = useState<string>('landing');

  // Custom view states
  const [directorySelectedCampus, setDirectorySelectedCampus] = useState<CampusName | null>(null);
  const [inspectingProfile, setInspectingProfile] = useState<UserProfile | null>(null);
  const [activeChatUser, setActiveChatUser] = useState<UserProfile | null>(null);

  const isAuthenticated = authState === 'AUTHENTICATED';

  // Seed student roster into Firestore if authenticated as admin
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      seedApprovedStudentsInFirestore().catch((err) => {
        console.debug('Background student roster sync:', err);
      });
    }
  }, [isAuthenticated, isAdmin]);

  // Ensure initial history state on mount
  useEffect(() => {
    if (!window.history.state || typeof window.history.state !== 'object' || !window.history.state.tab) {
      const initialTab = authState === 'AUTHENTICATED' ? 'home' : 'landing';
      window.history.replaceState({
        tab: initialTab,
        directorySelectedCampus: null,
        inspectingProfile: null,
        activeChatUser: null,
      }, '', window.location.pathname + window.location.search);
    }
  }, []);

  // Listen for browser / touch / Android back button popstate events
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state && typeof state === 'object' && state.tab) {
        let targetTab = state.tab;
        if (!isAuthenticated && targetTab !== 'auth' && targetTab !== 'landing') {
          targetTab = 'auth';
        }
        if (targetTab === 'admin' && !isAdmin) {
          targetTab = 'home';
        }

        setActiveTab(targetTab);
        setDirectorySelectedCampus(state.directorySelectedCampus || null);
        setInspectingProfile(state.inspectingProfile || null);
        setActiveChatUser(state.activeChatUser || null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const fallbackTab = isAuthenticated ? 'home' : 'landing';
        setActiveTab(fallbackTab);
        setDirectorySelectedCampus(null);
        setInspectingProfile(null);
        setActiveChatUser(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isAuthenticated, isAdmin]);

  // Sync tab navigation with authState changes
  useEffect(() => {
    if (authState === 'AUTHENTICATED') {
      setActiveTab((prev) => {
        const next = (prev === 'auth' || prev === 'landing' ? 'home' : prev);
        if (window.history.state && window.history.state.tab !== next) {
          window.history.replaceState({
            ...window.history.state,
            tab: next
          }, '', window.location.pathname + window.location.search);
        }
        return next;
      });
    } else if (authState === 'UNAUTHENTICATED') {
      setActiveTab((prev) => {
        const next = (prev === 'landing' ? 'landing' : 'auth');
        if (window.history.state && window.history.state.tab !== next) {
          window.history.replaceState({
            ...window.history.state,
            tab: next
          }, '', window.location.pathname + window.location.search);
        }
        return next;
      });
    }
  }, [authState]);

  const navigateTo = (
    newTab: string, 
    campus: CampusName | null = null, 
    profile: UserProfile | null = null, 
    chatUser: UserProfile | null = null,
    replace: boolean = false
  ) => {
    let targetTab = newTab;
    const isAuthed = authState === 'AUTHENTICATED';
    if (!isAuthed && targetTab !== 'auth' && targetTab !== 'landing') {
      targetTab = 'auth';
    }

    if (targetTab === 'admin' && !isAdmin) {
      targetTab = 'home';
    }

    const nextProfile = targetTab === 'profile' ? profile : null;
    const nextChatUser = targetTab === 'messages' ? chatUser : null;
    const nextCampus = campus;

    setActiveTab(targetTab);
    setDirectorySelectedCampus(nextCampus);
    setInspectingProfile(nextProfile);
    setActiveChatUser(nextChatUser);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    const historyState = {
      tab: targetTab,
      directorySelectedCampus: nextCampus,
      inspectingProfile: nextProfile,
      activeChatUser: nextChatUser,
    };

    const currentState = window.history.state;
    if (replace) {
      window.history.replaceState(historyState, '', window.location.pathname + window.location.search);
    } else if (
      !currentState ||
      currentState.tab !== targetTab ||
      currentState.directorySelectedCampus !== nextCampus ||
      currentState.inspectingProfile?.uid !== nextProfile?.uid ||
      currentState.activeChatUser?.uid !== nextChatUser?.uid
    ) {
      window.history.pushState(historyState, '', window.location.pathname + window.location.search);
    }
  };

  const handleNavigate = (tab: string) => {
    navigateTo(tab, directorySelectedCampus, null, null);
  };

  const handleViewStudentProfile = (targetProfile: UserProfile) => {
    if (!isAuthenticated) {
      handleNavigate('auth');
      return;
    }
    navigateTo('profile', directorySelectedCampus, targetProfile, null);
  };

  const handleOpenMessage = (otherUser: UserProfile) => {
    if (!isAuthenticated) {
      handleNavigate('auth');
      return;
    }
    navigateTo('messages', directorySelectedCampus, null, otherUser);
  };

  const handleSelectCampusForDirectory = (campusName: CampusName) => {
    if (!isAuthenticated) {
      navigateTo('auth', campusName, null, null);
      return;
    }
    navigateTo('campus', campusName, null, null);
  };

  // Listen for background notification click chat opening event
  useEffect(() => {
    const handleCustomOpenChat = (e: Event) => {
      const customEvent = e as CustomEvent<{ senderId: string }>;
      const senderId = customEvent.detail?.senderId;
      if (senderId) {
        const targetProfile = storage.getProfiles().find(p => p.uid === senderId);
        if (targetProfile) {
          handleOpenMessage(targetProfile);
        } else {
          handleNavigate('messages');
        }
      }
    };

    window.addEventListener('campuslink_open_chat', handleCustomOpenChat);
    return () => {
      window.removeEventListener('campuslink_open_chat', handleCustomOpenChat);
    };
  }, []);

  // 1. Initial Auth Loading State
  if (authState === 'INITIALIZING') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl border border-neutral-200/80 shadow-xl text-center space-y-4 max-w-sm w-full">
          <div className="w-12 h-12 bg-red-900 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <NiatLogo size="sm" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-neutral-900">CampusLink</h3>
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-neutral-500">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-900" />
              <span>Verifying Session...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Suspended Account State
  if (authState === 'SUSPENDED') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl border border-neutral-200/80 shadow-xl text-center space-y-6 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-900 rounded-full flex items-center justify-center mx-auto ring-4 ring-red-50">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-neutral-900">Account Suspended</h2>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Your CampusLink account ({studentProfile?.email || 'Student'}) is currently suspended by administration.
            </p>
          </div>
          <button
            onClick={() => logout()}
            className="w-full py-3 px-4 bg-red-900 hover:bg-red-950 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  const effectiveTab = (!isAuthenticated && activeTab !== 'landing') ? 'auth' : activeTab;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-neutral-50/70 text-neutral-900 font-sans flex flex-col justify-between selection:bg-red-900 selection:text-white">
      
      {/* Navbar */}
      <Navbar
        activeTab={effectiveTab}
        setActiveTab={handleNavigate}
        onNavigate={handleNavigate}
        onOpenAuthModal={() => handleNavigate('auth')}
      />

      {/* Global Real-Time Message Notification Toast */}
      {isAuthenticated && (
        <InAppNotificationToast
          onOpenChat={(senderId) => {
            const targetProfile = storage.getProfiles().find(p => p.uid === senderId);
            if (targetProfile) {
              handleOpenMessage(targetProfile);
            } else {
              handleNavigate('messages');
            }
          }}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto min-w-0 px-4 sm:px-6 lg:px-8 pt-6 pb-20 md:pb-8">
        <Suspense fallback={<PageLoader />}>
          {effectiveTab === 'landing' && (
            <LandingPage
              onJoinClick={() => handleNavigate('auth')}
              onExploreClick={() => handleNavigate('auth')}
              onSelectCampus={(c) => handleSelectCampusForDirectory(c as CampusName)}
            />
          )}

          {effectiveTab === 'auth' && (
            <AuthPage
              onAuthSuccess={() => handleNavigate('home')}
            />
          )}

          {effectiveTab === 'home' && isAuthenticated && (
            <HomePage
              onNavigateTab={(t) => handleNavigate(t)}
              onViewStudentProfile={handleViewStudentProfile}
            />
          )}

          {effectiveTab === 'student-hub' && isAuthenticated && (
            <StudentHubPage
              currentUser={studentProfile}
              onViewProfile={(userId) => {
                const targetProfile = storage.getProfiles().find(p => p.uid === userId);
                if (targetProfile) {
                  handleViewStudentProfile(targetProfile);
                }
              }}
              onNavigateToMessages={(userId) => {
                const targetProfile = storage.getProfiles().find(p => p.uid === userId);
                if (targetProfile) {
                  handleOpenMessage(targetProfile);
                }
              }}
            />
          )}

          {effectiveTab === 'campus' && isAuthenticated && (
            <CampusExplorerPage
              initialCampus={directorySelectedCampus}
              onViewStudentProfile={handleViewStudentProfile}
              onOpenMessage={handleOpenMessage}
            />
          )}

          {effectiveTab === 'profile' && isAuthenticated && (
            <ProfilePage
              profile={inspectingProfile}
              onNavigateTab={(tab) => navigateTo(tab)}
              onOpenMessage={handleOpenMessage}
            />
          )}

          {effectiveTab === 'connections' && isAuthenticated && (
            <ConnectionsPage
              onViewProfile={handleViewStudentProfile}
              onOpenMessage={handleOpenMessage}
            />
          )}

          {effectiveTab === 'projects' && isAuthenticated && (
            <ProjectsPage />
          )}

          {effectiveTab === 'opportunities' && isAuthenticated && (
            <OpportunitiesPage />
          )}

          {effectiveTab === 'messages' && isAuthenticated && (
            <MessagesPage
              initialChatUser={activeChatUser}
              onViewStudentProfile={handleViewStudentProfile}
            />
          )}

          {effectiveTab === 'notifications' && isAuthenticated && (
            <NotificationsPage />
          )}

          {effectiveTab === 'admin' && isAuthenticated && (
            <ErrorBoundary fallbackTitle="Admin Console Encountered an Issue">
              <AdminPage />
            </ErrorBoundary>
          )}

          {effectiveTab === 'settings' && isAuthenticated && (
            <SettingsPage
              onLogout={async () => {
                await logout();
                handleNavigate('auth');
              }}
            />
          )}
        </Suspense>
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
