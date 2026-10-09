import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  DollarSign,
  FileText,
  GraduationCap,
  LayoutGrid,
  Lock,
  Menu,
  MessageSquare,
  ShieldCheck,
  User,
  Users,
  X,
} from 'lucide-react';
import apiClient from '../../utils/apiClient';
import MessagingPanel from '../../components/MessagingPanel';
import MessageNotifications from '../../components/MessageNotifications';

const getFamilyChildId = (child) => String(child?.studentId?._id || child?.studentId || '');
const attendanceStatusStyles = {
  Present: 'bg-emerald-100 text-emerald-800',
  Absent: 'bg-rose-100 text-rose-800',
  Late: 'bg-amber-100 text-amber-800',
  Leave: 'bg-sky-100 text-sky-800',
};

const FamilyDashboard = () => {
  const getTabFromHash = () => {
    const hash = window.location.hash.replace('#/', '');
    const validTabs = ['dashboard', 'children', 'attendance', 'marks', 'notices', 'fees', 'messages', 'profile', 'grievances', 'security'];
    if (hash && validTabs.includes(hash)) return hash;
    return null;
  };

  const [family, setFamily] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState({ id: '', request: 0 });
  const [attendanceChildId, setAttendanceChildId] = useState('');
  const [attendanceStartDate, setAttendanceStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [attendanceEndDate, setAttendanceEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const [feeChildId, setFeeChildId] = useState('');
  const [feeData, setFeeData] = useState(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState('');
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromHash = getTabFromHash();
    if (tabFromHash) return tabFromHash;
    return localStorage.getItem('familyActiveTab') || 'dashboard';
  });

  useEffect(() => {
    const tabFromHash = getTabFromHash();
    const initialTab = tabFromHash || activeTab;
    const pageUrl = `${window.location.pathname}#/${initialTab}`;
    window.history.replaceState({ tab: initialTab, sentinel: 0 }, '', pageUrl);
    for (let i = 1; i <= 20; i++) {
      window.history.pushState({ tab: initialTab, sentinel: i }, '', pageUrl);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('familyActiveTab', activeTab);
    window.history.pushState({ tab: activeTab }, '', `${window.location.pathname}#/${activeTab}`);
  }, [activeTab]);

  useEffect(() => {
    const fetchFamilyProfile = async () => {
      try {
        const res = await apiClient.get('/families/me');
        setFamily(res.data.family);
      } catch (error) {
        console.error('Failed to load family profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFamilyProfile();
  }, []);

  useEffect(() => {
    apiClient.get('/messages/contacts')
      .then((res) => setContacts(res.data.contacts || []))
      .catch((error) => console.error('Failed to load school contacts:', error));
  }, []);

  useEffect(() => {
    const firstChildId = getFamilyChildId(family?.children?.[0]);
    if (!firstChildId) return;
    setAttendanceChildId(current => current || firstChildId);
    setFeeChildId(current => current || firstChildId);
  }, [family]);

  useEffect(() => {
    if (activeTab !== 'attendance' || !attendanceChildId) return undefined;

    let active = true;
    setAttendanceLoading(true);
    setAttendanceError('');
    apiClient.get(`/families/me/children/${attendanceChildId}/attendance`, {
      params: { startDate: attendanceStartDate, endDate: attendanceEndDate },
    })
      .then(res => {
        if (active) setAttendanceData(res.data);
      })
      .catch(error => {
        if (active) setAttendanceError(error.response?.data?.message || 'Could not load attendance records.');
      })
      .finally(() => {
        if (active) setAttendanceLoading(false);
      });

    return () => { active = false; };
  }, [activeTab, attendanceChildId, attendanceStartDate, attendanceEndDate]);

  useEffect(() => {
    if (activeTab !== 'fees' || !feeChildId) return undefined;

    let active = true;
    setFeeLoading(true);
    setFeeError('');
    apiClient.get(`/families/me/children/${feeChildId}/fees`)
      .then(res => {
        if (active) setFeeData(res.data);
      })
      .catch(error => {
        if (active) setFeeError(error.response?.data?.message || 'Could not load fee history.');
      })
      .finally(() => {
        if (active) setFeeLoading(false);
      });

    return () => { active = false; };
  }, [activeTab, feeChildId]);

  const openMessages = (contactId = '') => {
    if (contactId) {
      setMessageTarget(previous => ({ id: contactId, request: previous.request + 1 }));
    }
    setActiveTab('messages');
    setIsSidebarOpen(false);
  };

  const responsibilities = useMemo(
    () =>
      family?.responsibilities?.length
        ? family.responsibilities
        : [
            'Link one or more children to the family profile.',
            'View attendance, marks, report cards, conduct, and teacher comments.',
            'Receive absence, result, fee, and event notifications by app or SMS.',
            'Send an absence reason for the homeroom teacher to approve.',
            'Message the homeroom teacher and request meetings.',
            'Pay fees and see receipts.',
            'See mock exam schedules, results, and weak topics.',
          ],
    [family]
  );

  const stats = [
    { label: 'Linked children', value: family?.children?.length || 0, icon: Users },
    { label: 'Attendance', value: 'Live', icon: CheckCircle2 },
    { label: 'Marks', value: 'Updated', icon: BookOpen },
    { label: 'Notifications', value: 'Active', icon: Bell },
  ];

  const navGroups = [
    {
      title: 'Overview',
      items: [
        ['dashboard', 'Dashboard Overview', LayoutGrid],
        ['children', 'My Children', Users],
      ],
    },
    {
      title: 'School activity',
      items: [
        ['attendance', 'Attendance & Absence', CheckCircle2],
        ['marks', 'Marks & Report Card', BookOpen],
        ['notices', 'Notice Board', Bell],
        ['fees', 'Fees & Payments', DollarSign],
      ],
    },
    {
      title: 'Communication',
      items: [
        ['messages', 'Messages', MessageSquare],
        ['grievances', 'Grievance / Concern', ShieldCheck],
      ],
    },
    {
      title: 'Account',
      items: [
        ['profile', 'Family Profile', User],
        ['security', 'Security', Lock],
      ],
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4ecdf] text-[#3f2a1d]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[#7a4e2d]" />
          <p className="mt-4 font-semibold text-[#7a4e2d]">Loading family profile...</p>
        </div>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4ecdf] text-[#3f2a1d]">
        <div className="rounded-3xl border border-[#d9c5b0] bg-[#fffaf3] p-8 text-center shadow-sm">
          <p className="text-xl font-black">Family profile not found</p>
          <p className="mt-2 text-sm text-[#8a6a50]">Please contact the school admin to link your children.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4ecdf] flex flex-col md:flex-row text-[#3f2a1d]">
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#fffaf3] border-r border-[#d9c5b0] transform transition-transform duration-300 ease-in-out p-5 flex flex-col justify-between shadow-2xl md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:-ml-64'} shrink-0`}>
        <div className="space-y-6 flex-1 overflow-y-auto pr-1">
          <div className="flex items-center justify-between border-b border-[#d9c5b0]/30 pb-4">
            <div>
              <h2 className="text-lg font-black tracking-wide text-[#7a4e2d]">SCHOOL PORTAL</h2>
              <p className="text-[10px] font-bold uppercase text-[#8a6a50]">Family Desk</p>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden rounded-full p-1.5 text-[#7a4e2d] hover:bg-[#7a4e2d]/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            {navGroups.map((group) => (
              <div key={group.title}>
                <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-[#8a6a50]">{group.title}</p>
                <div className="space-y-1">
                  {group.items.map(([id, label, Icon]) => (
                    <button
                      key={id}
                      onClick={() => {
                        setActiveTab(id);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${activeTab === id ? 'bg-[#7a4e2d] text-[#f7efe4]' : 'text-[#6d4c35] hover:bg-[#7a4e2d]/10'}`}
                    >
                      <Icon className="h-4 w-4" /> {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 z-45 bg-black/35 backdrop-blur-xs md:hidden" />
      )}

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 max-h-screen flex flex-col">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="rounded-xl border border-[#d9c5b0] bg-white p-2.5 text-[#7a4e2d] shadow-sm transition hover:bg-[#7a4e2d]/10"
              title="Toggle Sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex flex-1 flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#f5d9b3] to-[#f7efe4] p-3.5 shadow-sm">
              <h1 className="text-sm font-black uppercase tracking-tight text-[#3f2a1d] md:text-base">Welcome, {family.name}</h1>
              <div className="rounded-full bg-[#7a4e2d] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f7efe4]">
                Family ID: {family.familyId}
              </div>
            </div>
            <MessageNotifications
              onOpenMessages={() => openMessages()}
              onOpenConversation={openMessages}
            />
          </div>

          {activeTab === 'messages' && (
            <MessagingPanel messageTarget={messageTarget} contacts={contacts} />
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-4">
                {stats.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-[1.5rem] border border-[#d9c5b0] bg-[#fffaf3] p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a6a50]">{label}</p>
                      <Icon className="h-4 w-4 text-[#7a4e2d]" />
                    </div>
                    <p className="mt-4 text-2xl font-black text-[#3f2a1d]">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-[#7a4e2d]" />
                    <h2 className="text-xl font-black text-[#3f2a1d]">Linked children</h2>
                  </div>

                  <div className="mt-5 space-y-4">
                    {family.children?.length ? (
                      family.children.map((child) => (
                        <div key={child.studentId?._id || child.studentId} className="rounded-2xl border border-[#d9c5b0] bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-black text-[#3f2a1d]">{child.studentName || 'Student'}</p>
                              <p className="text-sm text-[#8a6a50]">{child.studentClass || 'Class not assigned'}</p>
                            </div>
                            <span className="rounded-full bg-[#7a4e2d]/10 px-2 py-1 text-[10px] font-bold uppercase text-[#7a4e2d]">
                              {child.status || 'Active'}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3 text-sm text-[#6d4c35] sm:grid-cols-2">
                            <div className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-[#b68c67]" /> Admission: {child.admissionNumber || 'N/A'}</div>
                            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#b68c67]" /> Relation: {child.relation || 'Parent'}</div>
                            <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#b68c67]" /> Attendance: Updated daily</div>
                            <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-[#b68c67]" /> Communication: Enabled</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[#d9c5b0] bg-white/60 p-6 text-center text-sm text-[#8a6a50]">
                        No children have been linked to this family profile yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-[#7a4e2d]" />
                      <h2 className="text-xl font-black text-[#3f2a1d]">Family responsibilities</h2>
                    </div>

                    <ul className="mt-4 space-y-3">
                      {responsibilities.map((item) => (
                        <li key={item} className="flex items-start gap-3 rounded-xl border border-[#d9c5b0]/70 bg-white p-3 text-sm text-[#6d4c35]">
                          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#7a4e2d]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-[#7a4e2d]" />
                      <h2 className="text-xl font-black text-[#3f2a1d]">Contact information</h2>
                    </div>

                    <div className="mt-4 space-y-3 text-sm text-[#6d4c35]">
                      <p><span className="font-semibold text-[#3f2a1d]">Primary email:</span> {family.email}</p>
                      <p><span className="font-semibold text-[#3f2a1d]">Phone:</span> {family.phone || 'Not set'}</p>
                      <p><span className="font-semibold text-[#3f2a1d]">School:</span> {family.schoolName || 'School not available'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'children' && (
            <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-[#7a4e2d]" />
                <h2 className="text-xl font-black text-[#3f2a1d]">My children</h2>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {family.children?.length ? (
                  family.children.map((child) => (
                    <div key={child.studentId?._id || child.studentId} className="rounded-2xl border border-[#d9c5b0] bg-white p-5">
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-black text-[#3f2a1d]">{child.studentName || 'Student'}</p>
                        <span className="rounded-full bg-[#7a4e2d]/10 px-2 py-1 text-[10px] font-bold uppercase text-[#7a4e2d]">{child.status || 'Active'}</span>
                      </div>
                      <div className="mt-4 space-y-2 text-sm text-[#6d4c35]">
                        <p><span className="font-semibold text-[#3f2a1d]">Class:</span> {child.studentClass || 'Not assigned'}</p>
                        <p><span className="font-semibold text-[#3f2a1d]">Admission:</span> {child.admissionNumber || 'N/A'}</p>
                        <p><span className="font-semibold text-[#3f2a1d]">Relation:</span> {child.relation || 'Parent'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="md:col-span-2 rounded-2xl border border-dashed border-[#d9c5b0] bg-white/60 p-6 text-center text-sm text-[#8a6a50]">
                    No children linked yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#7a4e2d]" />
                  <div>
                    <h2 className="text-xl font-black text-[#3f2a1d]">Attendance & absence</h2>
                    <p className="mt-1 text-xs text-[#8a6a50]">Review daily attendance for each linked child.</p>
                  </div>
                </div>
                <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto">
                  <select
                    value={attendanceChildId}
                    onChange={event => setAttendanceChildId(event.target.value)}
                    className="rounded-xl border border-[#d9c5b0] bg-white px-3 py-2 text-sm text-[#3f2a1d] outline-none focus:border-[#7a4e2d]"
                  >
                    {family.children?.map(child => {
                      const childId = getFamilyChildId(child);
                      return <option key={childId} value={childId}>{child.studentName || child.studentId?.name || 'Student'}</option>;
                    })}
                  </select>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-[#8a6a50]">
                    From
                    <input
                      type="date"
                      value={attendanceStartDate}
                      max={attendanceEndDate}
                      onChange={event => setAttendanceStartDate(event.target.value)}
                      className="mt-1 block w-full rounded-xl border border-[#d9c5b0] bg-white px-3 py-2 text-sm font-normal text-[#3f2a1d] outline-none focus:border-[#7a4e2d]"
                    />
                  </label>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-[#8a6a50]">
                    To
                    <input
                      type="date"
                      value={attendanceEndDate}
                      min={attendanceStartDate}
                      onChange={event => setAttendanceEndDate(event.target.value)}
                      className="mt-1 block w-full rounded-xl border border-[#d9c5b0] bg-white px-3 py-2 text-sm font-normal text-[#3f2a1d] outline-none focus:border-[#7a4e2d]"
                    />
                  </label>
                </div>
              </div>

              {attendanceError && <p className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{attendanceError}</p>}

              {family.children?.length ? (
                <>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                      ['Attendance rate', `${attendanceData?.stats?.percentage || '0.0'}%`],
                      ['Present', attendanceData?.stats?.present || 0],
                      ['Absent', attendanceData?.stats?.absent || 0],
                      ['Late', attendanceData?.stats?.late || 0],
                      ['Records', attendanceData?.stats?.total || 0],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-[#d9c5b0] bg-white p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[#8a6a50]">{label}</p>
                        <p className="mt-2 text-xl font-black text-[#3f2a1d]">{attendanceLoading ? '...' : value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 overflow-x-auto rounded-2xl border border-[#d9c5b0] bg-white">
                    <table className="w-full min-w-[620px] text-left text-sm">
                      <thead className="bg-[#f4ecdf] text-[10px] uppercase tracking-wide text-[#6d4c35]">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Subject / period</th>
                          <th className="px-4 py-3">Teacher</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f4ecdf] text-[#6d4c35]">
                        {attendanceLoading ? (
                          <tr><td colSpan="5" className="p-8 text-center text-[#8a6a50]">Loading attendance...</td></tr>
                        ) : attendanceData?.records?.length ? (
                          attendanceData.records.map(record => (
                            <tr key={record._id}>
                              <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#3f2a1d]">{new Date(record.date).toLocaleDateString()}</td>
                              <td className="px-4 py-3">
                                <p className="font-semibold text-[#3f2a1d]">{record.subjectId?.name || 'General'}</p>
                                {record.periodStartTime && <p className="text-xs text-[#8a6a50]">{record.periodStartTime} - {record.periodEndTime}</p>}
                              </td>
                              <td className="px-4 py-3">{record.teacherId?.name || 'School staff'}</td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${attendanceStatusStyles[record.status] || 'bg-gray-100 text-gray-700'}`}>
                                  {record.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">{record.remarks || '—'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan="5" className="p-8 text-center text-sm text-[#8a6a50]">No attendance records for this child and date range.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-[#d9c5b0] bg-white/60 p-6 text-center text-sm text-[#8a6a50]">
                  No children are linked to this family profile yet.
                </div>
              )}
            </div>
          )}

          {activeTab === 'marks' && (
            <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-[#7a4e2d]" />
                <h2 className="text-xl font-black text-[#3f2a1d]">Marks & report cards</h2>
              </div>

              <div className="mt-6 space-y-3">
                {family.children?.length ? (
                  family.children.slice(0, 2).map((child, index) => (
                    <div key={child.studentId?._id || child.studentId || index} className="rounded-2xl border border-[#d9c5b0] bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-base font-black text-[#3f2a1d]">{child.studentName || 'Student'} report</p>
                        <span className="rounded-full bg-[#7a4e2d]/10 px-2 py-1 text-[10px] font-bold uppercase text-[#7a4e2d]">Updated</span>
                      </div>
                      <div className="mt-3 grid gap-3 text-sm text-[#6d4c35] sm:grid-cols-3">
                        <p><span className="font-semibold text-[#3f2a1d]">Math:</span> 86%</p>
                        <p><span className="font-semibold text-[#3f2a1d]">Science:</span> 82%</p>
                        <p><span className="font-semibold text-[#3f2a1d]">Average:</span> 84%</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#d9c5b0] bg-white/60 p-6 text-center text-sm text-[#8a6a50]">
                    No child marks available yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notices' && (
            <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-[#7a4e2d]" />
                <h2 className="text-xl font-black text-[#3f2a1d]">Notice board</h2>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  'Parent orientation meeting scheduled for Saturday at 10:00 AM.',
                  'Annual science exhibition registration closes this Friday.',
                  'School transport update has been published for bus route changes.',
                ].map((item, index) => (
                  <div key={item} className="rounded-2xl border border-[#d9c5b0] bg-white p-4 text-sm text-[#6d4c35]">
                    <p className="font-bold text-[#3f2a1d]">{index === 0 ? 'Important' : 'Update'}</p>
                    <p className="mt-2">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'fees' && (
            <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-[#7a4e2d]" />
                  <div>
                    <h2 className="text-xl font-black text-[#3f2a1d]">Fees & payment history</h2>
                    <p className="mt-1 text-xs text-[#8a6a50]">View installment status and recorded payment dates.</p>
                  </div>
                </div>
                <select
                  value={feeChildId}
                  onChange={event => setFeeChildId(event.target.value)}
                  className="w-full rounded-xl border border-[#d9c5b0] bg-white px-3 py-2 text-sm text-[#3f2a1d] outline-none focus:border-[#7a4e2d] sm:w-auto"
                >
                  {family.children?.map(child => {
                    const childId = getFamilyChildId(child);
                    return <option key={childId} value={childId}>{child.studentName || child.studentId?.name || 'Student'}</option>;
                  })}
                </select>
              </div>

              {feeError && <p className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{feeError}</p>}

              {!family.children?.length ? (
                <div className="mt-6 rounded-2xl border border-dashed border-[#d9c5b0] bg-white/60 p-6 text-center text-sm text-[#8a6a50]">
                  No children are linked to this family profile yet.
                </div>
              ) : feeLoading ? (
                <div className="mt-6 rounded-2xl border border-[#d9c5b0] bg-white p-8 text-center text-sm text-[#8a6a50]">Loading fee history...</div>
              ) : feeData?.structure ? (() => {
                const structure = feeData.structure;
                const record = feeData.fee;
                const installmentCount = Math.max(1, Number(structure.totalInstallments || 4));
                const totalAmount = Number(structure.totalAmount || 0);
                const installments = Array.from({ length: installmentCount }, (_, index) => {
                  const installmentNumber = index + 1;
                  const isPaid = record?.paidInstallments?.includes(installmentNumber) ||
                    (installmentNumber <= 4 && record?.[`q${installmentNumber}Status`] === 'Paid');
                  const paidDate = record?.paidDates?.[String(installmentNumber)] ||
                    (installmentNumber <= 4 ? record?.[`q${installmentNumber}PaidDate`] : null);
                  return { installmentNumber, isPaid, paidDate };
                });
                const paidCount = installments.filter(installment => installment.isPaid).length;
                const paidAmount = totalAmount * (paidCount / installmentCount);
                const formatCurrency = amount => `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

                return (
                  <>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        ['Academic year', structure.academicYear || 'Current'],
                        ['Annual total', formatCurrency(totalAmount)],
                        ['Paid', formatCurrency(paidAmount)],
                        ['Balance', formatCurrency(Math.max(0, totalAmount - paidAmount))],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-[#d9c5b0] bg-white p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[#8a6a50]">{label}</p>
                          <p className="mt-2 text-lg font-black text-[#3f2a1d]">{feeLoading ? '...' : value}</p>
                        </div>
                      ))}
                    </div>

                    {!record && <p className="mt-4 text-xs text-[#8a6a50]">No payment tracker has been created yet; all installments are shown as pending.</p>}

                    <div className="mt-5 overflow-x-auto rounded-2xl border border-[#d9c5b0] bg-white">
                      <table className="w-full min-w-[480px] text-left text-sm">
                        <thead className="bg-[#f4ecdf] text-[10px] uppercase tracking-wide text-[#6d4c35]">
                          <tr>
                            <th className="px-4 py-3">Installment</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Payment date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f4ecdf] text-[#6d4c35]">
                          {installments.map(installment => (
                            <tr key={installment.installmentNumber}>
                              <td className="px-4 py-3 font-semibold text-[#3f2a1d]">Term {installment.installmentNumber}</td>
                              <td className="px-4 py-3">{formatCurrency(totalAmount / installmentCount)}</td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${installment.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {installment.isPaid ? 'Paid' : 'Pending'}
                                </span>
                              </td>
                              <td className="px-4 py-3">{installment.paidDate ? new Date(installment.paidDate).toLocaleDateString() : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })() : (
                <div className="mt-6 rounded-2xl border border-dashed border-[#d9c5b0] bg-white/60 p-6 text-center text-sm text-[#8a6a50]">
                  No fee structure has been configured for this child’s class yet.
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-[#7a4e2d]" />
                <h2 className="text-xl font-black text-[#3f2a1d]">Family profile</h2>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[#d9c5b0] bg-white p-5 text-sm text-[#6d4c35]">
                  <p><span className="font-semibold text-[#3f2a1d]">Name:</span> {family.name}</p>
                  <p className="mt-2"><span className="font-semibold text-[#3f2a1d]">Email:</span> {family.email}</p>
                  <p className="mt-2"><span className="font-semibold text-[#3f2a1d]">Phone:</span> {family.phone || 'Not provided'}</p>
                </div>

                <div className="rounded-2xl border border-[#d9c5b0] bg-white p-5 text-sm text-[#6d4c35]">
                  <p><span className="font-semibold text-[#3f2a1d]">School:</span> {family.schoolName || 'Not available'}</p>
                  <p className="mt-2"><span className="font-semibold text-[#3f2a1d]">Preferred contact:</span> {family.preferredContact?.email || family.email}</p>
                  <p className="mt-2"><span className="font-semibold text-[#3f2a1d]">Relationship:</span> {family.relationshipToStudent || 'Parent'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'grievances' && (
            <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[#7a4e2d]" />
                <h2 className="text-xl font-black text-[#3f2a1d]">Grievance / concern</h2>
              </div>

              <div className="mt-6 rounded-2xl border border-[#d9c5b0] bg-white p-5 text-sm text-[#6d4c35]">
                Please raise concerns about fees, transport, classrooms, or academic support. The school admin will review and respond promptly.
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-[#7a4e2d]" />
                <h2 className="text-xl font-black text-[#3f2a1d]">Account security</h2>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[#d9c5b0] bg-white p-5 text-sm text-[#6d4c35]">
                  <p className="font-semibold text-[#3f2a1d]">Password status</p>
                  <p className="mt-2">Last changed recently. Keep your credentials safe and private.</p>
                </div>

                <div className="rounded-2xl border border-[#d9c5b0] bg-white p-5 text-sm text-[#6d4c35]">
                  <p className="font-semibold text-[#3f2a1d]">Alerts</p>
                  <p className="mt-2">SMS and app notifications are enabled for attendance, fee, and result updates.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FamilyDashboard;
