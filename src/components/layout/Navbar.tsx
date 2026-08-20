import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, 
  Search, 
  Users, 
  Sparkles, 
  MessageSquare, 
  Bell, 
  User, 
  LogOut, 
  Shield, 
  Building2, 
  X, 
  ChevronDown,
  Lock,
  ShieldCheck,
  Menu,
  Settings
} from 'lucide-react';
import { useStorage } from '../../hooks/useStorage';
import { logoutStudent } from '../../services/authService';
import { NiatLogo } from '../common/NiatLogo';
import { isAuthorizedAdmin } from '../../utils/adminAuth';
import { auth } from '../../lib/firebase';

interface NavbarProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
  onOpenAuthModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onNavigate, onOpenAuthModal }) => {
  const handleTabChange = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
    } else if (setActiveTab) {
      setActiveTab(tab);
    }
  };

  const storage = useStorage();
  const currentUser = storage.getCurrentUser();
  const isAdmin = isAuthorizedAdmin(currentUser, auth.currentUser);
  const notifications = storage.getNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;
  const allMessages = storage.getAllMessages?.() || [];
  const unreadMessagesCount = currentUser
    ? allMessages.filter(m => m.receiverId === currentUser.uid && !m.read).length
    : 0;

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  // Automatically close dropdown on navigation
  useEffect(() => {
    setShowUserMenu(false);
  }, [activeTab]);

  // Outside click & ESC key handlers for profile dropdown
  useEffect(() => {
    if (!showUserMenu) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showUserMenu]);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'connections', label: 'Connections', icon: Users },
    { id: 'opportunities', label: 'Opportunities', icon: Sparkles },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'campus', label: 'Campus Hub', icon: Building2 },
  ];

  return (
    <>
      {/* Top Navbar for Desktop & Tablet */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-xs w-full max-w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4 lg:gap-6 min-w-0">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-2.5 cursor-pointer shrink-0" onClick={() => handleTabChange('home')}>
            <NiatLogo size="md" className="shrink-0" />
            <div className="flex flex-col">
              <span className="font-black text-lg sm:text-xl text-neutral-900 tracking-tight whitespace-nowrap">CampusLink</span>
              <p className="text-[10px] font-medium text-neutral-500 hidden 2xl:block whitespace-nowrap">
                One network. Every NIAT student.
              </p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center justify-start lg:justify-center gap-0.5 lg:gap-1 xl:gap-1.5 shrink-0 min-w-0 py-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const hasUnread = item.id === 'messages' && unreadMessagesCount > 0;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`flex items-center gap-1.5 px-2 lg:px-2.5 xl:px-3 py-1.5 lg:py-2 text-xs xl:text-sm font-extrabold transition-all relative shrink-0 cursor-pointer ${
                    isActive
                      ? 'text-red-900 bg-red-50/80 border-b-2 border-red-900 rounded-t-xl rounded-b-none'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/80 rounded-xl'
                  }`}
                  title={item.label}
                >
                  <div className="relative">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-red-900' : 'text-neutral-500'}`} />
                    {hasUnread && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full ring-2 ring-white" />
                    )}
                  </div>
                  <span className="whitespace-nowrap">{item.label}</span>
                  {hasUnread && (
                    <span className="ml-0.5 px-1.5 py-0.2 bg-red-600 text-white text-[10px] font-black rounded-full shadow-2xs">
                      {unreadMessagesCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons & User Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 shrink-0">
            {/* Admin Console Button (Only visible if signed in as Admin) */}
            {isAdmin && (
              <button
                onClick={() => handleTabChange('admin')}
                className={`flex items-center gap-1.5 text-xs font-bold px-2.5 xl:px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs shrink-0 ${
                  activeTab === 'admin'
                    ? 'bg-red-950 text-white border-red-900 ring-2 ring-red-800/50'
                    : 'bg-red-900 text-white border-red-900 hover:bg-red-950'
                }`}
                title="Open Admin Controls"
              >
                <ShieldCheck className="w-4 h-4 text-red-300 shrink-0" />
                <span className="hidden sm:inline lg:hidden xl:inline whitespace-nowrap">Admin Console</span>
                <span className="hidden lg:inline xl:hidden whitespace-nowrap">Admin</span>
              </button>
            )}

            {/* Notifications Bell */}
            {currentUser && (
              <button
                onClick={() => handleTabChange('notifications')}
                className={`relative p-2 rounded-xl border transition-colors shrink-0 ${
                  activeTab === 'notifications'
                    ? 'bg-red-900 text-white border-red-900'
                    : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                }`}
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-600 text-white text-[9px] sm:text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* User Dropdown or Auth Button */}
            {currentUser ? (
              <div ref={userMenuRef} className="relative shrink-0">
                <button
                  onClick={() => setShowUserMenu(prev => !prev)}
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                  className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-xl hover:bg-neutral-100 border border-transparent hover:border-neutral-200 transition-all cursor-pointer"
                >
                  <img
                    src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'Student')}&background=800000&color=fff&bold=true`}
                    alt={currentUser.name}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-red-900/20 shrink-0"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'Student')}&background=800000&color=fff&bold=true`;
                    }}
                  />
                  <div className="text-left hidden 2xl:block">
                    <p className="text-xs font-bold text-neutral-900 leading-none truncate max-w-[100px]">
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] text-neutral-500 font-medium truncate max-w-[100px] mt-0.5">
                      {(currentUser.campus || 'Campus').split(' ')[0]}
                    </p>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 hidden sm:block transition-transform duration-150 ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2 z-50 divide-y divide-neutral-100 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3">
                      <p className="text-sm font-bold text-neutral-900">{currentUser.name}</p>
                      <p className="text-xs text-neutral-500">{currentUser.email}</p>
                      <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-red-900 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                        <span>{currentUser.campus}</span>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleTabChange('profile');
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 cursor-pointer"
                      >
                        <User className="w-4 h-4 text-neutral-500" />
                        <span>My Student Profile</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleTabChange('settings');
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Shield className="w-4 h-4 text-neutral-500" />
                        <span>Account & Privacy</span>
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            handleTabChange('admin');
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-semibold text-red-900 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Lock className="w-4 h-4 text-red-700" />
                          <span>Admin Console & Customizer</span>
                        </button>
                      )}
                    </div>

                    <div className="py-1">
                      <button
                        onClick={async () => {
                          setShowUserMenu(false);
                          await logoutStudent();
                          handleTabChange('auth');
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal || (() => handleTabChange('auth'))}
                className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold bg-red-900 text-white hover:bg-red-950 transition-colors shadow-xs shrink-0"
              >
                Sign In / Verify
              </button>
            )}

            {/* Mobile Menu Drawer Toggle Button */}
            <button
              onClick={() => setShowMobileDrawer(!showMobileDrawer)}
              className="md:hidden p-2 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 transition-colors shrink-0"
              aria-label="Toggle Navigation Menu"
            >
              {showMobileDrawer ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Slide-over Menu */}
      {showMobileDrawer && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-72 h-full shadow-2xl p-5 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <NiatLogo size="sm" />
                  <span className="font-extrabold text-base text-neutral-900">CampusLink Menu</span>
                </div>
                <button
                  onClick={() => setShowMobileDrawer(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items list */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-3 mb-1">Navigation</p>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        handleTabChange(item.id);
                        setShowMobileDrawer(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-neutral-900 text-white'
                          : 'text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-red-400' : 'text-neutral-500'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* User Account / Admin Actions */}
              <div className="pt-4 border-t border-neutral-100 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-3 mb-1">Account & Controls</p>
                {currentUser && (
                  <>
                    <button
                      onClick={() => {
                        handleTabChange('profile');
                        setShowMobileDrawer(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-100"
                    >
                      <User className="w-4 h-4 text-neutral-500" />
                      <span>My Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        handleTabChange('settings');
                        setShowMobileDrawer(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-100"
                    >
                      <Settings className="w-4 h-4 text-neutral-500" />
                      <span>Account Settings</span>
                    </button>
                  </>
                )}

                {isAdmin && (
                  <button
                    onClick={() => {
                      handleTabChange('admin');
                      setShowMobileDrawer(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-900 bg-red-50 hover:bg-red-100"
                  >
                    <ShieldCheck className="w-4 h-4 text-red-800" />
                    <span>Admin Console</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Sign Out / Sign In */}
            <div className="pt-4 border-t border-neutral-100">
              {currentUser ? (
                <button
                  onClick={async () => {
                    await logoutStudent();
                    setShowMobileDrawer(false);
                    handleTabChange('auth');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-100 text-red-900 font-bold text-xs rounded-xl hover:bg-red-200 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowMobileDrawer(false);
                    handleTabChange('auth');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-900 text-white font-bold text-xs rounded-xl hover:bg-red-950 transition-colors shadow-xs"
                >
                  <span>Sign In / Verify</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-neutral-200 px-2 py-1 flex items-center justify-around shadow-lg">
        {/* Home */}
        <button
          onClick={() => handleTabChange('home')}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'home' ? 'text-red-900 font-bold' : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Home className={`w-5 h-5 ${activeTab === 'home' ? 'text-red-900' : 'text-neutral-500'}`} />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        {/* Connections */}
        <button
          onClick={() => handleTabChange('connections')}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'connections' ? 'text-red-900 font-bold' : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Users className={`w-5 h-5 ${activeTab === 'connections' ? 'text-red-900' : 'text-neutral-500'}`} />
          <span className="text-[10px] mt-0.5">Network</span>
        </button>

        {/* Opportunities */}
        <button
          onClick={() => handleTabChange('opportunities')}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'opportunities' ? 'text-red-900 font-bold' : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Sparkles className={`w-5 h-5 ${activeTab === 'opportunities' ? 'text-red-900' : 'text-neutral-500'}`} />
          <span className="text-[10px] mt-0.5">Opportunities</span>
        </button>

        {/* Messages with real-time Unread Badge */}
        <button
          onClick={() => handleTabChange('messages')}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all relative cursor-pointer ${
            activeTab === 'messages' ? 'text-red-900 font-bold' : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <div className="relative">
            <MessageSquare className={`w-5 h-5 ${activeTab === 'messages' ? 'text-red-900' : 'text-neutral-500'}`} />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1.5 px-1 py-0.2 bg-red-600 text-white text-[9px] font-black rounded-full shadow-2xs animate-pulse">
                {unreadMessagesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Messages</span>
        </button>

        {/* Campus / Admin */}
        {isAdmin ? (
          <button
            onClick={() => handleTabChange('admin')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'admin' ? 'text-red-900 font-bold' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <ShieldCheck className={`w-5 h-5 ${activeTab === 'admin' ? 'text-red-900' : 'text-neutral-500'}`} />
            <span className="text-[10px] mt-0.5">Admin</span>
          </button>
        ) : (
          <button
            onClick={() => handleTabChange('campus')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'campus' ? 'text-red-900 font-bold' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Building2 className={`w-5 h-5 ${activeTab === 'campus' ? 'text-red-900' : 'text-neutral-500'}`} />
            <span className="text-[10px] mt-0.5">Campus</span>
          </button>
        )}
      </div>
    </>
  );
};
