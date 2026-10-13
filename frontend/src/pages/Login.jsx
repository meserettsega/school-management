import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowRight, BookOpen, Building2, Eye, EyeOff, GraduationCap, Loader, Mail, Lock, ShieldCheck, Users } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { setUser, setSchool } from '../store/authSlice';
import apiClient from '../utils/apiClient';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user?.role) {
      navigate(`/${user.role}/dashboard`, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Views: 'login', 'forgot', 'verify', 'reset'
  const [view, setView] = useState('login');
  
  // Login Form Data (kept blank by default)
  const [formData, setFormData] = useState({
    schoolCode: location.state?.schoolCode || '',
    email: location.state?.email || '',
    password: '',
  });

  // Forgot Password Flow States
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Timer states for verification code expiration (1 minute = 60s)
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Timer countdown hook
  useEffect(() => {
    let interval = null;
    if (view === 'verify' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [view, timer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'schoolCode' ? value.toUpperCase() : value,
    }));
  };

  const validateLoginForm = () => {
    if (!formData.schoolCode.trim()) {
      toast.error('School code is required');
      return false;
    }

    if (!formData.email.includes('@')) {
      toast.error('Please enter a valid email');
      return false;
    }

    if (!formData.password) {
      toast.error('Password is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateLoginForm()) return;

    setLoading(true);

    try {
      const response = await apiClient.post('/auth/login', {
        email: formData.email,
        password: formData.password,
        schoolCode: formData.schoolCode,
      });

      const { user, school, accessToken, refreshToken } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // Clear the loggedOut guard so this fresh login is trusted
      sessionStorage.removeItem('loggedOut');

      dispatch(setUser(user));
      dispatch(setSchool(school));

      toast.success('Login successful!');

      setTimeout(() => {
        switch (user.role) {
          case 'admin':
            navigate('/admin/dashboard', { replace: true });
            break;
          case 'teacher':
            navigate('/teacher/dashboard', { replace: true });
            break;
          case 'student':
            navigate('/student/dashboard', { replace: true });
            break;
          default:
            navigate('/', { replace: true });
        }
      }, 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot password step 1: Request OTP code
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!forgotEmail.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: forgotEmail });
      toast.success('Verification code sent to your email.');
      setTimer(60);
      setCanResend(false);
      setView('verify');
    } catch (error) {
      toast.error(error.response?.data?.message || "User doesn't exist");
    } finally {
      setLoading(false);
    }
  };

  // Resend code handler
  const handleResendCode = async () => {
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: forgotEmail });
      toast.success('A new verification code has been sent to your email.');
      setResetCode('');
      setTimer(60);
      setCanResend(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  // Forgot password step 2: Verify OTP code
  const handleVerifyCodeSubmit = async (e) => {
    e.preventDefault();
    if (!resetCode.trim()) {
      toast.error('Verification code is required');
      return;
    }
    if (resetCode.length !== 5) {
      toast.error('Code must be exactly 5 characters');
      return;
    }

    if (timer === 0) {
      toast.error('Verification code has expired. Please resend code.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/verify-reset-code', { email: forgotEmail, code: resetCode });
      toast.success('Code verified successfully.');
      setView('reset');
    } catch (error) {
      toast.error('wrong code');
    } finally {
      setLoading(false);
    }
  };

  // Forgot password step 3: Reset password
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();

    const pwd = newPassword || '';
    const hasMinLength = pwd.length >= 6;
    const hasCapital = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);

    if (!hasMinLength || !hasCapital || !hasNumber || !hasSpecial) {
      toast.error('Password does not meet validation requirements');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match. Please try again.");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        email: forgotEmail,
        code: resetCode,
        newPassword,
      });
      toast.success('Password reset successfully!');
      // Reset forms
      setNewPassword('');
      setConfirmPassword('');
      setForgotEmail('');
      setResetCode('');
      setView('login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="public-page login-page min-h-screen bg-[#f4ecdf] px-4 py-10 text-[#3f2a1d] sm:px-6 lg:px-8">
      <Toaster position="top-right" />

      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-6xl gap-6 lg:grid-cols-[1fr_0.88fr] lg:items-center">
        {/* Left Info Panel */}
        <div className="login-brand-panel relative overflow-hidden rounded-[2rem] border border-[#d9c5b0] bg-gradient-hero p-8 shadow-lg shadow-[#b68c67]/15 lg:p-10">
          <div className="absolute left-0 top-0 h-40 w-40 rounded-full bg-[#e8d4bd] blur-3xl" />
          <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-[#c9b39a] blur-3xl" />
          <div className="relative">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7a4e2d] text-[#f7efe4]">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-extrabold text-[#3f2a1d]">SchoolHub</p>
                <p className="text-sm text-[#7f634e]">Login portal</p>
              </div>
            </div>

            <h1 className="max-w-xl text-5xl font-black leading-tight tracking-tight text-[#3f2a1d] lg:text-6xl">
            Your school workspace, ready when you are.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#6d4c35]">
            Sign in securely to reach the tools and updates that matter to your role in the school community.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
              ['Secure sign-in', 'Protected account access', ShieldCheck],
              ['Role-based tools', 'A workspace tailored to you', Users],
              ['School workspace', 'Your school, kept separate', Building2],
              ['Academic insights', 'Attendance and results at a glance', GraduationCap],
              ].map(([title, description, Icon]) => (
                <div key={title} className="rounded-3xl border border-[#d9c5b0] bg-[#fffaf3] p-4 backdrop-blur">
                  <Icon className="h-5 w-5 text-[#7a4e2d]" />
                  <p className="mt-3 font-semibold text-[#3f2a1d]">{title}</p>
                  <p className="mt-1 text-sm text-[#6d4c35]">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 text-[#3f2a1d] shadow-lg shadow-[#b68c67]/15 sm:p-8">
          
          {/* VIEW: LOGIN */}
          {view === 'login' && (
            <>
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#8a6a50]">Welcome back</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-[#3f2a1d]">Sign in to SchoolHub</h2>
                <p className="mt-2 text-[#6d4c35]">Enter your school code and account credentials to continue.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#6d4c35]">School Code *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3.5 h-5 w-5 text-[#b68c67]" />
                    <input
                      type="text"
                      name="schoolCode"
                      value={formData.schoolCode}
                      onChange={handleChange}
                      placeholder="e.g. SCHOOL001"
                      className="w-full rounded-2xl border border-[#d9c5b0] bg-[#faf4ea] py-3 pl-10 pr-4 outline-none transition placeholder:text-[#a1876d] focus:border-[#7a4e2d] focus:bg-white uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#6d4c35]">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-[#b68c67]" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="admin@school.com"
                      className="w-full rounded-2xl border border-[#d9c5b0] bg-[#faf4ea] py-3 pl-10 pr-4 outline-none transition placeholder:text-[#a1876d] focus:border-[#7a4e2d] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-semibold text-[#6d4c35]">Password *</label>
                    <button
                      type="button"
                      onClick={() => setView('forgot')}
                      className="text-xs font-semibold text-[#7a4e2d] hover:text-[#624021] transition"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-[#b68c67]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      className="w-full rounded-2xl border border-[#d9c5b0] bg-[#faf4ea] py-3 pl-10 pr-12 outline-none transition placeholder:text-[#a1876d] focus:border-[#7a4e2d] focus:bg-white"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-[#b68c67] transition hover:text-[#7a4e2d]">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7a4e2d] px-5 py-3.5 font-semibold text-[#f7efe4] transition hover:bg-[#624021] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      Login to Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* VIEW: FORGOT PASSWORD */}
          {view === 'forgot' && (
            <>
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#8a6a50]">Security Access</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-[#3f2a1d]">Forgot Password</h2>
                <p className="mt-2 text-[#6d4c35]">Enter your registered email address to receive a verification code.</p>
              </div>

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#6d4c35]">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-[#b68c67]" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. user@school.com"
                      className="w-full rounded-2xl border border-[#d9c5b0] bg-[#faf4ea] py-3 pl-10 pr-4 outline-none transition placeholder:text-[#a1876d] focus:border-[#7a4e2d] focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7a4e2d] px-5 py-3.5 font-semibold text-[#f7efe4] transition hover:bg-[#624021] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Send Code
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setView('login')}
                className="mt-4 w-full text-center text-sm font-semibold text-[#7a4e2d] hover:text-[#624021] transition"
              >
                Back to Login
              </button>
            </>
          )}

          {/* VIEW: VERIFY OTP CODE */}
          {view === 'verify' && (
            <>
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#8a6a50]">Code Sent</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-[#3f2a1d]">Enter Reset Code</h2>
                <p className="mt-2 text-[#6d4c35]">
                  We sent a 5-character verification code to <strong>{forgotEmail}</strong>. Code is valid for exactly 1 minute.
                </p>
              </div>

              <form onSubmit={handleVerifyCodeSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#6d4c35]">5-Character Code *</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-3.5 h-5 w-5 text-[#b68c67]" />
                    <input
                      type="text"
                      maxLength={5}
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="e.g. A1#B2"
                      className="w-full rounded-2xl border border-[#d9c5b0] bg-[#faf4ea] py-3 pl-10 pr-4 outline-none transition placeholder:text-[#a1876d] focus:border-[#7a4e2d] focus:bg-white tracking-widest text-center font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col items-center justify-between border border-[#d9c5b0] bg-[#faf4ea] rounded-2xl p-4 my-2">
                  <span className="text-sm font-semibold text-[#6d4c35]">
                    {timer > 0 ? (
                      <span className="flex items-center gap-1.5 text-amber-700 font-bold">
                        Time remaining: 00:{timer < 10 ? '0' + timer : timer}
                      </span>
                    ) : (
                      <span className="text-red-700 font-bold">Code has expired!</span>
                    )}
                  </span>
                  
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={!canResend || loading}
                    className={`mt-2 text-xs font-bold underline transition ${
                      canResend
                        ? 'text-[#7a4e2d] hover:text-[#624021] cursor-pointer'
                        : 'text-[#b68c67] cursor-not-allowed opacity-50'
                    }`}
                  >
                    Resend Code
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7a4e2d] px-5 py-3.5 font-semibold text-[#f7efe4] transition hover:bg-[#624021] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify Code
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setView('login')}
                className="mt-4 w-full text-center text-sm font-semibold text-[#7a4e2d] hover:text-[#624021] transition"
              >
                Back to Login
              </button>
            </>
          )}

          {/* VIEW: RESET PASSWORD */}
          {view === 'reset' && (
            <>
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#8a6a50]">Reset Security</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-[#3f2a1d]">Create New Password</h2>
                <p className="mt-2 text-[#6d4c35]">Choose a secure password meeting all guidelines below.</p>
              </div>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#6d4c35]">New Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-[#b68c67]" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-2xl border border-[#d9c5b0] bg-[#faf4ea] py-3 pl-10 pr-12 outline-none transition placeholder:text-[#a1876d] focus:border-[#7a4e2d] focus:bg-white"
                      required
                    />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-3.5 text-[#b68c67] transition hover:text-[#7a4e2d]">
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>

                  {/* Password requirement visual check indicators */}
                  <div className="mt-2 space-y-1 text-xs">
                    <p className="font-semibold text-[#6d4c35]">Password requirements:</p>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${(newPassword || '').length >= 6 ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={(newPassword || '').length >= 6 ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>Min 6 characters</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${/[A-Z]/.test(newPassword || '') ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={/[A-Z]/.test(newPassword || '') ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>1 capital letter</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${/[0-9]/.test(newPassword || '') ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={/[0-9]/.test(newPassword || '') ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>1 number</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword || '') ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword || '') ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>1 special character</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#6d4c35]">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-[#b68c67]" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      className="w-full rounded-2xl border border-[#d9c5b0] bg-[#faf4ea] py-3 pl-10 pr-12 outline-none transition placeholder:text-[#a1876d] focus:border-[#7a4e2d] focus:bg-white"
                      required
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3.5 text-[#b68c67] transition hover:text-[#7a4e2d]">
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7a4e2d] px-5 py-3.5 font-semibold text-[#f7efe4] transition hover:bg-[#624021] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    <>
                      Reset Password
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setView('login')}
                className="mt-4 w-full text-center text-sm font-semibold text-[#7a4e2d] hover:text-[#624021] transition"
              >
                Back to Login
              </button>
            </>
          )}

          {/* Bottom links (Register & Home) */}
          {view === 'login' && (
            <div className="mt-6 space-y-3 border-t border-[#d9c5b0] pt-5 text-sm text-[#6d4c35]">
              <p className="text-center">
                Don&apos;t have a school account?{' '}
                <Link to="/register" className="font-semibold text-[#7a4e2d] hover:text-[#624021]">
                  Register here
                </Link>
              </p>
              <p className="text-center">
                <Link to="/" className="font-semibold text-[#7a4e2d] hover:text-[#624021]">
                  Back to home
                </Link>
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}