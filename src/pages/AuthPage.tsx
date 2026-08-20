import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw,
  ArrowLeft,
  KeyRound,
  User,
  UserPlus,
  LogIn,
  Eye,
  EyeOff
} from 'lucide-react';
import { NiatLogo } from '../components/common/NiatLogo';
import { useAuth } from '../context/AuthContext';
import { NiatVerificationResult } from '../services/authService';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const { 
    authState,
    verifyNiat, 
    register, 
    signIn, 
    signInWithGoogle, 
    resetPassword 
  } = useAuth();

  // Redirect automatically if central auth state is confirmed authenticated
  useEffect(() => {
    if (authState === 'AUTHENTICATED') {
      onAuthSuccess();
    }
  }, [authState, onAuthSuccess]);

  // Main mode: 'signin' | 'register' | 'forgot'
  const [activeTab, setActiveTab] = useState<'signin' | 'register' | 'forgot'>('signin');

  // Registration step tracking: 'verify_niat' | 'create_credentials'
  const [regStep, setRegStep] = useState<'verify_niat' | 'create_credentials'>('verify_niat');

  // Input states - Sign In
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Input states - Registration
  const [niatIdInput, setNiatIdInput] = useState('');
  const [verifiedData, setVerifiedData] = useState<NiatVerificationResult | null>(null);
  
  // Step 2 Registration Inputs: Email & Confirm Email
  const [regEmail, setRegEmail] = useState('');
  const [regConfirmEmail, setRegConfirmEmail] = useState('');

  // Step 3 Registration Inputs: Password & Confirm Password
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Password Reset state
  const [resetEmail, setResetEmail] = useState('');

  // UI feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Please wait...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // SWITCH TABS
  const handleSwitchTab = (tab: 'signin' | 'register' | 'forgot') => {
    setActiveTab(tab);
    setErrorMsg(null);
    setSuccessMsg(null);
    if (tab === 'register' && !verifiedData) {
      setRegStep('verify_niat');
    }
  };

  // STEP 1 REGISTRATION: Verify NIAT Registration Number ONLY
  const handleVerifyNiatId = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanInput = niatIdInput.trim();

    if (!cleanInput) {
      setErrorMsg('Please enter your official NIAT Registration Number (e.g. N25R01A0089).');
      return;
    }

    setIsLoading(true);
    setLoadingText('Checking official NIAT student dataset...');

    const res = await verifyNiat(cleanInput);
    setIsLoading(false);

    if (res.success && res.studentRecord) {
      setVerifiedData(res);
      setRegStep('create_credentials');
      setSuccessMsg(res.message);
    } else {
      if (res.alreadyRegistered) {
        setErrorMsg('An account already exists for this NIAT ID. Please sign in.');
      } else {
        setErrorMsg(res.message || 'NIAT Registration Number not found. Please enter a valid NIAT ID.');
      }
    }
  };

  // STEP 2 & 3 REGISTRATION: Validate Email & Password, Create Firebase Account
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!verifiedData?.studentRecord) {
      setErrorMsg('NIAT verification required before registration.');
      return;
    }

    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanConfirmEmail = regConfirmEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (cleanEmail !== cleanConfirmEmail) {
      setErrorMsg('Email addresses do not match. Please verify your email.');
      return;
    }

    if (!regPassword) {
      setErrorMsg('Please enter a password.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match. Please verify your password.');
      return;
    }

    setIsLoading(true);
    setLoadingText('Creating Firebase Authentication account...');

    const res = await register(verifiedData.studentRecord, cleanEmail, regPassword);

    setIsLoading(false);

    if (res.success) {
      setSuccessMsg(res.message);
      onAuthSuccess();
    } else {
      setErrorMsg(res.message);
    }
  };

  // SIGN IN
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanIdentifier = signInIdentifier.trim();
    if (!cleanIdentifier || !signInPassword) {
      setErrorMsg('Please enter your NIAT Registration Number or Email and Password.');
      return;
    }

    setIsLoading(true);
    setLoadingText('Signing in...');

    const res = await signIn(cleanIdentifier, signInPassword);

    setIsLoading(false);

    if (res.success) {
      setSuccessMsg(res.message);
      onAuthSuccess();
    } else {
      setErrorMsg(res.message);
    }
  };

  // GOOGLE SIGN IN (Sign-In Mode or Linking Mode)
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    setIsLoading(true);
    setLoadingText('Connecting to Google...');

    // If in registration mode and student record is verified, pass it to link account
    const studentToLink = activeTab === 'register' && regStep === 'create_credentials' ? verifiedData?.studentRecord : undefined;
    const res = await signInWithGoogle(studentToLink);

    setIsLoading(false);

    if (res.success) {
      setSuccessMsg(res.message);
      onAuthSuccess();
    } else {
      setErrorMsg(res.message);
    }
  };

  // FORGOT PASSWORD
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!resetEmail.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);
    setLoadingText('Sending password reset email...');

    const res = await resetPassword(resetEmail);
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg(res.message);
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="w-full max-w-[460px] mx-auto my-4 sm:my-8 px-3 sm:px-0">
      
      {/* Brand Header */}
      <div className="text-center mb-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-neutral-100 rounded-full border border-neutral-200 text-neutral-800 text-[11px] font-bold">
          <NiatLogo size="xs" className="shrink-0" />
          <span>NIAT Institutional Network</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
          Welcome to <span className="text-red-900">CampusLink</span>
        </h1>
        <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
          Private student network for Annamacharya, NRI, and Chalapathi campuses.
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-neutral-200/80 shadow-xl space-y-5">

        {/* Auth Mode Tabs (Sign In vs Register) */}
        {activeTab !== 'forgot' && (
          <div className="flex bg-neutral-100/80 p-1 rounded-2xl border border-neutral-200/60">
            <button
              type="button"
              onClick={() => handleSwitchTab('signin')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'signin' 
                  ? 'bg-white text-neutral-900 shadow-xs' 
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTab('register')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'register' 
                  ? 'bg-white text-neutral-900 shadow-xs' 
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>
        )}

        {/* Global Notifications */}
        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 rounded-2xl text-xs font-medium space-y-2.5 animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-snug flex-1">{errorMsg}</span>
            </div>

            {(errorMsg.includes('already registered') || errorMsg.includes('already linked')) && (
              <button
                type="button"
                onClick={() => handleSwitchTab('signin')}
                className="w-full py-2 bg-red-900 hover:bg-red-950 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Go to Sign In
              </button>
            )}

            {(errorMsg.includes('verify') || errorMsg.includes('verified NIAT students') || errorMsg.includes('NIAT registration number') || errorMsg.includes('Please complete NIAT')) && (
              <button
                type="button"
                onClick={() => {
                  handleSwitchTab('register');
                  setRegStep('verify_niat');
                  setErrorMsg(null);
                }}
                className="w-full py-2.5 bg-red-900 hover:bg-red-950 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify NIAT ID</span>
              </button>
            )}

            {errorMsg.includes('disabled in Firebase Console') && (
              <div className="pt-2 border-t border-red-200/80 space-y-2">
                <p className="text-[11px] text-red-800 font-bold">
                  Recommended Action:
                </p>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full py-2.5 px-3 bg-red-900 hover:bg-red-950 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <svg className="w-4 h-4 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{activeTab === 'register' && regStep === 'create_credentials' ? 'Link & Register with Google Instant' : 'Sign In with Google'}</span>
                </button>
                <div className="bg-red-100/60 p-2 rounded-xl text-[10px] text-red-900 leading-tight">
                  <span className="font-bold">To enable Email/Password:</span> Go to Firebase Console &gt; Authentication &gt; Sign-in method &gt; Edit "Email/Password" &gt; Enable &gt; Save.
                </div>
              </div>
            )}
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-medium flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{successMsg}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: SIGN IN                                           */}
        {/* ========================================================= */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                NIAT Registration No. or Email Address
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={signInIdentifier}
                  onChange={(e) => setSignInIdentifier(e.target.value)}
                  placeholder="e.g. N25R01A0089 or student@gmail.com"
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 focus:bg-white focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(signInIdentifier.includes('@') ? signInIdentifier : '');
                    handleSwitchTab('forgot');
                  }}
                  className="text-[11px] font-bold text-red-900 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                <input
                  type={showSignInPassword ? "text" : "password"}
                  required
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 focus:bg-white focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowSignInPassword(!showSignInPassword)}
                  className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !signInIdentifier.trim() || !signInPassword}
              className="w-full py-3 px-4 bg-red-900 hover:bg-red-950 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{loadingText}</span>
                </>
              ) : (
                <span>Sign In to CampusLink</span>
              )}
            </button>

            {/* Google Sign In Divider */}
            <div className="relative my-3 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200"></div>
              </div>
              <span className="relative px-3 bg-white text-[10px] uppercase tracking-wider font-bold text-neutral-400">
                OR
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-neutral-50 text-neutral-700 font-bold text-xs border border-neutral-300 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="pt-2 text-center text-xs text-neutral-500">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => handleSwitchTab('register')}
                className="font-bold text-red-900 hover:underline cursor-pointer"
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* TAB 2: REGISTER                                          */}
        {/* ========================================================= */}
        {activeTab === 'register' && (
          <div className="space-y-4">
            
            {/* STEP 1: NIAT REGISTRATION NUMBER VERIFICATION */}
            {regStep === 'verify_niat' && (
              <form onSubmit={handleVerifyNiatId} className="space-y-4">
                <div className="p-3.5 bg-red-50/70 border border-red-100 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-900">
                    <ShieldCheck className="w-4 h-4 text-red-900 shrink-0" />
                    <span>Step 1: Verify NIAT Registration ID</span>
                  </div>
                  <p className="text-[11px] text-red-800 leading-relaxed">
                    Enter your official NIAT Registration Number to verify student eligibility.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    NIAT Registration Number / NIAT ID
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={niatIdInput}
                      onChange={(e) => setNiatIdInput(e.target.value)}
                      placeholder="e.g. N25R01A0089"
                      className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono font-bold text-neutral-900 focus:bg-white focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition-all uppercase"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    No email is required in this step. We search official student records using only your NIAT ID.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !niatIdInput.trim()}
                  className="w-full py-3 px-4 bg-red-900 hover:bg-red-950 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{loadingText}</span>
                    </>
                  ) : (
                    <>
                      <span>Verify NIAT ID</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-2 text-center text-xs text-neutral-500">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleSwitchTab('signin')}
                    className="font-bold text-red-900 hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2 & STEP 3: EMAIL & PASSWORD CREATION */}
            {regStep === 'create_credentials' && verifiedData?.studentRecord && (
              <form onSubmit={handleRegister} className="space-y-4">
                
                {/* READ-ONLY OFFICIAL VERIFIED STUDENT IDENTITY CARD */}
                <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Verified Official Student</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRegStep('verify_niat');
                        setVerifiedData(null);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[10px] font-bold text-neutral-500 hover:text-neutral-800 underline cursor-pointer"
                    >
                      Change NIAT ID
                    </button>
                  </div>

                  <div className="space-y-1 pt-1.5 border-t border-emerald-200/60 text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="text-neutral-500 text-[10px] uppercase font-bold">Official Name:</span>
                      <span className="font-extrabold text-neutral-900">{verifiedData.studentRecord.name}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-neutral-500 text-[10px] uppercase font-bold">Campus:</span>
                      <span className="font-semibold text-neutral-800">{verifiedData.studentRecord.campus}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-neutral-500 text-[10px] uppercase font-bold">Course / Branch:</span>
                      <span className="font-semibold text-neutral-800">{verifiedData.studentRecord.branch} ({verifiedData.studentRecord.section})</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-neutral-500 text-[10px] uppercase font-bold">NIAT ID:</span>
                      <span className="font-mono font-bold text-neutral-800">{verifiedData.studentRecord.studentId}</span>
                    </div>
                  </div>
                </div>

                {/* STEP 2: EMAIL ADDRESS */}
                <div className="space-y-3 pt-1 border-t border-neutral-100">
                  <h3 className="text-[11px] font-bold text-red-900 uppercase tracking-wider">Step 2: Provide Your Email Address</h3>
                  
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="e.g. student@gmail.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:bg-white focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Confirm Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={regConfirmEmail}
                        onChange={(e) => setRegConfirmEmail(e.target.value)}
                        placeholder="Re-enter email address"
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:bg-white focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* STEP 3: CREATE PASSWORD */}
                <div className="space-y-3 pt-2 border-t border-neutral-100">
                  <h3 className="text-[11px] font-bold text-red-900 uppercase tracking-wider">Step 3: Create Password</h3>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Password (min. 6 characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                      <input
                        type={showRegPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Create password"
                        className="w-full pl-10 pr-10 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 focus:bg-white focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3.5 top-3 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                      <input
                        type={showRegConfirmPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full pl-10 pr-10 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 focus:bg-white focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        className="absolute right-3.5 top-3 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      >
                        {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !regEmail || !regConfirmEmail || !regPassword || regPassword.length < 6}
                  className="w-full py-3 px-4 bg-red-900 hover:bg-red-950 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{loadingText}</span>
                    </>
                  ) : (
                    <span>Create CampusLink Account</span>
                  )}
                </button>

                {/* Google Sign In Divider */}
                <div className="relative my-3 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-200"></div>
                  </div>
                  <span className="relative px-3 bg-white text-[10px] uppercase tracking-wider font-bold text-neutral-400">
                    OR
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-neutral-50 text-neutral-700 font-bold text-xs border border-neutral-300 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="pt-2 text-center text-xs text-neutral-500">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => handleSwitchTab('signin')}
                    className="font-bold text-red-900 hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: FORGOT PASSWORD                                   */}
        {/* ========================================================= */}
        {activeTab === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => handleSwitchTab('signin')}
                className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-600 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h3 className="text-sm font-black text-neutral-900">Reset Your Password</h3>
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed">
              Enter your registered email address and we will send you an official password reset link.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="student@annamacharya.niat.edu"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:bg-white focus:border-red-900 focus:ring-2 focus:ring-red-900/10 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !resetEmail.trim()}
              className="w-full py-3 px-4 bg-red-900 hover:bg-red-950 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending Reset Email...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Send Reset Email</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center text-xs text-neutral-500">
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => handleSwitchTab('signin')}
                className="font-bold text-red-900 hover:underline cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
