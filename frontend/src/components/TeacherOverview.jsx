import { useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Search,
  Users,
} from 'lucide-react';

const cardClass = 'min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm';

const TeacherOverview = ({ teacher, overview, error, onOpenTab }) => {
  const [query, setQuery] = useState('');
  const assignments = overview?.assignments || [];
  const stats = overview?.stats || {};
  const filteredAssignments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return assignments;
    return assignments.filter((assignment) => (
      assignment.subjectName?.toLowerCase().includes(normalizedQuery)
      || assignment.classLabel?.toLowerCase().includes(normalizedQuery)
      || assignment.subjectCode?.toLowerCase().includes(normalizedQuery)
    ));
  }, [assignments, query]);

  const cards = [
    { label: 'Students in my sections', value: stats.totalStudents ?? 0, helper: 'Unique students in assigned classes', Icon: Users, tone: 'bg-blue-50 text-[#2c4d73]' },
    { label: 'Teaching assignments', value: assignments.length, helper: 'Subject and class combinations', Icon: BookOpen, tone: 'bg-teal-50 text-teal-700' },
    { label: 'Periods per week', value: stats.periodsPerWeek ?? 0, helper: 'From the published timetable', Icon: CalendarDays, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Attendance recorded', value: stats.attendancePercentage == null ? '—' : `${stats.attendancePercentage}%`, helper: stats.attendanceRecords ? `Based on ${stats.attendanceRecords} records` : 'No records for your classes yet', Icon: Activity, tone: 'bg-emerald-50 text-emerald-700' },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500">Home / My teaching</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#172536]">My teaching</h1>
          <p className="mt-1 text-sm text-slate-600">
            Teaching overview for {teacher?.name || 'your account'}: assigned sections, weekly workload, and recorded attendance.
          </p>
        </div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
          overview?.teacherStatus === 'Active'
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-amber-50 text-amber-700'
        }`}>
          {overview?.teacherStatus || 'Status unavailable'}
        </span>
      </header>

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          Teaching summary unavailable: {error}
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Teaching summary">
        {cards.map(({ label, value, helper, Icon, tone }) => (
          <article key={label} className={cardClass}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
              </div>
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">{helper}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="My teaching assignments">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">My teaching assignments</h2>
            <p className="mt-1 text-xs text-slate-500">Only the classes and subjects assigned to your account.</p>
          </div>
          <label className="relative block w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search subject or section"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-[#2c4d73] focus:ring-2 focus:ring-blue-100"
              aria-label="Search teaching assignments"
            />
          </label>
        </div>

        {filteredAssignments.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3 text-right">Students</th>
                    <th className="px-4 py-3 text-right">Periods / week</th>
                    <th className="px-4 py-3 text-right">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssignments.map((assignment) => (
                    <tr key={`${assignment.classId}-${assignment.subjectId || 'class-teacher'}`} className="text-slate-700">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900">{assignment.subjectName}</span>
                        {assignment.subjectCode && <span className="ml-2 text-xs text-slate-500">{assignment.subjectCode}</span>}
                      </td>
                      <td className="px-4 py-3">{assignment.classLabel}</td>
                      <td className="px-4 py-3 text-right">{assignment.studentCount}</td>
                      <td className="px-4 py-3 text-right">{assignment.periodsPerWeek}</td>
                      <td className="px-4 py-3 text-right">
                        {assignment.attendancePercentage == null ? (
                          <span className="text-slate-400">No data</span>
                        ) : (
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            assignment.attendancePercentage >= 90
                              ? 'bg-emerald-50 text-emerald-700'
                              : assignment.attendancePercentage >= 75
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                          }`}>
                            {assignment.attendancePercentage}%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>Showing {filteredAssignments.length} of {assignments.length} assignments</span>
              <button
                type="button"
                onClick={() => onOpenTab('timetable')}
                className="inline-flex items-center gap-1 self-start font-semibold text-[#2c4d73] hover:underline sm:self-auto"
              >
                <GraduationCap className="h-4 w-4" aria-hidden="true" />
                View my timetable
              </button>
            </div>
          </>
        ) : (
          <div className="px-4 py-12 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              {query ? 'No matching assignments' : 'No teaching assignments yet'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {query ? 'Try another subject or section.' : 'Your school administrator has not assigned classes or subjects to your account.'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default TeacherOverview;
