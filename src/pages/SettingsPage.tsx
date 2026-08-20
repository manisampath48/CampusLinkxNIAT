import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, LogOut, Check, Bell, Volume2, Globe } from 'lucide-react';
import { useStorage } from '../hooks/useStorage';
import { notificationController, NotificationSettings } from '../services/notificationController';
import { playNotificationSound } from '../services/audioService';

interface SettingsPageProps {
  onLogout: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onLogout }) => {
  const storage = useStorage();
  const currentUser = storage.getCurrentUser();

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Real-time Notification Settings
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(
    notificationController.getSettings()
  );
  const [browserPerm, setBrowserPerm] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );

  useEffect(() => {
    setNotifSettings(notificationController.getSettings());
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPerm(Notification.permission);
    }
  }, []);

  const handleToggleNotif = (key: keyof NotificationSettings, val: boolean) => {
    const updated = { ...notifSettings, [key]: val };
    setNotifSettings(updated);
    notificationController.updateSettings(updated);

    if (key === 'browserNotifications' && val && browserPerm !== 'granted') {
      handleRequestBrowserPermission();
    }
  };

  const handleRequestBrowserPermission = async () => {
    const granted = await notificationController.requestBrowserPermission();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPerm(Notification.permission);
    }
    if (granted) {
      setToast("Browser notification permission granted!");
      setTimeout(() => setToast(null), 3000);
    } else {
      setToast("Notification permission was not granted.");
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleTestNotification = () => {
    if (notifSettings.notificationSound) {
      playNotificationSound();
    }
    
    // Trigger test toast
    const mockSender = currentUser?.name || 'CampusLink Peer';
    notificationController.showBrowserNotification(mockSender, "This is a test notification from CampusLink!", "test");
    
    setToast("Testing chime sound and notification...");
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = () => {
    setToast("Settings saved successfully.");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {toast && (
        <div className="fixed bottom-20 right-4 z-50 bg-neutral-900 text-white px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs">
        <h1 className="text-2xl font-black text-neutral-900">Account Settings</h1>
        <p className="text-xs text-neutral-500 mt-1">Manage your CampusLink network profile, privacy & notifications.</p>
      </div>

      {/* Verification Summary */}
      {currentUser && (
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-3">
          <h3 className="font-extrabold text-neutral-900 text-sm flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Verification Credentials</span>
          </h3>

          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs space-y-1">
            <p className="font-bold text-neutral-900">{currentUser.name}</p>
            <p className="text-neutral-600">{currentUser.campus} • {currentUser.year} ({currentUser.branch})</p>
            <p className="text-neutral-500 font-mono text-[11px]">Email: {currentUser.email}</p>
            <p className="text-emerald-700 font-bold text-[11px] pt-1 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Student ID Verified & Protected</span>
            </p>
          </div>
        </div>
      )}

      {/* Direct Message & Sound Notification Preferences */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-neutral-900 text-sm flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-red-900" />
            <span>Message Notification Preferences</span>
          </h3>

          <button
            onClick={handleTestNotification}
            className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-900 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Test Sound & Toast</span>
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {/* Master Toggle */}
          <label className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 cursor-pointer">
            <div>
              <p className="font-bold text-neutral-900">Message Notifications</p>
              <p className="text-neutral-500 text-[11px]">Receive real-time pop-up notifications for new direct messages</p>
            </div>
            <input
              type="checkbox"
              checked={notifSettings.messageNotifications}
              onChange={(e) => handleToggleNotif('messageNotifications', e.target.checked)}
              className="w-4 h-4 text-red-900 rounded-md border-neutral-300 accent-red-900"
            />
          </label>

          {/* Sound Toggle */}
          <label className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 cursor-pointer">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-neutral-600" />
              <div>
                <p className="font-bold text-neutral-900">Notification Sound</p>
                <p className="text-neutral-500 text-[11px]">Play a short audio chime when a peer sends you a message</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={notifSettings.notificationSound}
              onChange={(e) => handleToggleNotif('notificationSound', e.target.checked)}
              className="w-4 h-4 text-red-900 rounded-md border-neutral-300 accent-red-900"
            />
          </label>

          {/* Browser Push Notifications */}
          <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-neutral-600" />
                <div>
                  <p className="font-bold text-neutral-900">Browser Push Notifications</p>
                  <p className="text-neutral-500 text-[11px]">Show desktop notifications when CampusLink is in background</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifSettings.browserNotifications}
                onChange={(e) => handleToggleNotif('browserNotifications', e.target.checked)}
                className="w-4 h-4 text-red-900 rounded-md border-neutral-300 accent-red-900"
              />
            </div>

            {browserPerm !== 'granted' && (
              <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
                <span className="text-[11px] text-neutral-500 font-medium">
                  Browser permission status: <strong className="capitalize text-amber-700">{browserPerm}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleRequestBrowserPermission}
                  className="px-3 py-1 bg-neutral-900 text-white rounded-lg text-[11px] font-bold hover:bg-neutral-800 transition-colors"
                >
                  Allow Browser Notifications
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Privacy Controls */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-4">
        <h3 className="font-extrabold text-neutral-900 text-sm flex items-center gap-1.5">
          <Lock className="w-4 h-4 text-red-900" />
          <span>Privacy & Visibility</span>
        </h3>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3 bg-neutral-50 rounded-2xl border border-neutral-200 cursor-pointer">
            <div>
              <p className="font-bold text-neutral-900">Email Address Privacy</p>
              <p className="text-neutral-500 text-[11px]">Allow connected peers to see your student email</p>
            </div>
            <input
              type="checkbox"
              checked={showEmail}
              onChange={(e) => setShowEmail(e.target.checked)}
              className="w-4 h-4 text-red-900 rounded-md border-neutral-300 accent-red-900"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-neutral-50 rounded-2xl border border-neutral-200 cursor-pointer">
            <div>
              <p className="font-bold text-neutral-900">Email Notifications</p>
              <p className="text-neutral-500 text-[11px]">Receive updates on project applications and connection requests</p>
            </div>
            <input
              type="checkbox"
              checked={emailNotifs}
              onChange={(e) => setEmailNotifs(e.target.checked)}
              className="w-4 h-4 text-red-900 rounded-md border-neutral-300 accent-red-900"
            />
          </label>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          Save Privacy Settings
        </button>
      </div>

      {/* Logout */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-neutral-900 text-sm">Sign Out</h3>
          <p className="text-xs text-neutral-500">Log out of your CampusLink student account</p>
        </div>

        <button
          onClick={onLogout}
          className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

    </div>
  );
};
