import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  GraduationCap,
  Inbox,
  MessageSquare,
  ShieldCheck,
  Users,
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);

  const services = [
    {
      icon: Users,
      title: 'Student records',
      text: 'Keep admission details, class data, attendance and progress in one place.',
    },
    {
      icon: GraduationCap,
      title: 'Teacher tools',
      text: 'Assign classes, manage subjects, take attendance and enter marks without extra steps.',
    },
    {
      icon: Bell,
      title: 'Notices and alerts',
      text: 'Share announcements, reminders and updates with students, teachers and parents.',
    },
    {
      icon: MessageSquare,
      title: 'Communication',
      text: 'Use complaints, messages and replies to keep school communication clear.',
    },
  ];

  const issues = [
    'Manual registers make attendance and marks hard to track.',
    'Separate systems for students, teachers and notices waste time.',
    'School data gets mixed when there is no proper role-based access.',
    'Parents and students need a simple place to check updates and homework.',
  ];

  const platformPoints = [
    'One login for admin, teacher and student roles.',
    'Multi-school setup with separate data for each school.',
    'Cleaner workflows for attendance, marks, timetable and homework.',
    'Simple dashboard style screens that are easy to understand.',
  ];

  return (
    <div className="public-page min-h-screen bg-[#f4ecdf] text-[#3f2a1d]">
      {!isAuthenticated && (
        <nav className="sticky top-0 z-30 border-b border-[#c9b39a] bg-[#f7efe4]/95 backdrop-blur-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7a4e2d] text-[#f7efe4] shadow-sm">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-extrabold tracking-tight text-[#3f2a1d]">SchoolHub</p>
                <p className="text-xs text-[#7f634e]">School management system</p>
              </div>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <button onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-full px-4 py-2 text-sm font-semibold text-[#6d4c35] transition hover:bg-[#eadcc9]">
                About Us
              </button>
              <button onClick={() => document.getElementById('platform')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-full px-4 py-2 text-sm font-semibold text-[#6d4c35] transition hover:bg-[#eadcc9]">
                Platform
              </button>
              <button onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-full px-4 py-2 text-sm font-semibold text-[#6d4c35] transition hover:bg-[#eadcc9]">
                Services
              </button>
              <button onClick={() => navigate('/login')} className="rounded-full border border-[#b68c67] px-4 py-2 text-sm font-semibold text-[#7a4e2d] transition hover:bg-[#f0e0cd]">
                Login
              </button>
            </div>
          </div>
        </nav>
      )}

      <section className="px-5 py-16 lg:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c9b39a] bg-[#efe3d2] px-4 py-2 text-sm text-[#7a4e2d]">
              <span className="h-2 w-2 rounded-full bg-[#7a4e2d]" />
              School operations, clearly connected
            </div>
            <h1 className="mt-6 max-w-2xl text-5xl font-black leading-tight tracking-tight lg:text-6xl">
              Everything your school needs to stay organized and moving forward.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#6d4c35]">
              Manage student records, attendance, academic results, notices and communication through one secure, role-based platform.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button onClick={() => navigate('/register')} className="inline-flex items-center gap-2 rounded-full bg-[#7a4e2d] px-6 py-3 font-semibold text-[#f7efe4] transition hover:bg-[#624021]">
                Register School
                <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => navigate('/login')} className="inline-flex items-center gap-2 rounded-full border border-[#b68c67] bg-[#f7efe4] px-6 py-3 font-semibold text-[#7a4e2d] transition hover:bg-[#f0e0cd]">
                Login
              </button>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['4', 'User roles'],
                ['6', 'Core workflows'],
                ['1', 'Connected workspace'],
                ['Role-based', 'Access tailored to each user'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-3xl border border-[#d9c5b0] bg-[#faf4ea] p-4">
                  <p className="text-3xl font-black text-[#7a4e2d]">{value}</p>
                  <p className="mt-1 text-sm text-[#6d4c35]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fbf6ee] p-5 shadow-lg shadow-[#b68c67]/15">
            <div className="rounded-[1.5rem] border border-[#dcc9b5] bg-[#fffaf3] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#8a6a50]">The SchoolHub platform</p>
                  <h2 className="text-2xl font-extrabold text-[#3f2a1d]">A connected school workspace</h2>
                </div>
                <div className="rounded-2xl bg-[#f0e0cd] px-3 py-2 text-sm font-semibold text-[#7a4e2d]">
                  Built for school teams
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ['Attendance', ClipboardList],
                  ['Marks', BarChart3],
                  ['Notices', Bell],
                  ['Messages', Inbox],
                ].map(([label, Icon]) => (
                  <div key={label} className="rounded-2xl border border-[#e1d0be] bg-[#f7efe4] p-4">
                    <Icon className="h-5 w-5 text-[#7a4e2d]" />
                    <p className="mt-3 font-semibold text-[#3f2a1d]">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-3xl border border-[#dcc9b5] bg-[#f4ecdf] p-4">
                <p className="text-sm font-semibold text-[#7a4e2d]">Login</p>
                <p className="mt-2 text-sm leading-6 text-[#6d4c35]">
                  Sign in with your school code and account credentials to access tools tailored to your role.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="px-5 py-12 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-[#d9c5b0] bg-[#fbf6ee] p-6 lg:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#8a6a50]">About SchoolHub</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-[#3f2a1d]">Designed for the everyday work of running a school.</h2>
          <p className="mt-4 max-w-4xl text-lg leading-8 text-[#6d4c35]">
            SchoolHub brings student information, teaching workflows and school-wide communication together, helping teams spend less time coordinating and more time supporting learners.
          </p>
        </div>
      </section>

      <section id="platform" className="px-5 py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#8a6a50]">What is this platform</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-[#3f2a1d]">One platform for administrators, teachers, families and students.</h2>
            <p className="mt-4 text-lg leading-8 text-[#6d4c35]">
              It works like a shared dashboard for the whole school, with role-based access so every user sees only what matters to them.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {platformPoints.map((point) => (
              <div key={point} className="rounded-3xl border border-[#d9c5b0] bg-[#fffaf3] p-5">
                <CheckCircle className="h-5 w-5 text-[#7a4e2d]" />
                <p className="mt-3 text-sm leading-6 text-[#6d4c35]">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-12 lg:px-8">
        <div className="mx-auto max-w-7xl grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fbf6ee] p-6 lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#8a6a50]">A better way to work</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#3f2a1d]">Less manual work. Clearer school operations.</h2>
            <div className="mt-5 space-y-4">
              {issues.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl bg-[#f7efe4] px-4 py-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#7a4e2d]" />
                  <p className="text-sm leading-6 text-[#6d4c35]">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fbf6ee] p-6 lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#8a6a50]">Login</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#3f2a1d]">A secure sign-in for every school role.</h2>
            <p className="mt-4 text-lg leading-8 text-[#6d4c35]">
              Each account receives access to the tools and information relevant to its role, from administration to classroom learning.
            </p>
            <button onClick={() => navigate('/login')} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#7a4e2d] px-6 py-3 font-semibold text-[#f7efe4] transition hover:bg-[#624021]">
              Go to Login
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section id="services" className="px-5 py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#8a6a50]">Services</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-[#3f2a1d]">The essential tools for a well-connected school.</h2>
            <p className="mt-4 text-lg leading-8 text-[#6d4c35]">
              Keep core academic and administrative workflows organized in one consistent workspace.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div key={service.title} className="rounded-[1.75rem] border border-[#d9c5b0] bg-[#fffaf3] p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#efe3d2] text-[#7a4e2d]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-[#3f2a1d]">{service.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#6d4c35]">{service.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-12 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-[#d9c5b0] bg-[#7a4e2d] p-8 text-[#f7efe4]">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#f0e0cd]">Start here</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight">Bring your school&apos;s daily work into one place.</h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[#f0e0cd]">
                Create your school workspace and give your team one clear place to manage the school day.
              </p>
            </div>
            <button onClick={() => navigate('/register')} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f7efe4] px-6 py-3 font-semibold text-[#7a4e2d] transition hover:bg-white">
              Register School
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}