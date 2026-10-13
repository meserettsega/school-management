import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  CheckCircle,
  Eye,
  EyeOff,
  Loader,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import apiClient from '../utils/apiClient';

const passwordRequirements = [
  { label: 'At least 6 characters', test: (value) => value.length >= 6 },
  { label: 'One uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { label: 'One number', test: (value) => /[0-9]/.test(value) },
  { label: 'One special character', test: (value) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(value) },
];

export default function SchoolRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    schoolName: '',
    schoolCode: '',
    email: '',
    password: '',
    confirmPassword: '',
    adminName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: name === 'schoolCode' ? value.toUpperCase() : value,
    }));
  };

  const validateSchoolDetails = () => {
    if (!formData.schoolName.trim()) {
      toast.error('Enter your school name to continue');
      return false;
    }

    if (!formData.schoolCode.trim()) {
      toast.error('Choose a school code to continue');
      return false;
    }

    return true;
  };

  const validateAccountDetails = () => {
    if (!formData.adminName.trim()) {
      toast.error('Enter the administrator’s name');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast.error('Enter a valid email address');
      return false;
    }

    if (!passwordRequirements.every(({ test }) => test(formData.password))) {
      toast.error('Your password must meet all four requirements');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading || registrationComplete) return;

    if (currentStep === 1) {
      if (validateSchoolDetails()) setCurrentStep(2);
      return;
    }

    if (!validateSchoolDetails() || !validateAccountDetails()) return;

    setLoading(true);

    try {
      await apiClient.post('/schools', {
        name: formData.schoolName.trim(),
        code: formData.schoolCode.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: {
          street: formData.address.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
        },
        principalName: 'Principal',
        principalEmail: formData.email.trim(),
        adminName: formData.adminName.trim(),
        adminEmail: formData.email.trim(),
        adminPassword: formData.password,
      });

      toast.success('School registered successfully!');
      setRegistrationComplete(true);
      setTimeout(() => {
        navigate('/login', {
          state: {
            schoolCode: formData.schoolCode.trim(),
            email: formData.email.trim(),
          },
        });
      }, 1500);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="public-page min-h-screen bg-[#f4ecdf] px-4 py-8 text-[#3f2a1d] sm:px-6 lg:px-8">
      <Toaster position="top-right" />

      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <aside className="registration-brand-panel order-2 rounded-[2rem] p-7 shadow-xl sm:p-9 lg:sticky lg:top-8 lg:order-1">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f2c343] focus:ring-offset-2 focus:ring-offset-[#203a59]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7a4e2d] text-[#f7efe4]">
              <BookOpen className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-white">SchoolHub</p>
              <p className="text-sm text-slate-300">School management platform</p>
            </div>
          </Link>

          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#f2c343]">Get started</p>
          <h1 className="mt-3 max-w-xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
            Set up your school workspace.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-200">
            Add your school details and create the administrator account. You can manage teachers, students and families after signing in.
          </p>

          <div className="mt-8 space-y-3">
            {[
              ['School profile', 'Create a unique school code for sign-in.', Building2],
              ['Administrator account', 'Use one email and password to manage your school.', Users],
              ['Ready for your team', 'Add educators and learners from your dashboard.', CheckCircle],
            ].map(([title, description, Icon]) => (
              <div key={title} className="registration-brand-card flex items-start gap-3 rounded-2xl p-4">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#f2c343]" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-white">{title}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-200">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm leading-6 text-slate-200">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#f2c343]" aria-hidden="true" />
            <p>Your school code and administrator email will be ready on the sign-in page after registration.</p>
          </div>
        </aside>

        <main className="order-1 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-8 lg:order-2">
          <div className="mb-7">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#2c4d73]">School registration</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[#172536]">Create your account</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Complete these two short steps to set up your school.</p>
          </div>

          <div className="mb-8 grid grid-cols-[1fr_auto_1fr] items-center" aria-label="Registration progress">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#2c4d73] bg-[#2c4d73] text-sm font-bold text-white">
                {currentStep === 2 ? <Check className="h-5 w-5" aria-hidden="true" /> : '1'}
              </span>
              <span>
                <span className="block text-xs font-semibold uppercase tracking-wide text-[#2c4d73]">Step 1</span>
                <span className="block text-sm font-semibold text-[#172536]">School profile</span>
              </span>
            </div>
            <span className={`h-0.5 w-8 sm:w-14 ${currentStep === 2 ? 'bg-[#2c4d73]' : 'bg-slate-200'}`} aria-hidden="true" />
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${currentStep === 2 ? 'border-[#2c4d73] bg-[#2c4d73] text-white' : 'border-slate-300 bg-white text-slate-500'}`}>2</span>
              <span>
                <span className={`block text-xs font-semibold uppercase tracking-wide ${currentStep === 2 ? 'text-[#2c4d73]' : 'text-slate-500'}`}>Step 2</span>
                <span className={`block text-sm font-semibold ${currentStep === 2 ? 'text-[#172536]' : 'text-slate-500'}`}>Admin account</span>
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {currentStep === 1 ? (
              <section aria-labelledby="school-details-heading">
                <div className="mb-5">
                  <h3 id="school-details-heading" className="text-xl font-bold text-[#172536]">Tell us about your school</h3>
                  <p className="mt-1 text-sm text-slate-600">Start with the details your team will recognize.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="schoolName" className="mb-1.5 block text-sm font-semibold text-slate-700">
                      School name <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" aria-hidden="true" />
                      <input
                        id="schoolName"
                        type="text"
                        name="schoolName"
                        value={formData.schoolName}
                        onChange={handleChange}
                        placeholder="e.g. Green Valley Public School"
                        autoComplete="organization"
                        required
                        autoFocus
                        className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-[#172536] outline-none transition placeholder:text-slate-400 focus:border-[#2c4d73] focus:ring-4 focus:ring-[#2c4d73]/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="schoolCode" className="mb-1.5 block text-sm font-semibold text-slate-700">
                      School code <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="schoolCode"
                      type="text"
                      name="schoolCode"
                      value={formData.schoolCode}
                      onChange={handleChange}
                      placeholder="e.g. GREENVALLEY"
                      autoComplete="off"
                      required
                      aria-describedby="school-code-help"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 uppercase text-[#172536] outline-none transition placeholder:normal-case placeholder:text-slate-400 focus:border-[#2c4d73] focus:ring-4 focus:ring-[#2c4d73]/10"
                    />
                    <p id="school-code-help" className="mt-1.5 text-xs leading-5 text-slate-500">
                      You’ll enter this code when you sign in. It’s converted to uppercase automatically.
                    </p>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <p className="mb-3 text-sm font-semibold text-slate-700">
                      Contact details <span className="font-normal text-slate-500">(optional)</span>
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate-700">School phone</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" aria-hidden="true" />
                          <input
                            id="phone"
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="Include country or area code"
                            autoComplete="tel"
                            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-[#172536] outline-none transition placeholder:text-slate-400 focus:border-[#2c4d73] focus:ring-4 focus:ring-[#2c4d73]/10"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="address" className="mb-1.5 block text-sm font-medium text-slate-700">Street address</label>
                        <input
                          id="address"
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          placeholder="Street or area"
                          autoComplete="street-address"
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#172536] outline-none transition placeholder:text-slate-400 focus:border-[#2c4d73] focus:ring-4 focus:ring-[#2c4d73]/10"
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="city" className="mb-1.5 block text-sm font-medium text-slate-700">City</label>
                          <input
                            id="city"
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            placeholder="City"
                            autoComplete="address-level2"
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#172536] outline-none transition placeholder:text-slate-400 focus:border-[#2c4d73] focus:ring-4 focus:ring-[#2c4d73]/10"
                          />
                        </div>
                        <div>
                          <label htmlFor="state" className="mb-1.5 block text-sm font-medium text-slate-700">State / region</label>
                          <input
                            id="state"
                            type="text"
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            placeholder="State or region"
                            autoComplete="address-level1"
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#172536] outline-none transition placeholder:text-slate-400 focus:border-[#2c4d73] focus:ring-4 focus:ring-[#2c4d73]/10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button type="submit" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2c4d73] px-5 py-3.5 font-semibold text-white transition hover:bg-[#203a59] focus:outline-none focus:ring-4 focus:ring-[#2c4d73]/20">
                  Continue to administrator details
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </section>
            ) : (
              <section aria-labelledby="admin-details-heading">
                <div className="mb-5">
                  <h3 id="admin-details-heading" className="text-xl font-bold text-[#172536]">Set up administrator access</h3>
                  <p className="mt-1 text-sm text-slate-600">These are the credentials you’ll use to manage your school.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="adminName" className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Administrator’s full name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="adminName"
                      type="text"
                      name="adminName"
                      value={formData.adminName}
                      onChange={handleChange}
                      placeholder="e.g. Jordan Lee"
                      autoComplete="name"
                      required
                      autoFocus
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#172536] outline-none transition placeholder:text-slate-400 focus:border-[#2c4d73] focus:ring-4 focus:ring-[#2c4d73]/10"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Administrator email <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" aria-hidden="true" />
                      <input
                        id="email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@school.com"
                        autoComplete="email"
                        required
                        aria-describedby="email-help"
                        className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-[#172536] outline-none transition placeholder:text-slate-400 focus:border-[#2c4d73] focus:ring-4 focus:ring-[#2c4d73]/10"
                      />
                    </div>
                    <p id="email-help" className="mt-1.5 text-xs leading-5 text-slate-500">
                      Use an email address you can access; it will be prefilled at sign-in.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Create password <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" aria-hidden="true" />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Create a strong password"
                        autoComplete="new-password"
                        required
                        aria-describedby="password-help"
                        className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-12 text-[#172536] outline-none transition placeholder:text-slate-400 focus:border-[#2c4d73] focus:ring-4 focus:ring-[#2c4d73]/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-3.5 rounded text-slate-500 transition hover:text-[#2c4d73] focus:outline-none focus:ring-2 focus:ring-[#2c4d73]"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                      </button>
                    </div>
                    <div id="password-help" className="mt-3 grid gap-2 sm:grid-cols-2" aria-live="polite">
                      {passwordRequirements.map(({ label, test }) => {
                        const passed = test(formData.password);
                        return (
                          <div key={label} className={`flex items-center gap-2 text-xs ${passed ? 'font-medium text-emerald-700' : 'text-slate-500'}`}>
                            {passed ? <CheckCircle className="h-4 w-4" aria-hidden="true" /> : <span className="h-4 w-4 rounded-full border border-slate-300" aria-hidden="true" />}
                            {label}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Confirm password <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" aria-hidden="true" />
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Enter your password again"
                        autoComplete="new-password"
                        required
                        className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-12 text-[#172536] outline-none transition placeholder:text-slate-400 focus:border-[#2c4d73] focus:ring-4 focus:ring-[#2c4d73]/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                        className="absolute right-3 top-3.5 rounded text-slate-500 transition hover:text-[#2c4d73] focus:outline-none focus:ring-2 focus:ring-[#2c4d73]"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                      </button>
                    </div>
                    {formData.confirmPassword && (
                      <p className={`mt-1.5 text-xs ${formData.password === formData.confirmPassword ? 'text-emerald-700' : 'text-rose-600'}`} aria-live="polite">
                        {formData.password === formData.confirmPassword ? 'Passwords match' : 'Passwords do not match yet'}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {currentStep === 2 && (
              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  disabled={loading || registrationComplete}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back to school details
                </button>
                <button
                  type="submit"
                  disabled={loading || registrationComplete}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2c4d73] px-5 py-3 font-semibold text-white transition hover:bg-[#203a59] focus:outline-none focus:ring-4 focus:ring-[#2c4d73]/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading || registrationComplete ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" aria-hidden="true" />
                      {registrationComplete ? 'Workspace created, redirecting...' : 'Creating workspace...'}
                    </>
                  ) : (
                    <>
                      Create school workspace
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            )}
          </form>

          <p className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#2c4d73] hover:text-[#203a59]">Sign in</Link>
          </p>
        </main>
      </div>
    </div>
  );
}
