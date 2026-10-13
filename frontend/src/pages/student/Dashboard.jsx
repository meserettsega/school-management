import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, BookOpen, CheckCircle, Clock, ClipboardList, LayoutGrid, 
  MessageSquare, Sparkles, Lock, User, FileText, Send, Image, History, 
  MapPin, Phone, ShieldAlert, BookOpenCheck, Bell, Menu, X, DollarSign, Calendar 
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import apiClient from '../../utils/apiClient';
import { openProxiedFile } from '../../utils/fileProxy';
import NationalExamCenter from '../../components/NationalExamCenter';
import DashboardAnalytics from '../../components/DashboardAnalytics';

const StudentDashboard = () => {
  const [profileData, setProfileData] = useState(null);
  const [myGrievances, setMyGrievances] = useState([]);
  const [studentHomework, setStudentHomework] = useState([]);
  const [attendanceData, setAttendanceData] = useState(null);
  const [notices, setNotices] = useState([]);
  const [studentMarks, setStudentMarks] = useState([]);
  const [homeworkIssues, setHomeworkIssues] = useState({});
  const [uploadingHomeworkId, setUploadingHomeworkId] = useState(null);
  const getTabFromHash = () => {
    const hash = window.location.hash.replace('#/', '');
    const validTabs = ['dashboard', 'homework', 'attendance', 'notices', 'timetable', 'marks', 'fees', 'national-exams', 'profile', 'grievances', 'security'];
    if (hash && validTabs.includes(hash)) {
      return hash;
    }
    return null;
  };

  const [activeSubTab, setActiveSubTab] = useState(() => {
    const tabFromHash = getTabFromHash();
    if (tabFromHash) return tabFromHash;
    return localStorage.getItem('studentActiveTab') || 'dashboard';
  });

  useEffect(() => {
    // Ensure hash is set on initial mount
    const tabFromHash = getTabFromHash();
    const initialTab = tabFromHash || activeSubTab;
    const pageUrl = `${window.location.pathname}#/${initialTab}`;
    window.history.replaceState({ tab: initialTab, sentinel: 0 }, '', pageUrl);
    // Fill the history stack with 30 sentinel entries so the back button
    // can never escape to Google or any external page
    for (let i = 1; i <= 30; i++) {
      window.history.pushState({ tab: initialTab, sentinel: i }, '', pageUrl);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem('studentActiveTab', activeSubTab);
    // Keep hash in sync when tab changes programmatically
    window.history.pushState({ tab: activeSubTab }, '', `${window.location.pathname}#/${activeSubTab}`);
  }, [activeSubTab]);

  useEffect(() => {
    const handlePopState = (e) => {
      const pageUrl = `${window.location.pathname}#/${activeSubTab}`;
      // Replenish sentinel stack — push 5 entries back each time to keep the buffer deep
      for (let i = 0; i < 5; i++) {
        window.history.pushState({ tab: activeSubTab, sentinel: i }, '', pageUrl);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeSubTab]);
  const [loading, setLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [classTimetable, setClassTimetable] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [feeRecord, setFeeRecord] = useState(null);
  const [feeStructure, setFeeStructure] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPayingFee, setIsPayingFee] = useState(false);

  // Password change states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Grievance form states
  const [grievanceTitle, setGrievanceTitle] = useState('');
  const [grievanceDescription, setGrievanceDescription] = useState('');
  const [grievanceCategory, setGrievanceCategory] = useState('Facilities');
  const [grievancePriority, setGrievancePriority] = useState('Medium');
  const [grievancePhoto, setGrievancePhoto] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const stats = [
    { icon: CheckCircle, title: 'Attendance', value: attendanceData?.stats?.percentage ? `${attendanceData.stats.percentage}%` : '0%', tone: 'bg-emerald-500/10 text-emerald-700' },
    { icon: BookOpen, title: 'Average Marks', value: dashboardStats?.averageMarks !== undefined ? `${dashboardStats.averageMarks}%` : '0%', tone: 'bg-sky-500/10 text-sky-700' },
    { icon: Clock, title: 'Pending Homework', value: String(studentHomework.filter(hw => !hw.submissions?.some(s => s.studentId === profileData?._id || s.studentId?._id === profileData?._id)).length), tone: 'bg-amber-500/10 text-amber-700' },
    { icon: AlertCircle, title: 'Upcoming Exams', value: dashboardStats?.upcomingExams !== undefined ? String(dashboardStats.upcomingExams) : '0', tone: 'bg-rose-500/10 text-rose-700' },
  ];

  const marksBySubject = Object.entries(studentMarks.reduce((scores, mark) => {
    const subject = mark.subjectId?.name || 'Other';
    const percentage = Number(mark.percentage) || (Number(mark.outOfMarks) ? (Number(mark.marks || 0) / Number(mark.outOfMarks)) * 100 : 0);
    if (!scores[subject]) scores[subject] = { total: 0, count: 0 };
    scores[subject].total += percentage;
    scores[subject].count += 1;
    return scores;
  }, {})).map(([name, score]) => ({ name, value: Math.round(score.total / score.count) }));
  const attendanceBreakdown = attendanceData?.stats
    ? [
        { name: 'Present', value: Number(attendanceData.stats.present) || 0 },
        { name: 'Absent', value: Number(attendanceData.stats.absent) || 0 },
        { name: 'Other', value: Math.max(0, Number(attendanceData.stats.total || 0) - Number(attendanceData.stats.present || 0) - Number(attendanceData.stats.absent || 0)) },
      ].filter(item => item.value > 0)
    : [];

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const resProfile = await apiClient.get('/auth/profile');
      setProfileData(resProfile.data.user || null);

      const resStats = await apiClient.get('/dashboard/student').catch(() => ({ data: { stats: {} } }));
      setDashboardStats(resStats.data.stats || null);

      const resGrievances = await apiClient.get('/complaints/my');
      setMyGrievances(resGrievances.data.complaints || []);

      const resHomework = await apiClient.get('/homework/student').catch(() => ({ data: { homework: [] } }));
      setStudentHomework(resHomework.data.homework || []);

      const resAttendance = await apiClient.get('/attendance/student/my').catch(() => ({ data: { grouped: {}, stats: { percentage: 0, present: 0, absent: 0, total: 0 } } }));
      setAttendanceData(resAttendance.data || null);

      const resNotices = await apiClient.get('/notices/user/notices?limit=100').catch(() => ({ data: { notices: [] } }));
      setNotices(resNotices.data.notices || []);

      const resMarks = await apiClient.get(`/marks/student/${resProfile.data.user._id}`).catch(() => ({ data: { marks: [] } }));
      setStudentMarks(resMarks.data.marks || []);

      const resSubjects = await apiClient.get('/subjects').catch(() => ({ data: { subjects: [] } }));
      setSubjects(resSubjects.data.subjects || []);

      const resFee = await apiClient.get('/fees/my-fee').catch(() => ({ data: { fee: null, structure: null } }));
      setFeeRecord(resFee.data.fee || null);
      setFeeStructure(resFee.data.structure || null);

      if (resProfile.data.user?.classId?._id || resProfile.data.user?.classId) {
        const classId = resProfile.data.user.classId._id || resProfile.data.user.classId;
        const resTimetable = await apiClient.get(`/timetables/class/${classId}`).catch(() => ({ data: { timetables: [] } }));
        setClassTimetable(resTimetable.data.timetables || []);
      }
    } catch (err) {
      console.error('Error fetching student details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayQuarter = async (quarter) => {
    try {
      setIsPayingFee(true);
      const res = await apiClient.post('/fees/pay-quarter', { quarter });
      toast.success(`${quarter.toUpperCase()} payment successful!`);
      setFeeRecord(res.data.fee || null);
      setFeeStructure(res.data.structure || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed.');
    } finally {
      setIsPayingFee(false);
    }
  };

  const handlePayFull = async () => {
    try {
      setIsPayingFee(true);
      const res = await apiClient.post('/fees/pay-full');
      toast.success('Full fees payment successful!');
      setFeeRecord(res.data.fee || null);
      setFeeStructure(res.data.structure || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed.');
    } finally {
      setIsPayingFee(false);
    }
  };

  const handleHomeworkUpload = async (e, homeworkId) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target', 'homework-submission');

    setUploadingHomeworkId(homeworkId);
    try {
      const resUpload = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fileUrl = resUpload.data.url;

      await apiClient.post(`/homework/${homeworkId}/submit`, { fileUrl });
      toast.success('Homework submitted successfully!');
      fetchStudentData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Homework submission failed.');
    } finally {
      setUploadingHomeworkId(null);
    }
  };

  const handleHomeworkIssueSubmit = async (homeworkId) => {
    const issue = homeworkIssues[homeworkId];
    if (!issue || !issue.trim()) {
      toast.error('Please enter a proper issue/reason.');
      return;
    }

    try {
      await apiClient.post(`/homework/${homeworkId}/submit`, {
        reasonForMissing: issue
      });
      toast.success('Reason submitted successfully!');
      setHomeworkIssues(prev => ({ ...prev, [homeworkId]: '' }));
      fetchStudentData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit reason.');
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    const pwd = newPassword || '';
    const isValid = pwd.length >= 6 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);
    if (!isValid) {
      setError('Password must be at least 6 characters, contain 1 capital letter, 1 number, and 1 special character');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/change-password', {
        oldPassword,
        newPassword
      });
      setSuccess('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target', 'complaint');

    setUploadingPhoto(true);
    try {
      const res = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setGrievancePhoto(res.data.url);
      toast.success('Photo uploaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Photo upload failed.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRaiseGrievance = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/complaints', {
        title: grievanceTitle,
        description: grievanceDescription,
        category: grievanceCategory,
        priority: grievancePriority,
        attachments: grievancePhoto ? [grievancePhoto] : [],
      });
      toast.success('Grievance raised successfully!');
      setGrievanceTitle('');
      setGrievanceDescription('');
      setGrievancePhoto('');
      fetchStudentData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to raise grievance');
    }
  };

  return (
    <div className="dashboard-shell min-h-screen bg-[#f4ecdf] flex flex-col md:flex-row text-[#3f2a1d]">
      <Toaster position="top-right" />
      
      {/* Sidebar Navigation */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#fffaf3] border-r border-[#d9c5b0] transform transition-transform duration-300 ease-in-out p-5 flex flex-col justify-between shadow-2xl md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:-ml-64'} shrink-0`}>
        <div className="space-y-6 flex-1 overflow-y-auto pr-1">
          <div className="flex items-center justify-between border-b border-[#d9c5b0]/30 pb-4">
            <div>
              <h2 className="font-black text-[#7a4e2d] tracking-wide text-lg">SCHOOL PORTAL</h2>
              <p className="text-[10px] text-[#8a6a50] font-bold uppercase">Student Desk</p>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden rounded-full p-1.5 hover:bg-[#7a4e2d]/10 text-[#7a4e2d]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[10px] text-[#8a6a50] font-bold uppercase tracking-wider mb-2 px-2">Directories</p>
              <div className="space-y-1">
                {[
                  ['dashboard', 'Dashboard Overview', LayoutGrid],
                ].map(([id, label, Icon]) => (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveSubTab(id);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeSubTab === id ? 'bg-[#7a4e2d] text-[#f7efe4]' : 'text-[#6d4c35] hover:bg-[#7a4e2d]/10'}`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-[#8a6a50] font-bold uppercase tracking-wider mb-2 px-2">Academics</p>
              <div className="space-y-1">
                {[
                  ['homework', 'My Homework', ClipboardList],
                  ['attendance', 'Roster & Attendance', CheckCircle],
                  ['notices', 'Notice Board', Bell],
                  ['timetable', 'My Class Timetable', Calendar],
                  ['national-exams', 'National Exam Practice', ClipboardList],
                ].map(([id, label, Icon]) => (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveSubTab(id);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeSubTab === id ? 'bg-[#7a4e2d] text-[#f7efe4]' : 'text-[#6d4c35] hover:bg-[#7a4e2d]/10'}`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-[#8a6a50] font-bold uppercase tracking-wider mb-2 px-2">Academic Marks</p>
              <div className="space-y-1 pl-2 border-l border-[#d9c5b0]/45 ml-2">
                <button
                  onClick={() => {
                    setActiveSubTab('marks');
                    setSelectedSubjectId('');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full text-left block px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    activeSubTab === 'marks' && !selectedSubjectId
                      ? 'bg-[#7a4e2d] text-[#f7efe4]' 
                      : 'text-[#6d4c35] hover:bg-[#7a4e2d]/10'
                  }`}
                >
                  📊 All Subjects Report Card
                </button>

                {(() => {
                  const studentClassStd = profileData?.classId?.standard?.toString();
                  const studentSubjects = subjects.filter(sub => sub.standard?.toString() === studentClassStd);
                  return studentSubjects.map((sub) => {
                    const isSelected = activeSubTab === 'marks' && selectedSubjectId === sub._id;
                    return (
                      <button
                        key={sub._id}
                        onClick={() => {
                          setActiveSubTab('marks');
                          setSelectedSubjectId(sub._id);
                          setIsSidebarOpen(false);
                        }}
                        className={`w-full text-left block px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          isSelected 
                            ? 'bg-[#7a4e2d] text-[#f7efe4]' 
                            : 'text-[#6d4c35] hover:bg-[#7a4e2d]/10'
                        }`}
                      >
                        📝 {sub.name}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-[#8a6a50] font-bold uppercase tracking-wider mb-2 px-2">Payments</p>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setActiveSubTab('fees');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'fees' ? 'bg-[#7a4e2d] text-[#f7efe4]' : 'text-[#6d4c35] hover:bg-[#7a4e2d]/10'}`}
                >
                  <DollarSign className="h-4 w-4" /> Fees & Payments
                </button>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-[#8a6a50] font-bold uppercase tracking-wider mb-2 px-2">Account & security</p>
              <div className="space-y-1">
                {[
                  ['profile', 'My Detailed Profile', User],
                  ['grievances', 'Raise Grievance / Complaint', ShieldAlert],
                  ['security', 'Account Security', Lock],
                ].map(([id, label, Icon]) => (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveSubTab(id);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeSubTab === id ? 'bg-[#7a4e2d] text-[#f7efe4]' : 'text-[#6d4c35] hover:bg-[#7a4e2d]/10'}`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 z-45 bg-black/35 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 max-h-screen flex flex-col">
        <div className="max-w-7xl mx-auto space-y-6 w-full flex-1">
          {/* Top Header Row with Hamburger Trigger */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="rounded-xl border border-[#d9c5b0] bg-white p-2.5 text-[#7a4e2d] hover:bg-[#7a4e2d]/10 transition shadow-sm"
              title="Toggle Sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="dashboard-header flex-1 rounded-2xl bg-gradient-hero p-3.5 text-[#3f2a1d] shadow-sm flex justify-between items-center flex-wrap gap-4">
              <h1 className="text-sm md:text-base font-black tracking-tight uppercase">Welcome, {profileData?.name || 'Student'}</h1>
            </div>
          </div>

        {/* TAB 1: OVERVIEW */}
        {activeSubTab === 'national-exams' && <NationalExamCenter />}

        {activeSubTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {stats.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-[1.75rem] border border-[#d9c5b0] bg-[#fffaf3] p-5 shadow-sm">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-[#7f634e]">{item.title}</p>
                    <p className="mt-1 text-3xl font-black text-[#3f2a1d]">{item.value}</p>
                  </div>
                );
              })}
            </div>

            <DashboardAnalytics
              title="My learning analytics"
              description="Track your average subject scores and attendance record."
              barTitle="Average score by subject (%)"
              barData={marksBySubject}
              distributionTitle="Attendance breakdown"
              distributionData={attendanceBreakdown}
            />

            <div className="grid gap-6 lg:grid-cols-1">
              <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[#3f2a1d]">Today&apos;s focus</h2>
                    <p className="mt-1 text-sm text-[#7f634e]">A student should see only what is important.</p>
                  </div>
                  <Sparkles className="h-5 w-5 text-[#b68c67]" />
                </div>
                <div className="mt-5 space-y-4">
                  {[
                    'Mathematics homework is due tomorrow.',
                    'Science period starts at 11:00 AM.',
                    'Check the notice board for annual day practice.',
                  ].map((item) => (
                    <div key={item} className="rounded-2xl bg-[#f4ecdf] px-4 py-3 text-sm leading-6 text-[#6d4c35]">{item}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1.5: HOMEWORK */}
        {activeSubTab === 'homework' && (
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#3f2a1d]">My Homework Assignments</h2>
              <p className="mt-1 text-sm text-[#7f634e]">View class work assigned by your teachers. Upload files before the deadline, or submit explanations for late items.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {studentHomework.length > 0 ? (
                studentHomework.map((hw) => {
                  const studentSubmission = hw.submissions?.find(
                    (s) => s.studentId?._id === profileData?._id || s.studentId === profileData?._id
                  );
                  const isPastDue = new Date() > new Date(hw.dueDate);

                  return (
                    <div key={hw._id} className="rounded-3xl border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm space-y-4 hover:shadow-md transition">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#7a4e2d]/10 text-[#7a4e2d]">
                            Subject: {hw.subjectId?.name || 'N/A'}
                          </span>
                          <h3 className="text-lg font-bold text-[#3f2a1d] mt-2">{hw.title}</h3>
                          <p className="text-xs text-[#8a6a50] mt-0.5">Assigned by: {hw.teacherId?.name || 'Teacher'}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            studentSubmission 
                              ? studentSubmission.status === 'Submitted' || studentSubmission.status === 'Late'
                                ? 'bg-emerald-500/10 text-emerald-700'
                                : 'bg-amber-500/10 text-amber-700'
                              : isPastDue
                                ? 'bg-rose-500/10 text-rose-700'
                                : 'bg-sky-500/10 text-sky-700'
                          }`}>
                            {studentSubmission 
                              ? studentSubmission.reasonForMissing
                                ? 'Excuse Logged'
                                : studentSubmission.status
                              : isPastDue
                                ? 'Missed'
                                : 'Pending'}
                          </span>
                          <p className="text-[10px] text-[#8a6a50] mt-1 font-bold">
                            Due: {new Date(hw.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="text-sm text-[#6d4c35] space-y-2 bg-[#f4ecdf] p-3 rounded-2xl">
                        <p><strong>Instructions:</strong> {hw.description || 'No description provided.'}</p>
                      </div>

                      {/* Submitted State */}
                      {studentSubmission && (
                        <div className="border-t border-[#f4ecdf] pt-3 space-y-2">
                          <p className="text-xs font-bold text-[#7a4e2d]">My Submission Detail:</p>
                          {studentSubmission.fileUrl && (
                            <p className="text-xs text-[#6d4c35]">
                              Submitted File:{' '}
                              <button
                                type="button"
                                onClick={() => openProxiedFile(studentSubmission.fileUrl)}
                                className="underline font-bold text-[#7a4e2d] hover:text-[#624021]"
                              >
                                View Document
                              </button>
                            </p>
                          )}
                          {studentSubmission.reasonForMissing && (
                            <p className="text-xs text-rose-700 italic">
                              <strong>Missed Deadline Excuse:</strong> {studentSubmission.reasonForMissing}
                            </p>
                          )}
                          {studentSubmission.submittedDate && (
                            <p className="text-[10px] text-[#8a6a50]">
                              Submitted On: {new Date(studentSubmission.submittedDate).toLocaleString()}
                            </p>
                          )}
                          {studentSubmission.marks !== undefined && (
                            <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 mt-2 text-xs">
                              <p className="font-bold text-emerald-800">Grade: {studentSubmission.marks} Marks</p>
                              {studentSubmission.feedback && <p className="text-emerald-700 mt-0.5">Teacher Feedback: {studentSubmission.feedback}</p>}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Submission (If not submitted/excused yet) */}
                      {!studentSubmission && (
                        <div className="border-t border-[#f4ecdf] pt-3">
                          {!isPastDue ? (
                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-[#6d4c35]">Upload Assignment File *</label>
                              <input
                                type="file"
                                onChange={(e) => handleHomeworkUpload(e, hw._id)}
                                disabled={uploadingHomeworkId === hw._id}
                                className="block w-full text-xs text-[#8a6a50] file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#7a4e2d]/10 file:text-[#7a4e2d] hover:file:bg-[#7a4e2d]/20"
                              />
                              {uploadingHomeworkId === hw._id && (
                                <p className="text-xs text-amber-600">Uploading and submitting...</p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-rose-700">Due date passed. Explain reason for missing *</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Type explanation why homework was missed..."
                                  value={homeworkIssues[hw._id] || ''}
                                  onChange={(e) => setHomeworkIssues(prev => ({ ...prev, [hw._id]: e.target.value }))}
                                  className="flex-1 rounded-xl border border-rose-300 bg-[#faf4ea] px-3 py-2 text-xs outline-none focus:border-rose-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleHomeworkIssueSubmit(hw._id)}
                                  className="bg-rose-600 hover:bg-rose-700 text-[#f7efe4] font-bold text-xs px-3 py-2 rounded-xl transition"
                                >
                                  Submit Reason
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 text-center py-10 text-[#8a6a50]">
                  No homework assignments found.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1.6: NOTICES */}
        {activeSubTab === 'notices' && (
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#3f2a1d]">School Notice Board</h2>
              <p className="mt-1 text-sm text-[#7f634e]">Stay updated with the latest events, exam schedules, achievements, and results.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {notices && notices.length > 0 ? (
                notices.map((notice) => {
                  const isPdf = notice.attachments?.[0]?.toLowerCase().endsWith('.pdf');
                  return (
                    <div key={notice._id} className="rounded-2xl border border-[#d9c5b0] bg-white p-5 shadow-sm space-y-3 relative hover:shadow-md transition">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex gap-2 flex-wrap items-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              notice.category === 'Event'
                                ? 'bg-sky-500/10 text-sky-700'
                                : notice.category === 'Achievement'
                                  ? 'bg-amber-500/10 text-amber-700'
                                  : notice.category === 'Exam'
                                    ? 'bg-rose-500/10 text-rose-700'
                                    : notice.category === 'Result'
                                      ? 'bg-emerald-500/10 text-emerald-700'
                                      : 'bg-gray-500/10 text-gray-700'
                            }`}>
                              {notice.category}
                            </span>
                            {notice.isPinned && (
                              <span className="bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-md">
                                Pinned
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-base text-[#3f2a1d] mt-1.5">{notice.title}</h3>
                          <p className="text-[10px] text-[#8a6a50] mt-0.5">By: {notice.createdBy?.name || 'Admin'} | To: {notice.targetAudience} | {new Date(notice.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <p className="text-xs text-[#6d4c35] bg-[#fffaf3] p-3 rounded-xl whitespace-pre-line">{notice.content}</p>
                      {notice.attachments && notice.attachments.length > 0 && notice.attachments[0] && (
                        <div className="pt-2">
                          <a
                            href={notice.attachments[0].includes('cloudinary.com') ? notice.attachments[0].replace('/upload/', '/upload/fl_attachment/') : notice.attachments[0]}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#7a4e2d] hover:underline"
                          >
                            <FileText className="h-4 w-4" /> Download Attached Document {isPdf ? '(PDF)' : ''}
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 text-center py-10 text-[#8a6a50]">
                  No notices published yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1.65: MARKS */}
        {activeSubTab === 'marks' && (
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#3f2a1d]">My Academic Marks</h2>
              <p className="mt-1 text-sm text-[#7f634e]">Review your exam results, subject scores, teacher feedback, and average performance status.</p>
            </div>

            {(() => {
              const filteredMarks = selectedSubjectId
                ? studentMarks.filter(m => (m.subjectId?._id || m.subjectId)?.toString() === selectedSubjectId.toString())
                : studentMarks;

              const totalObtained = filteredMarks.reduce((sum, m) => sum + Number(m.marks || 0), 0);
              const totalMax = filteredMarks.reduce((sum, m) => sum + Number(m.outOfMarks || 0), 0);
              const avgPercentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : '0.00';
              
              const passedCount = filteredMarks.filter(m => m.passStatus === 'Pass').length;
              const failedCount = filteredMarks.filter(m => m.passStatus === 'Fail').length;

              return (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-[1.75rem] border border-[#d9c5b0] bg-[#fffaf3] p-5 shadow-sm space-y-2">
                      <p className="text-xs font-bold text-[#8a6a50] uppercase tracking-wider">Average Score</p>
                      <p className="text-3xl font-black text-[#7a4e2d]">{avgPercentage}%</p>
                      <p className="text-xs text-[#8a6a50]">Weighted average across all subjects</p>
                    </div>
                    <div className="rounded-[1.75rem] border border-[#d9c5b0] bg-[#fffaf3] p-5 shadow-sm space-y-2">
                      <p className="text-xs font-bold text-[#8a6a50] uppercase tracking-wider">Total Exams Marked</p>
                      <p className="text-3xl font-black text-[#7a4e2d]">{filteredMarks.length}</p>
                      <p className="text-xs text-[#8a6a50]">Grades recorded in current term</p>
                    </div>
                    <div className="rounded-[1.75rem] border border-[#d9c5b0] bg-[#fffaf3] p-5 shadow-sm space-y-2">
                      <p className="text-xs font-bold text-[#8a6a50] uppercase tracking-wider">Pass / Fail Status</p>
                      <div className="flex gap-4 items-center mt-2">
                        <span className="text-sm font-semibold text-[#6d4c35]">
                          Passed: <span className="text-emerald-700 font-bold">{passedCount}</span>
                        </span>
                        <span className="text-sm font-semibold text-[#6d4c35]">
                          Failed: <span className="text-rose-700 font-bold">{failedCount}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm space-y-4">
                    <h3 className="font-bold text-lg text-[#3f2a1d]">Report Card</h3>
                    <div className="overflow-x-auto rounded-2xl border border-[#d9c5b0]">
                      <table className="w-full text-left border-collapse bg-white">
                        <thead>
                          <tr className="bg-[#f4ecdf] text-xs font-bold text-[#6d4c35] uppercase">
                            <th className="p-3">Exam Name</th>
                            <th className="p-3">Subject</th>
                            <th className="p-3">Marks Obtained</th>
                            <th className="p-3">Percentage</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3">Remarks / Feedback</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f4ecdf] text-sm text-[#6d4c35]">
                          {filteredMarks && filteredMarks.length > 0 ? (
                            filteredMarks.map((m) => (
                              <tr key={m._id} className="hover:bg-[#fffaf3]/50">
                                <td className="p-3 font-semibold">{m.examId?.name || 'Test/Assessment'}</td>
                                <td className="p-3 font-bold text-[#3f2a1d]">{m.subjectId?.name || 'N/A'}</td>
                                <td className="p-3 font-semibold">{m.marks} / {m.outOfMarks}</td>
                                <td className="p-3">{m.percentage}%</td>
                                <td className="p-3 text-center">
                                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                    m.passStatus === 'Pass' 
                                      ? 'bg-emerald-500/10 text-emerald-700' 
                                      : m.passStatus === 'Fail' 
                                        ? 'bg-rose-500/10 text-rose-700' 
                                        : 'bg-gray-500/10 text-gray-700'
                                  }`}>
                                    {m.passStatus || 'N/A'}
                                  </span>
                                </td>
                                <td className="p-3 text-xs italic">{m.remarks || 'No remarks provided.'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" className="p-6 text-center italic text-[#8a6a50]">
                                No academic marks have been recorded yet for this view.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* TAB 1.7: ATTENDANCE */}
        {activeSubTab === 'attendance' && (
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#3f2a1d]">My Attendance Log</h2>
              <p className="mt-1 text-sm text-[#7f634e]">Monitor your class presence statistics, daily check-ins, and monthly progress.</p>
            </div>
            {/* Stats Cards Row */}
            {(() => {
              const grouped = attendanceData?.grouped || {};
              const stats = attendanceData?.stats || { percentage: '0.0', total: 0, present: 0, absent: 0 };
              const dateKeys = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

              return (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-[1.75rem] border border-[#d9c5b0] bg-[#fffaf3] p-5 shadow-sm space-y-2">
                      <p className="text-xs font-bold text-[#8a6a50] uppercase tracking-wider">Overall Rate</p>
                      <p className="text-3xl font-black text-[#7a4e2d]">{stats.percentage}%</p>
                      <p className="text-xs text-[#8a6a50]">Total periods marked: {stats.total}</p>
                    </div>
                    <div className="rounded-[1.75rem] border border-[#d9c5b0] bg-[#fffaf3] p-5 shadow-sm space-y-2">
                      <p className="text-xs font-bold text-[#8a6a50] uppercase tracking-wider">Periods Present</p>
                      <p className="text-3xl font-black text-emerald-700">{stats.present}</p>
                      <p className="text-xs text-[#8a6a50]">Active lectures attended</p>
                    </div>
                    <div className="rounded-[1.75rem] border border-[#d9c5b0] bg-[#fffaf3] p-5 shadow-sm space-y-2">
                      <p className="text-xs font-bold text-[#8a6a50] uppercase tracking-wider">Periods Absent</p>
                      <p className="text-3xl font-black text-rose-700">{stats.absent}</p>
                      <p className="text-xs text-[#8a6a50]">Lectures missed</p>
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm space-y-4">
                    <h3 className="font-bold text-lg text-[#3f2a1d]">Daily Subject Attendance History</h3>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {dateKeys.length > 0 ? (
                        dateKeys.map((dateStr) => {
                          const dateObj = new Date(dateStr);
                          const formattedDate = dateObj.toLocaleDateString(undefined, {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          });

                          return (
                            <div key={dateStr} className="border border-[#d9c5b0] rounded-2xl bg-white p-4 space-y-3">
                              <h4 className="font-black text-xs uppercase tracking-wider text-[#7a4e2d]">
                                {formattedDate}
                              </h4>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {grouped[dateStr].map((item) => {
                                  const isPresent = item.status === 'Present';
                                  return (
                                    <div key={item._id} className="flex justify-between items-center p-2.5 rounded-xl border border-[#d9c5b0]/40 bg-[#fffaf3]/30 text-xs">
                                      <div className="space-y-0.5">
                                        <p className="font-bold text-[#3f2a1d]">{item.subjectName}</p>
                                        {item.periodStartTime && (
                                          <p className="text-[10px] text-[#8a6a50]">
                                            {item.periodStartTime} &mdash; {item.periodEndTime}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                          isPresent ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                                        }`}>
                                          {item.status}
                                        </span>
                                        <div className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center shadow-xs ${
                                          isPresent ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                                        }`}>
                                          {isPresent ? 'P' : 'A'}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-[#8a6a50] italic text-center py-6">No attendance records logged yet.</p>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* TAB 2: PROFILE */}
        {activeSubTab === 'profile' && profileData && (
          <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm space-y-6">
            
            {/* Main Header / Banner */}
            <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b border-[#f4ecdf]">
              {profileData.photo ? (
                <img 
                  src={profileData.photo} 
                  alt={profileData.name} 
                  className="h-28 w-28 rounded-full object-cover border-2 border-[#7a4e2d] shadow-sm"
                />
              ) : (
                <div className="h-28 w-28 rounded-full bg-[#7a4e2d]/10 text-[#7a4e2d] flex items-center justify-center font-bold text-3xl">
                  {profileData.name.charAt(0)}
                </div>
              )}
              <div className="text-center md:text-left space-y-1">
                <h2 className="text-2xl font-black text-[#3f2a1d]">{profileData.fullName || profileData.name}</h2>
                <p className="text-[#8a6a50] text-sm font-semibold">Student ID: {profileData._id} | Roll: {profileData.rollNumber || 'N/A'}</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                  <span className="bg-[#7a4e2d]/10 text-[#7a4e2d] text-xs font-bold px-3 py-1 rounded-full">
                    Grade: {profileData.classId?.standard || 'N/A'} | Section: {profileData.division || 'N/A'}
                  </span>
                  <span className="bg-sky-500/10 text-sky-700 text-xs font-bold px-3 py-1 rounded-full font-mono">
                    Admission No: {profileData.admissionNumber || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Grid Details */}
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Category 0: Personal Details */}
              <div className="rounded-2xl border border-[#d9c5b0] bg-white p-5 space-y-3">
                <h3 className="font-bold text-[#7a4e2d] flex items-center gap-2 border-b pb-2">
                  <User className="h-4 w-4" /> Personal Details
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-[#6d4c35]">
                  <div><span className="font-semibold block text-xs text-[#8a6a50]">First Name:</span>{profileData.firstName || 'N/A'}</div>
                  <div><span className="font-semibold block text-xs text-[#8a6a50]">Middle Name:</span>{profileData.middleName || 'N/A'}</div>
                  <div><span className="font-semibold block text-xs text-[#8a6a50]">Last Name:</span>{profileData.lastName || 'N/A'}</div>
                  <div><span className="font-semibold block text-xs text-[#8a6a50]">Gender:</span>{profileData.gender || 'N/A'}</div>
                  <div><span className="font-semibold block text-xs text-[#8a6a50]">Date of Birth:</span>{profileData.dateOfBirth ? profileData.dateOfBirth.split('T')[0] : 'N/A'}</div>
                  <div><span className="font-semibold block text-xs text-[#8a6a50]">Aadhaar Number:</span>{profileData.aadhaarNumber || 'N/A'}</div>
                  <div><span className="font-semibold block text-xs text-[#8a6a50]">Nationality:</span>{profileData.nationality || 'N/A'}</div>
                  <div><span className="font-semibold block text-xs text-[#8a6a50]">Religion:</span>{profileData.religion || 'N/A'}</div>
                  <div className="col-span-2"><span className="font-semibold block text-xs text-[#8a6a50]">Caste/Category:</span>{profileData.casteCategory || 'N/A'}</div>
                </div>
              </div>

              {/* Category 1: Academic */}
              <div className="rounded-2xl border border-[#d9c5b0] bg-white p-5 space-y-3">
                <h3 className="font-bold text-[#7a4e2d] flex items-center gap-2 border-b pb-2">
                  <LayoutGrid className="h-4 w-4" /> Academic Records
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-[#6d4c35]">
                  <div><span className="font-semibold block text-xs text-[#8a6a50]">House:</span>{profileData.house || 'N/A'}</div>
                  <div><span className="font-semibold block text-xs text-[#8a6a50]">Academic Year:</span>{profileData.academicYear || 'N/A'}</div>
                  <div><span className="font-semibold block text-xs text-[#8a6a50]">Medium:</span>{profileData.medium || 'N/A'}</div>
                  <div><span className="font-semibold block text-xs text-[#8a6a50]">Admission Date:</span>{profileData.admissionDate ? profileData.admissionDate.split('T')[0] : 'N/A'}</div>
                  <div className="col-span-2">
                    <span className="font-semibold block text-xs text-[#8a6a50]">Previous School:</span>
                    {profileData.previousSchool || 'Fresh'}
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold block text-xs text-[#8a6a50]">Enrolled Subjects:</span>
                    <p className="text-xs mt-1 bg-[#f4ecdf] p-2 rounded-xl text-[#3f2a1d] font-semibold">
                      {profileData.subjectsEnrolled && profileData.subjectsEnrolled.length > 0
                        ? profileData.subjectsEnrolled.map(s => s.name || s).join(', ')
                        : 'No Subjects Enrolled'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Category 2: Parent Details */}
              <div className="rounded-2xl border border-[#d9c5b0] bg-white p-5 space-y-3">
                <h3 className="font-bold text-[#7a4e2d] flex items-center gap-2 border-b pb-2">
                  <User className="h-4 w-4" /> Parent / Guardian details
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm text-[#6d4c35]">
                  <div className="border-r border-[#f4ecdf] pr-2">
                    <span className="font-bold block text-xs text-[#7a4e2d] mb-1">Father</span>
                    <p><span className="text-[#8a6a50] text-xs">Name:</span> {profileData.father?.name || 'N/A'}</p>
                    <p><span className="text-[#8a6a50] text-xs">Occ:</span> {profileData.father?.occupation || 'N/A'}</p>
                    <p><span className="text-[#8a6a50] text-xs">Ph:</span> {profileData.father?.mobileNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-bold block text-xs text-[#7a4e2d] mb-1">Mother</span>
                    <p><span className="text-[#8a6a50] text-xs">Name:</span> {profileData.mother?.name || 'N/A'}</p>
                    <p><span className="text-[#8a6a50] text-xs">Occ:</span> {profileData.mother?.occupation || 'N/A'}</p>
                    <p><span className="text-[#8a6a50] text-xs">Ph:</span> {profileData.mother?.mobileNumber || 'N/A'}</p>
                  </div>
                  {profileData.guardian?.name && (
                    <div className="col-span-2 border-t pt-2 mt-1">
                      <span className="font-bold block text-xs text-[#7a4e2d]">Guardian (Different)</span>
                      <p className="text-xs mt-1">
                        Name: {profileData.guardian.name} | Relation: {profileData.guardian.relationship} | Ph: {profileData.guardian.mobileNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Category 3: Contact & Address */}
              <div className="rounded-2xl border border-[#d9c5b0] bg-white p-5 space-y-3">
                <h3 className="font-bold text-[#7a4e2d] flex items-center gap-2 border-b pb-2">
                  <Phone className="h-4 w-4" /> Contact Information
                </h3>
                <div className="text-sm text-[#6d4c35] space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <p><span className="text-[#8a6a50] text-xs font-bold block">Mobile:</span>{profileData.mobileNumber || 'N/A'}</p>
                    <p><span className="text-[#8a6a50] text-xs font-bold block">Alt Mobile:</span>{profileData.alternateMobileNumber || 'N/A'}</p>
                  </div>
                  <p><span className="text-[#8a6a50] text-xs font-bold block">Current Address:</span>{profileData.currentAddress || 'N/A'}</p>
                  <p><span className="text-[#8a6a50] text-xs font-bold block">Permanent Address:</span>{profileData.permanentAddress || 'N/A'}</p>
                </div>
              </div>

              {/* Category 4: Health & Transport */}
              <div className="rounded-2xl border border-[#d9c5b0] bg-white p-5 space-y-3">
                <h3 className="font-bold text-[#7a4e2d] flex items-center gap-2 border-b pb-2">
                  <AlertCircle className="h-4 w-4" /> Health & School Bus
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-[#6d4c35]">
                  <div><span className="font-semibold block text-xs text-[#8a6a50]">Blood Group:</span>{profileData.bloodGroup || 'N/A'}</div>
                  <div><span className="font-semibold block text-xs text-[#8a6a50]">Disability:</span>{profileData.disability || 'No'}</div>
                  <div className="col-span-2"><span className="font-semibold block text-xs text-[#8a6a50]">Medical Conditions:</span>{profileData.medicalConditions || 'None'}</div>
                  <div className="col-span-2 border-t pt-2">
                    <span className="font-bold block text-xs text-[#7a4e2d]">School Bus settings:</span>
                    <p className="text-xs mt-1">
                      Uses Bus: {profileData.usesSchoolBus} 
                      {profileData.usesSchoolBus === 'Yes' && ` (Route: ${profileData.busRoute || 'N/A'} | Stop: ${profileData.busStop || 'N/A'} | Number: ${profileData.busNumber || 'N/A'})`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Category 5: Documents */}
              <div className="col-span-2 rounded-2xl border border-[#d9c5b0] bg-white p-5 space-y-3">
                <h3 className="font-bold text-[#7a4e2d] flex items-center gap-2 border-b pb-2">
                  <FileText className="h-4 w-4" /> Uploaded Registry Documents
                </h3>
                <div className="grid gap-2 sm:grid-cols-3 text-xs">
                  {[
                    ['Birth Certificate', profileData.documents?.birthCertificate],
                    ['Aadhaar Card', profileData.documents?.aadhaarCard],
                    ['Previous Marksheet', profileData.documents?.previousMarksheet],
                    ['Transfer Certificate', profileData.documents?.transferCertificate],
                    ['Leaving Certificate', profileData.documents?.leavingCertificate],
                    ['Passport Photo', profileData.documents?.passportPhoto],
                    ['Parent ID Proof', profileData.documents?.parentIdProof],
                    ['Address Proof', profileData.documents?.addressProof],
                  ].map(([label, url]) => (
                    <div key={label} className="border border-[#f4ecdf] p-2 rounded-xl bg-[#fffaf3] flex justify-between items-center">
                      <span className="font-bold text-[#6d4c35]">{label}</span>
                      {url ? (
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="bg-[#7a4e2d] text-[#f7efe4] hover:bg-[#624021] px-2.5 py-1 rounded-lg font-bold"
                        >
                          View File
                        </a>
                      ) : (
                        <span className="text-[#8a6a50] italic">Not Uploaded</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: GRIEVANCES */}
        {activeSubTab === 'grievances' && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            
            {/* Form to Raise Grievance */}
            <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-[#3f2a1d] flex items-center gap-2">
                <Send className="h-5 w-5 text-[#b68c67]" />
                Raise a Grievance
              </h2>
              <p className="text-sm text-[#7f634e]">Submit your issue directly to the school administration. You can upload an issue photo if relevant.</p>

              <form onSubmit={handleRaiseGrievance} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-[#6d4c35] mb-1">Grievance / Complaint Title *</label>
                  <input
                    type="text"
                    required
                    value={grievanceTitle}
                    onChange={(e) => setGrievanceTitle(e.target.value)}
                    placeholder="E.g., Classroom fan not working"
                    className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2.5 text-sm outline-none focus:border-[#7a4e2d]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#6d4c35] mb-1">Category *</label>
                    <select
                      value={grievanceCategory}
                      onChange={(e) => setGrievanceCategory(e.target.value)}
                      className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none focus:border-[#7a4e2d]"
                    >
                      {['Facilities', 'Academic', 'Behavioral', 'Profile Update', 'Other'].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#6d4c35] mb-1">Priority *</label>
                    <select
                      value={grievancePriority}
                      onChange={(e) => setGrievancePriority(e.target.value)}
                      className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none focus:border-[#7a4e2d]"
                    >
                      {['Low', 'Medium', 'High'].map(pr => (
                        <option key={pr} value={pr}>{pr}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6d4c35] mb-1">Explain Detail Message *</label>
                  <textarea
                    required
                    value={grievanceDescription}
                    onChange={(e) => setGrievanceDescription(e.target.value)}
                    placeholder="Explain what needs to be fixed..."
                    className="w-full h-28 rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none focus:border-[#7a4e2d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6d4c35] mb-1">Attachment / Photo of Issue (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="block w-full text-xs text-[#8a6a50] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#7a4e2d]/10 file:text-[#7a4e2d] hover:file:bg-[#7a4e2d]/20"
                  />
                  {uploadingPhoto && <p className="text-xs text-amber-600 mt-1">Uploading photo...</p>}
                  {grievancePhoto && (
                    <p className="text-xs text-green-600 mt-1 font-bold">✓ Photo uploaded successfully!</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#7a4e2d] py-2.5 text-sm font-bold text-[#f7efe4] hover:bg-[#624021] transition"
                >
                  Submit Grievance
                </button>
              </form>
            </div>

            {/* Grievance History */}
            <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-[#3f2a1d] flex items-center gap-2">
                <History className="h-5 w-5 text-[#b68c67]" />
                Complaint History
              </h2>
              <p className="text-sm text-[#7f634e]">See active and resolved support tickets.</p>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {myGrievances.length > 0 ? (
                  myGrievances.map((complaint) => (
                    <div key={complaint._id} className="border border-[#d9c5b0] rounded-2xl bg-white p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-[#8a6a50]">{new Date(complaint.createdAt).toLocaleDateString()}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                          complaint.status === 'Resolved' 
                            ? 'bg-emerald-500/10 text-emerald-700' 
                            : complaint.status === 'In Progress' 
                              ? 'bg-amber-500/10 text-amber-700' 
                              : 'bg-rose-500/10 text-rose-700'
                        }`}>
                          {complaint.status === 'In Progress' ? 'Under Process' : (complaint.status === 'Resolved' ? 'Completed' : 'Pending')}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-[#3f2a1d]">{complaint.title}</h4>
                      <p className="text-xs text-[#6d4c35] leading-relaxed bg-[#f4ecdf] p-2 rounded-xl">
                        {complaint.description}
                      </p>
                      {complaint.attachments && complaint.attachments.length > 0 && (
                        <div className="pt-1">
                          <a href={complaint.attachments[0]} target="_blank" rel="noopener noreferrer" className="text-[10px] underline font-bold text-[#7a4e2d] hover:text-[#624021]">
                            View Attached Photo
                          </a>
                        </div>
                      )}
                      {complaint.resolution ? (
                        <div className="border-t border-[#f4ecdf] pt-2 mt-2">
                          <span className="text-xs font-bold text-emerald-700 block">Revert Message from Admin:</span>
                          <p className="text-xs text-[#6d4c35] italic mt-0.5">{complaint.resolution}</p>
                        </div>
                      ) : (
                        complaint.status === 'In Progress' && (
                          <p className="text-[11px] text-amber-600 font-semibold italic">Admin is currently processing your request.</p>
                        )
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#8a6a50] italic text-center py-6">You have not raised any grievances yet.</p>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: PASSWORD SECURITY */}
        {activeSubTab === 'security' && (
          <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm max-w-xl mx-auto">
            <h2 className="text-xl font-bold text-[#3f2a1d] flex items-center gap-2">
              <Lock className="h-5 w-5 text-[#b68c67]" />
              Update Security Password
            </h2>
            <p className="mt-1 text-sm text-[#7f634e]">Change your password. Keep your account details secure.</p>

            <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 text-xs font-semibold p-3 rounded-xl border border-red-200">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-emerald-50 text-emerald-700 text-xs font-semibold p-3 rounded-xl border border-emerald-200">
                  {success}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-[#6d4c35] mb-1">Current Password *</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none focus:border-[#7a4e2d]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#6d4c35] mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none focus:border-[#7a4e2d]"
                />
                <div className="mt-1.5 space-y-1 text-[10px]">
                  <p className="font-semibold text-[#6d4c35]">Password requirements:</p>
                  <div className="grid grid-cols-2 gap-1 mt-0.5">
                    <div className="flex items-center gap-1">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${(newPassword || '').length >= 6 ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className={(newPassword || '').length >= 6 ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>Min 6 characters</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${/[A-Z]/.test(newPassword || '') ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className={/[A-Z]/.test(newPassword || '') ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>1 capital letter</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${/[0-9]/.test(newPassword || '') ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className={/[0-9]/.test(newPassword || '') ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>1 number</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword || '') ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword || '') ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>1 special character</span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#6d4c35] mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none focus:border-[#7a4e2d]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#7a4e2d] py-2.5 text-sm font-bold text-[#f7efe4] hover:bg-[#624021] transition disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

        {/* TAB: TIMETABLE */}
        {activeSubTab === 'timetable' && (() => {
          const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          
          const getSortedTimeSlots = () => {
            const slotsSet = new Set();
            classTimetable.forEach(t => {
              t.slots?.forEach(s => {
                if (s.startTime && s.endTime) {
                  slotsSet.add(`${s.startTime} - ${s.endTime}`);
                }
              });
            });
            const toMin = (hhmm) => {
              const [h, m] = hhmm.split(':').map(Number);
              return h * 60 + m;
            };
            return [...slotsSet].sort((a, b) => toMin(a.split(' - ')[0]) - toMin(b.split(' - ')[0]));
          };

          const timeSlots = getSortedTimeSlots();

          const getCellContent = (day, slot) => {
            const tday = classTimetable.find(t => t.dayOfWeek?.toLowerCase() === day.toLowerCase());
            if (!tday || !tday.slots) return null;
            const match = tday.slots.find(s => `${s.startTime} - ${s.endTime}` === slot);
            if (!match) return null;
            if (match.isBreak) {
              return (
                <div className="p-2 bg-[#ecd9c5]/40 border border-dashed border-[#b68c67]/40 rounded-xl text-center text-[10px] text-[#8a6a50] font-extrabold select-none">
                  ☕ {match.breakName || 'Break'}
                </div>
              );
            }
            return (
              <div className="p-2 bg-[#faf4ea] border border-[#e1d0be] rounded-xl text-center shadow-xs">
                <p className="font-bold text-[#3f2a1d] text-xs leading-tight">{match.subjectId?.name || 'Subject'}</p>
                <p className="text-[10px] text-[#8a6a50] mt-1 font-semibold">{match.teacherId?.name || 'Teacher'}</p>
              </div>
            );
          };

          const classNameStr = profileData?.classId
            ? `Grade ${profileData.classId.standard} (Section ${profileData.classId.division})`
            : 'My Class';

          return (
            <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm space-y-4 printable-timetable">
              <div className="flex justify-between items-center border-b border-[#d9c5b0]/35 pb-2 no-print">
                <div>
                  <h2 className="text-xl font-bold text-[#3f2a1d]">Class Timetable</h2>
                  <p className="text-xs text-[#8a6a50]">Weekly class timetable for {classNameStr}</p>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-[#7a4e2d] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#624021] transition flex items-center gap-1.5 no-print"
                >
                  📥 Download / Print Timetable
                </button>
              </div>

              {/* Print Only Header (Visible during printing) */}
              <div className="hidden print:block mb-4 text-center">
                <h1 className="text-2xl font-black text-[#3f2a1d]">{profileData?.schoolName || 'School Hub'}</h1>
                <h2 className="text-lg font-bold text-[#7a4e2d] mt-1">Class Timetable — {classNameStr}</h2>
                <p className="text-xs text-[#8a6a50]">Academic Year: 2026-2027</p>
              </div>

              {timeSlots.length > 0 ? (
                <div className="min-w-full overflow-x-auto border border-[#d9c5b0] rounded-2xl bg-white shadow-sm">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-[#faf4ea] border-b border-[#d9c5b0]">
                        <th className="p-4 text-xs font-black text-[#6d4c35] border-r border-[#d9c5b0] w-32 bg-[#faf4ea]">
                          Day / Time
                        </th>
                        {timeSlots.map(slot => (
                          <th key={slot} className="p-4 text-xs font-black text-[#6d4c35] text-center border-r border-[#d9c5b0]/40 last:border-r-0">
                            {slot}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {daysOrder.map((day, dayIdx) => (
                        <tr key={day} className="border-b border-[#d9c5b0]/60 last:border-b-0 hover:bg-[#fffaf3]/45 transition">
                          <td className="p-4 text-xs font-black text-[#7a4e2d] border-r border-[#d9c5b0] bg-[#faf4ea]">
                            {day}
                          </td>
                          {timeSlots.map(slot => {
                            const breakMatch = (() => {
                              for (const t of classTimetable) {
                                const match = t.slots?.find(s => `${s.startTime} - ${s.endTime}` === slot);
                                if (match && match.isBreak) return match;
                              }
                              return null;
                            })();

                            if (breakMatch) {
                              if (dayIdx !== 0) return null;
                              return (
                                <td key={slot} rowSpan={daysOrder.length} className="p-2 border-r border-[#d9c5b0]/40 last:border-r-0 min-w-[80px] bg-[#ecd9c5]/30 text-center font-extrabold text-[#8a6a50] align-middle select-none">
                                  <div className="flex flex-col items-center justify-center space-y-1 py-4">
                                    <span>☕</span>
                                    <span className="uppercase tracking-widest text-[9px] font-black" style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}>
                                      {breakMatch.breakName || 'BREAK'}
                                    </span>
                                  </div>
                                </td>
                              );
                            }

                            const cell = getCellContent(day, slot);
                            return (
                              <td key={slot} className="p-2 border-r border-[#d9c5b0]/40 last:border-r-0 min-w-[140px]">
                                {cell || (
                                  <div className="p-2 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center text-[10px] text-gray-300 font-bold">
                                    Free
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-[#8a6a50] italic text-sm">
                  No lectures are currently scheduled for your class section.
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB: FEES */}
        {activeSubTab === 'fees' && (
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm flex justify-between items-center flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#3f2a1d]">Fees & Payments</h2>
                <p className="text-sm text-[#7f634e]">View academic year fee details, track paid installments, and complete online payments.</p>
              </div>
              {(() => {
                const totalInst = feeStructure?.totalInstallments || 4;
                const paidAll = Array.from({ length: totalInst }, (_, i) => i + 1).every(idx => 
                  feeRecord?.paidInstallments?.includes(idx) || (idx <= 4 && feeRecord?.[`q${idx}Status`] === 'Paid')
                );
                return feeRecord && !paidAll && (
                  <button
                    onClick={handlePayFull}
                    disabled={isPayingFee}
                    className="rounded-xl bg-[#7a4e2d] px-5 py-2.5 text-xs font-bold text-[#f7efe4] hover:bg-[#624021] transition shadow-md disabled:opacity-50"
                  >
                    Pay Full Fees
                  </button>
                );
              })()}
            </div>

            {feeStructure ? (
              <div className="grid gap-6 md:grid-cols-2">
                
                {/* Structure Overview Card */}
                <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm space-y-4">
                  <h3 className="font-black text-lg text-[#3f2a1d]">Academic Fee Summary</h3>
                  <div className="space-y-3 divide-y divide-[#d9c5b0]/20">
                    <div className="flex justify-between py-2 text-sm">
                      <span className="font-semibold text-[#8a6a50]">Academic Year</span>
                      <span className="font-bold text-[#3f2a1d]">{feeStructure.academicYear || 'Current Year'}</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className="font-semibold text-[#8a6a50]">Total Class Fees</span>
                      <span className="font-black text-[#7a4e2d] text-lg">₹ {feeStructure.totalAmount}</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className="font-semibold text-[#8a6a50]">Roster Installment Terms</span>
                      <span className="font-bold text-[#3f2a1d]">{feeStructure.totalInstallments || 4} Installments</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className="font-semibold text-[#8a6a50]">Fee Status</span>
                      {(() => {
                        const totalInst = feeStructure.totalInstallments || 4;
                        const paidAll = Array.from({ length: totalInst }, (_, i) => i + 1).every(idx => 
                          feeRecord?.paidInstallments?.includes(idx) || (idx <= 4 && feeRecord?.[`q${idx}Status`] === 'Paid')
                        );
                        return paidAll ? (
                          <span className="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-700">Fully Paid</span>
                        ) : (
                          <span className="rounded-lg bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-700">Payment Pending</span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Installments Listing */}
                <div className="md:col-span-1 space-y-4">
                  <h3 className="font-black text-lg text-[#3f2a1d] px-1">Installment Schedule</h3>
                  
                  {(() => {
                    const totalInst = feeStructure.totalInstallments || 4;
                    const instAmt = Math.round(feeStructure.totalAmount / totalInst);
                    return Array.from({ length: totalInst }, (_, idx) => {
                      const termNum = idx + 1;
                      const isPaid = feeRecord?.paidInstallments?.includes(termNum) || (termNum <= 4 && feeRecord?.[`q${termNum}Status`] === 'Paid');
                      const paidDate = feeRecord?.paidInstallments?.includes(termNum)
                        ? (feeRecord.paidDates?.[termNum.toString()] || feeRecord.paidDates?.get?.(termNum.toString()))
                        : feeRecord?.[`q${termNum}PaidDate`];
                      
                      return (
                        <div key={termNum} className="rounded-2xl border border-[#d9c5b0] bg-[#fffaf3] p-5 shadow-sm flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-[#3f2a1d] text-sm">Term {termNum} Installment</h4>
                            <p className="text-xs text-[#7f634e] mt-0.5">Amount: ₹ {instAmt}</p>
                            {isPaid && paidDate && (
                              <p className="text-[10px] text-emerald-700 font-semibold mt-1">Paid on: {new Date(paidDate).toLocaleDateString()}</p>
                            )}
                          </div>
                          <div>
                            {isPaid ? (
                              <span className="rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700">Paid</span>
                            ) : (
                              <button
                                onClick={() => handlePayQuarter(termNum.toString())}
                                disabled={isPayingFee}
                                className="rounded-lg bg-[#7a4e2d] px-3.5 py-1.5 text-xs font-bold text-[#f7efe4] hover:bg-[#624021] transition shadow-sm disabled:opacity-50"
                              >
                                Pay ₹{instAmt}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-[#8a6a50] italic border border-dashed border-[#d9c5b0] rounded-[2rem] bg-[#fffaf3]">
                No fee structure has been configured for your grade by the admin.
              </div>
            )}
          </div>
        )}

        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;