import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  GraduationCap,
  RefreshCw,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useSelector } from 'react-redux';
import apiClient from '../utils/apiClient';

const palette = ['#2c4d73', '#48c2c0', '#f2c343', '#849bb2'];
const panelClass = 'min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5';
const chartTooltipStyle = {
  border: '1px solid #dbe4ec',
  borderRadius: '10px',
  boxShadow: '0 8px 24px rgba(16, 29, 43, 0.12)',
};

const formatNumber = (value) => new Intl.NumberFormat().format(value || 0);
const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(value || 0);

const formatDate = (value, options = { day: '2-digit', month: 'short', year: 'numeric' }) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString(undefined, options);
};

const AdminOverview = ({ schoolName, onSelectTab, onAddStudent }) => {
  const adminName = useSelector((state) => state.auth.user?.name?.split(' ')[0] || 'Admin');
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/dashboard/admin');
      setOverview(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load live school overview data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  if (loading && !overview) {
    return (
      <div className="flex min-h-80 items-center justify-center" role="status">
        <RefreshCw className="h-6 w-6 animate-spin text-[#2c4d73]" aria-hidden="true" />
        <span className="ml-3 text-sm text-slate-600">Loading your school overview…</span>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <section className={`${panelClass} flex items-start gap-3`} role="alert">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
        <div>
          <h2 className="font-bold text-slate-900">Overview unavailable</h2>
          <p className="mt-1 text-sm text-slate-600">{error}</p>
          <button onClick={loadOverview} className="mt-3 rounded-lg bg-[#2c4d73] px-3 py-2 text-sm font-semibold text-white hover:bg-[#203a59]">
            Try again
          </button>
        </div>
      </section>
    );
  }

  const stats = overview?.stats || {};
  const gradeData = overview?.studentsByGrade || [];
  const communityData = [
    { name: 'Students', value: stats.totalStudents || 0 },
    { name: 'Families', value: stats.totalFamilies || 0 },
    { name: 'Teachers', value: stats.totalTeachers || 0 },
  ].filter((entry) => entry.value > 0);
  const communityTotal = communityData.reduce((sum, entry) => sum + entry.value, 0);
  const unassignedStudents = gradeData.find((entry) => entry.name === 'Unassigned')?.value || 0;
  const feeSummary = overview?.feeSummary || {};
  const feePercent = feeSummary.expected > 0
    ? Math.min(100, Math.round((feeSummary.collected / feeSummary.expected) * 100))
    : 0;

  const attentionItems = [
    { label: 'Pending grievances', value: stats.pendingComplaints || 0, tab: 'grievances', tone: 'bg-rose-100 text-rose-700' },
    { label: 'Students without a class', value: unassignedStudents, tab: 'students', tone: 'bg-amber-100 text-amber-700' },
    { label: 'Fee records with balance', value: feeSummary.pendingRecords || 0, tab: 'fees', tone: 'bg-sky-100 text-sky-700' },
    { label: 'Upcoming exams', value: (overview?.upcomingExams || []).length, tab: 'exams', tone: 'bg-teal-100 text-teal-700' },
  ].filter((item) => item.value > 0);

  const activity = [
    ...(overview?.upcomingEvents || []).map((event) => ({
      id: `event-${event._id}`,
      label: event.name,
      category: event.eventType || 'School event',
      date: event.startDate,
      type: 'event',
    })),
    ...(overview?.upcomingExams || []).map((exam) => ({
      id: `exam-${exam._id}`,
      label: exam.name,
      category: exam.classId?.standard ? `Grade ${exam.classId.standard}` : 'Exam',
      date: exam.date,
      type: 'exam',
    })),
  ].sort((first, second) => new Date(first.date) - new Date(second.date)).slice(0, 5);

  const studentRows = overview?.recentAdmissions || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Home / Overview</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#172536]">
            {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}, {adminName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {schoolName ? ` · ${schoolName}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadOverview}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh data
          </button>
          <button
            onClick={onAddStudent}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2c4d73] px-3 py-2 text-sm font-semibold text-white hover:bg-[#203a59]"
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            Add student
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
          Could not refresh the latest data. Showing the last successful overview.
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="School key metrics">
        {[
          { label: 'Total students', value: formatNumber(stats.totalStudents), helper: 'Enrolled in this school', Icon: GraduationCap, tone: 'bg-blue-50 text-[#2c4d73]' },
          { label: 'Teachers', value: formatNumber(stats.totalTeachers), helper: 'Teaching staff', Icon: Users, tone: 'bg-teal-50 text-teal-700' },
          { label: 'Sections', value: formatNumber(stats.totalClasses), helper: 'Classes across grades', Icon: BookOpen, tone: 'bg-amber-50 text-amber-700' },
          {
            label: 'Attendance today',
            value: stats.todayAttendancePercentage == null ? '—' : `${stats.todayAttendancePercentage}%`,
            helper: stats.todayAttendance ? `Present among ${formatNumber(stats.todayAttendance)} records` : 'No attendance recorded yet',
            Icon: Activity,
            tone: 'bg-emerald-50 text-emerald-700',
          },
        ].map(({ label, value, helper, Icon, tone }) => (
          <article key={label} className={panelClass}>
            <div className="flex items-start justify-between gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="text-xs font-medium text-slate-500">Current</span>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-600">{label}</p>
            <p className="mt-1 text-2xl font-bold text-[#172536]">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{helper}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(250px,0.8fr)]">
        <article className={panelClass}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-bold text-[#172536]">Attendance trend</h2>
              <p className="mt-1 text-xs text-slate-500">Present share of attendance records over the last 10 days</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Last 10 days</span>
          </div>
          {overview?.attendanceTrend?.some((day) => day.recorded > 0) ? (
            <div className="mt-4 h-56" role="img" aria-label="Attendance percentage trend over the last ten days">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overview.attendanceTrend} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#e8eef3" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value, _name, item) => [`${value}% (${item.payload.recorded} records)`, 'Present']} />
                  <Line dataKey="percentage" type="monotone" stroke="#2c4d73" strokeWidth={2.5} dot={{ r: 3, fill: '#2c4d73' }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4 flex h-56 items-center justify-center rounded-xl bg-slate-50 px-4 text-center text-sm text-slate-500">
              Attendance records will appear here after teachers start taking attendance.
            </div>
          )}
        </article>

        <article className={panelClass}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold text-[#172536]">Needs your attention</h2>
              <p className="mt-1 text-xs text-slate-500">Live items from school records</p>
            </div>
            <AlertCircle className="h-5 w-5 text-amber-500" aria-hidden="true" />
          </div>
          {attentionItems.length ? (
            <ul className="mt-3 divide-y divide-slate-100">
              {attentionItems.map((item) => (
                <li key={item.label}>
                  <button onClick={() => onSelectTab(item.tab)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-slate-50">
                    <span className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-bold ${item.tone}`}>{formatNumber(item.value)}</span>
                    <span className="flex-1 text-sm text-slate-700">{item.label}</span>
                    <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
              <CheckCircle2 className="mb-2 h-5 w-5" aria-hidden="true" />
              No outstanding items in the current overview.
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className={panelClass}>
          <div>
            <h2 className="font-bold text-[#172536]">Students by grade</h2>
            <p className="mt-1 text-xs text-slate-500">Count of enrolled student records</p>
          </div>
          {gradeData.length ? (
            <div className="mt-4 h-48" role="img" aria-label="Students grouped by grade">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeData} margin={{ top: 8, right: 4, left: -25, bottom: 0 }}>
                  <CartesianGrid stroke="#e8eef3" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="value" name="Students" fill="#2c4d73" radius={[5, 5, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="Student enrollment data will appear here." />
          )}
        </article>

        <article className={panelClass}>
          <div>
            <h2 className="font-bold text-[#172536]">School community</h2>
            <p className="mt-1 text-xs text-slate-500">Students, families and teachers</p>
          </div>
          {communityData.length ? (
            <>
              <div className="relative mt-2 h-40" role="img" aria-label="School community composition">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={communityData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={3} stroke="none">
                      {communityData.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-[#172536]">{formatNumber(communityTotal)}</span>
                  <span className="text-[10px] text-slate-500">accounts</span>
                </div>
              </div>
              <ul className="space-y-2">
                {communityData.map((entry, index) => (
                  <li key={entry.name} className="flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: palette[index % palette.length] }} />
                      {entry.name}
                    </span>
                    <span className="font-semibold text-slate-800">{formatNumber(entry.value)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <EmptyChart message="Community data will appear as records are added." />
          )}
        </article>

        <article className={panelClass}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-bold text-[#172536]">Fee collection</h2>
              <p className="mt-1 text-xs text-slate-500">From student fee records with configured fee plans</p>
            </div>
            <CircleDollarSign className="h-5 w-5 text-teal-700" aria-hidden="true" />
          </div>
          {feeSummary.trackedRecords > 0 ? (
            <>
              <p className="mt-5 text-2xl font-bold text-[#172536]">{formatCurrency(feeSummary.collected)}</p>
              <p className="mt-1 text-xs text-slate-500">collected of {formatCurrency(feeSummary.expected)} tracked</p>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#48c2c0] transition-all" style={{ width: `${feePercent}%` }} />
              </div>
              <div className="mt-3 flex justify-between text-xs">
                <span className="font-semibold text-teal-700">{feePercent}% collected</span>
                <button onClick={() => onSelectTab('fees')} className="font-semibold text-[#2c4d73] hover:underline">Manage fees</button>
              </div>
              <p className="mt-2 text-xs text-slate-500">{formatNumber(feeSummary.pendingRecords)} records have at least one unpaid installment.</p>
            </>
          ) : (
            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              No fee records are available for a configured fee plan yet.
              <button onClick={() => onSelectTab('fees')} className="mt-3 block font-semibold text-[#2c4d73] hover:underline">Configure fees <ArrowRight className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" /></button>
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.8fr)]">
        <article className={`${panelClass} overflow-hidden`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-[#172536]">Recent admissions</h2>
              <p className="mt-1 text-xs text-slate-500">Latest student records created</p>
            </div>
            <button onClick={() => onSelectTab('students')} className="text-xs font-semibold text-[#2c4d73] hover:underline">
              View students
            </button>
          </div>
          {studentRows.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">Student</th>
                    <th className="py-2 pr-3 font-semibold">Grade / section</th>
                    <th className="py-2 pr-3 font-semibold">Admission date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentRows.map((student) => (
                    <tr key={student._id}>
                      <td className="py-3 pr-3 font-medium text-slate-800">{student.name || [student.firstName, student.lastName].filter(Boolean).join(' ') || 'Unnamed student'}</td>
                      <td className="py-3 pr-3 text-slate-600">
                        {student.classId?.standard
                          ? `${student.classId.standard}${student.classId.division ? ` · ${student.classId.division}` : ''}`
                          : 'Unassigned'}
                      </td>
                      <td className="py-3 pr-3 text-xs text-slate-500">{formatDate(student.admissionDate || student.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyChart message="Student admissions will appear here." />
          )}
        </article>

        <article className={panelClass}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold text-[#172536]">Upcoming</h2>
              <p className="mt-1 text-xs text-slate-500">Scheduled school events and exams</p>
            </div>
            <CalendarDays className="h-5 w-5 text-[#2c4d73]" aria-hidden="true" />
          </div>
          {activity.length ? (
            <ul className="mt-3 divide-y divide-slate-100">
              {activity.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-blue-50 text-[#2c4d73]">
                    <span className="text-xs font-bold">{formatDate(item.date, { day: '2-digit' })}</span>
                    <span className="text-[9px] uppercase">{formatDate(item.date, { month: 'short' })}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{item.label}</span>
                    <span className="block text-xs text-slate-500">{item.category} · {formatDate(item.date, { hour: 'numeric', minute: '2-digit' })}</span>
                  </span>
                  {item.type === 'exam' ? <GraduationCap className="h-4 w-4 shrink-0 text-slate-400" aria-label="Exam" /> : <Bell className="h-4 w-4 shrink-0 text-slate-400" aria-label="Event" />}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyChart message="No upcoming events or exams are scheduled." />
          )}
        </article>
      </section>
    </div>
  );
};

const EmptyChart = ({ message }) => (
  <div className="mt-4 flex min-h-40 items-center justify-center rounded-xl bg-slate-50 px-4 text-center text-sm text-slate-500">
    {message}
  </div>
);

export default AdminOverview;
