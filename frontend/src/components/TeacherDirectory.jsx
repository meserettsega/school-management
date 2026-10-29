import { useMemo, useState } from 'react';
import { Activity, BookOpen, CalendarDays, Plus, Search, Users } from 'lucide-react';

const pageSize = 7;
const panelClass = 'min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm';

const referenceId = (value) => String(value?._id || value || '');

const getSubjects = (teacher) => {
  const subjects = [
    ...(teacher.subjectClassAssignments || []).map((assignment) => assignment.subjectId),
    ...(teacher.subjectIds || []),
  ];
  return [...new Map(subjects
    .filter(Boolean)
    .map((subject) => [referenceId(subject), subject])).values()];
};

const getSections = (teacher) => {
  const classes = [
    ...(teacher.subjectClassAssignments || []).map((assignment) => assignment.classId),
    ...(teacher.classIds || []),
    teacher.classTeacherOf,
  ].filter(Boolean);
  return [...new Set(classes.map((classItem) => (
    classItem.standard
      ? `Grade ${classItem.standard}${classItem.division ? ` - ${classItem.division}` : ''}`
      : ''
  )).filter(Boolean))];
};

const isOnLeaveToday = (teacher, today) => (teacher.leaves || []).some((leave) => {
  if (leave.approvalStatus !== 'Approved' || !leave.startDate || !leave.endDate) return false;
  const start = new Date(leave.startDate);
  const end = new Date(leave.endDate);
  return !Number.isNaN(start.getTime())
    && !Number.isNaN(end.getTime())
    && start <= today.end
    && end >= today.start;
});

const getTeacherStatus = (teacher, onLeave) => {
  if (onLeave) return 'On leave';
  if ((teacher.employeeStatus || '').toLowerCase() === 'on leave') return 'On leave';
  if (
    teacher.isActive === false
    || ['Inactive', 'Suspended'].includes(teacher.accountStatus)
    || ['Resigned', 'Retired', 'Inactive'].includes(teacher.employeeStatus)
  ) return 'Inactive';
  return 'Active';
};

const TeacherDirectory = ({ teachers, subjects, classes, timetables, onAddTeacher, onEditTeacher, onDeleteTeacher }) => {
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const directoryRows = useMemo(() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);
    todayEnd.setMilliseconds(todayEnd.getMilliseconds() - 1);

    return teachers.map((teacher) => {
      const onLeave = isOnLeaveToday(teacher, { start: today, end: todayEnd });
      const subjectList = getSubjects(teacher);
      const sections = getSections(teacher);
      const periodsPerWeek = timetables.reduce((total, timetable) => (
        total + (timetable.isActive === false ? 0 : (timetable.slots || []).filter((slot) => (
          !slot.isBreak && referenceId(slot.teacherId) === referenceId(teacher._id)
        )).length)
      ), 0);

      return {
        teacher,
        id: referenceId(teacher._id),
        name: teacher.name || 'Unnamed teacher',
        email: teacher.email || '',
        subjects: subjectList,
        subjectNames: subjectList.map((subject) => subject.name).filter(Boolean),
        sections,
        grades: [...new Set(sections.map((section) => section.replace(/^Grade\s+/, '').split(' - ')[0]))],
        periodsPerWeek,
        status: getTeacherStatus(teacher, onLeave),
      };
    });
  }, [teachers, timetables]);

  const filteredRows = directoryRows.filter((row) => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch = !normalizedSearch
      || row.name.toLowerCase().includes(normalizedSearch)
      || row.email.toLowerCase().includes(normalizedSearch)
      || (row.teacher.employeeId || '').toLowerCase().includes(normalizedSearch);
    const matchesSubject = !subjectFilter || row.subjects.some((subject) => referenceId(subject) === subjectFilter);
    const matchesGrade = !gradeFilter || row.grades.includes(gradeFilter);
    const matchesStatus = !statusFilter || row.status === statusFilter;
    return matchesSearch && matchesSubject && matchesGrade && matchesStatus;
  });

  const activeTeachers = directoryRows.filter((row) => row.status !== 'Inactive');
  const onLeaveCount = directoryRows.filter((row) => row.status === 'On leave').length;
  const subjectsWithAssignments = new Set(directoryRows.flatMap((row) => row.subjects.map(referenceId)));
  const unassignedSubjects = subjects.filter((subject) => (
    !(subject.assignedTeachers || []).length && !subjectsWithAssignments.has(referenceId(subject._id))
  )).length;
  const timetableConfigured = timetables.some((timetable) => timetable.isActive !== false);
  const averagePeriods = activeTeachers.length
    ? Math.round(activeTeachers.reduce((total, row) => total + row.periodsPerWeek, 0) / activeTeachers.length)
    : 0;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const cards = [
    { label: 'Teachers', value: teachers.length, helper: 'Staff in this school', Icon: Users, tone: 'bg-blue-50 text-[#2c4d73]' },
    { label: 'On leave today', value: onLeaveCount, helper: 'Approved leave requests', Icon: CalendarDays, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Average teaching load', value: timetableConfigured ? `${averagePeriods} periods` : '—', helper: timetableConfigured ? 'Scheduled periods per active teacher' : 'No active timetable data', Icon: Activity, tone: 'bg-teal-50 text-teal-700' },
    { label: 'Unassigned subjects', value: unassignedSubjects, helper: 'Subjects without a teacher', Icon: BookOpen, tone: 'bg-rose-50 text-rose-700' },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500">Home / Teachers</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#172536]">Teachers</h1>
          <p className="mt-1 text-sm text-slate-600">Teaching staff, subjects, and weekly workload.</p>
        </div>
        <button
          type="button"
          onClick={onAddTeacher}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2c4d73] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#203a59]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add teacher
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Teacher summary">
        {cards.map(({ label, value, helper, Icon, tone }) => (
          <article key={label} className={panelClass}>
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

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="Teacher directory">
        <div className="grid gap-2 border-b border-slate-200 p-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_160px_140px_140px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Search teachers"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-[#2c4d73] focus:ring-2 focus:ring-blue-100"
              aria-label="Search teachers"
            />
          </label>
          <select
            value={subjectFilter}
            onChange={(event) => { setSubjectFilter(event.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#2c4d73]"
            aria-label="Filter teachers by subject"
          >
            <option value="">Subject: All</option>
            {subjects.map((subject) => <option key={subject._id} value={referenceId(subject._id)}>{subject.name}</option>)}
          </select>
          <select
            value={gradeFilter}
            onChange={(event) => { setGradeFilter(event.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#2c4d73]"
            aria-label="Filter teachers by grade"
          >
            <option value="">Grade: All</option>
            {[...new Set(classes.map((classItem) => String(classItem.standard)))].sort().map((grade) => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#2c4d73]"
            aria-label="Filter teachers by status"
          >
            <option value="">Status: All</option>
            <option value="Active">Active</option>
            <option value="On leave">On leave</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {pageRows.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Teacher</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Sections</th>
                    <th className="px-4 py-3 text-right">Periods / week</th>
                    <th className="px-4 py-3">Attendance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageRows.map((row) => (
                    <tr key={row.id} className="text-slate-700">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[#2c4d73]">
                            {row.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-slate-900">{row.name}</span>
                            <span className="block truncate text-xs text-slate-500">{row.email || row.teacher.employeeId || 'No contact details'}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{row.subjectNames.join(', ') || 'Unassigned'}</td>
                      <td className="px-4 py-3">{row.sections.join(', ') || 'Unassigned'}</td>
                      <td className="px-4 py-3 text-right">{timetableConfigured ? row.periodsPerWeek : '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500" title="Teacher attendance is not stored separately in this system">
                          Not tracked
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          row.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : row.status === 'On leave'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button type="button" onClick={() => onEditTeacher(row.teacher)} className="rounded-md px-2 py-1 text-xs font-semibold text-[#2c4d73] hover:bg-blue-50" aria-label={`Edit ${row.name}`}>Edit</button>
                          <button type="button" onClick={() => onDeleteTeacher(row.teacher._id)} className="rounded-md px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50" aria-label={`Delete ${row.name}`}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} teachers</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage(currentPage + 1)}
                  className="rounded-lg bg-[#2c4d73] px-3 py-1.5 font-semibold text-white hover:bg-[#203a59] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="px-4 py-12 text-center">
            <Users className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-700">No teachers match these filters</p>
            <p className="mt-1 text-xs text-slate-500">Try another search or clear one of the selected filters.</p>
          </div>
        )}
      </section>
      <p className="text-xs text-slate-500">
        Teacher attendance is not recorded separately in the current data model; student attendance is kept distinct.
      </p>
    </div>
  );
};

export default TeacherDirectory;
