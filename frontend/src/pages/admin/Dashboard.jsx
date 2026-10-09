import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, BarChart3, Bell, BookOpen, GraduationCap, Users, Search, 
  Mail, Phone, Calendar, Shield, DollarSign, Award, MapPin, Plus, MessageSquare,
  Trash2, X, ClipboardList, BookOpenCheck, CheckCircle, Edit, Pencil, Settings, Menu 
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import apiClient from '../../utils/apiClient';
import MessagingPanel from '../../components/MessagingPanel';
import MessageNotifications from '../../components/MessageNotifications';
import NationalExamManager from '../../components/NationalExamManager';

const AdminDashboard = () => {
  const getTabFromHash = () => {
    const hash = window.location.hash.replace('#/', '');
    const validTabs = ['overview', 'teachers', 'students', 'families', 'classes', 'subjects', 'exams', 'national-exams', 'notices', 'grievances', 'fees', 'teacherAssignments', 'timetable', 'messages'];
    if (hash && validTabs.includes(hash)) {
      return hash;
    }
    return null;
  };

  const [activeTab, setActiveTab] = useState(() => {
    const tabFromHash = getTabFromHash();
    if (tabFromHash) return tabFromHash;
    return localStorage.getItem('adminActiveTab') || 'overview';
  });

  useEffect(() => {
    // Ensure hash is set on initial mount
    const tabFromHash = getTabFromHash();
    const initialTab = tabFromHash || activeTab;
    const pageUrl = `${window.location.pathname}#/${initialTab}`;
    window.history.replaceState({ tab: initialTab, sentinel: 0 }, '', pageUrl);
    // Fill the history stack with 30 sentinel entries so the back button
    // can never escape to Google or any external page
    for (let i = 1; i <= 30; i++) {
      window.history.pushState({ tab: initialTab, sentinel: i }, '', pageUrl);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
    // Keep hash in sync when tab changes programmatically
    window.history.pushState({ tab: activeTab }, '', `${window.location.pathname}#/${activeTab}`);
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = (e) => {
      const pageUrl = `${window.location.pathname}#/${activeTab}`;
      // Replenish sentinel stack — push 5 entries back each time to keep the buffer deep
      for (let i = 0; i < 5; i++) {
        window.history.pushState({ tab: activeTab, sentinel: i }, '', pageUrl);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState({ id: '', request: 0 });
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [families, setFamilies] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', maxMarks: 100, minMarks: 35, standards: [], lecturesPerStandard: [] });
  const [schoolName, setSchoolName] = useState('');
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [editingExamId, setEditingExamId] = useState(null);
  const [selectedExamStd, setSelectedExamStd] = useState(null);
  const [selectedExamName, setSelectedExamName] = useState(null);
  const [selectedExamKeys, setSelectedExamKeys] = useState([]);
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [creatingExam, setCreatingExam] = useState(false);
  const [examForm, setExamForm] = useState({ name: '', standards: [], subjectId: '', date: '', maxMarks: 100, passingMarks: 35 });
  const [noticesCount, setNoticesCount] = useState(0);
  const [notices, setNotices] = useState([]);
  const [showAddNoticeModal, setShowAddNoticeModal] = useState(false);
  const [noticeForm, setNoticeForm] = useState({
    title: '',
    category: 'General',
    content: '',
    targetAudience: 'All',
    priority: 'Medium',
    isPinned: false,
    attachments: [],
    visibleDays: 0
  });
  const [creatingNotice, setCreatingNotice] = useState(false);
  const [uploadingNoticeFile, setUploadingNoticeFile] = useState(false);
  const [loading, setLoading] = useState(true);
  // Fees states
  const [feeStructures, setFeeStructures] = useState([]);
  const [studentFees, setStudentFees] = useState([]);
  const [allStudentFees, setAllStudentFees] = useState([]);
  const [selectedFeeStd, setSelectedFeeStd] = useState(null);
  const [showSetFeeModal, setShowSetFeeModal] = useState(false);
  const [editingFeeId, setEditingFeeId] = useState(null); // null = create, string = edit mode (standard key)
  const [creatingFee, setCreatingFee] = useState(false);
  const [feeForm, setFeeForm] = useState({ standard: '', totalAmount: '', totalMonths: 12, totalInstallments: 4, academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}` });

  // Timetable states
  const [timetableConfig, setTimetableConfig] = useState({
    schoolStartTime: '08:00',
    schoolEndTime: '14:00',
    lectureDurationMinutes: 45,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    breaks: [],
    academicYear: '2026-2027'
  });
  const [newBreak, setNewBreak] = useState({ name: 'Short Break', startTime: '', endTime: '' });
  const [timetableGenStd, setTimetableGenStd] = useState('');
  const [selectedViewClassId, setSelectedViewClassId] = useState('');
  const [classTimetables, setClassTimetables] = useState([]);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isGeneratingTimetable, setIsGeneratingTimetable] = useState(false);
  const [timetableTabMode, setTimetableTabMode] = useState(null);
  const [selectedViewTeacherId, setSelectedViewTeacherId] = useState('');
  const [allTimetables, setAllTimetables] = useState([]);

  useEffect(() => {
    const fetchStudentFees = async () => {
      if (selectedFeeStd) {
        try {
          const res = await apiClient.get(`/fees/students/${selectedFeeStd}`);
          setStudentFees(res.data.fees || []);
        } catch (err) {
          console.error("Failed to fetch student fees:", err);
          toast.error("Failed to load student fees.");
        }
      } else {
        setStudentFees([]);
      }
    };
    fetchStudentFees();
  }, [selectedFeeStd]);

  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [editingFamilyId, setEditingFamilyId] = useState(null);
  const [expandedStds, setExpandedStds] = useState(new Set());
  const [showAssignSubjectsModal, setShowAssignSubjectsModal] = useState(false);
  const [assignSubjectsTeacher, setAssignSubjectsTeacher] = useState(null); // the teacher object
  const [assignSubjectsIds, setAssignSubjectsIds] = useState([]);           // currently selected subjectIds
  const [savingSubjects, setSavingSubjects] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [grievances, setGrievances] = useState([]);
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [revertMessage, setRevertMessage] = useState('');
  const [grievanceSubTab, setGrievanceSubTab] = useState('teacher'); // 'teacher' or 'student'
  const [teacherModalTab, setTeacherModalTab] = useState('basic'); // 'basic', 'contact', 'professional', 'qualifications', 'payroll', 'documents'
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningTeacher, setAssigningTeacher] = useState(null);
  const [tempAssignments, setTempAssignments] = useState({});
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [savingAssignments, setSavingAssignments] = useState(false);

  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('');

  // Class/Standard Setup and filtering states
  const [selectedStandard, setSelectedStandard] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedManageClassStd, setSelectedManageClassStd] = useState(null);

  const openMessages = (contactId = '') => {
    if (contactId) {
      setMessageTarget(previous => ({ id: contactId, request: previous.request + 1 }));
    }
    setActiveTab('messages');
    setIsSidebarOpen(false);
  };

  const [showClassSetupModal, setShowClassSetupModal] = useState(false);
  const [totalNumericStandards, setTotalNumericStandards] = useState(10);
  const [prePrimaryChecklist, setPrePrimaryChecklist] = useState({
    Playgroup: false,
    Nursery: false,
    'Junior KG': false,
    'Senior KG': false
  });
  const [divisionsCountMap, setDivisionsCountMap] = useState({});

  const sortStandards = (a, b) => {
    const order = { 'playgroup': 1, 'nursery': 2, 'junior kg': 3, 'senior kg': 4 };
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    
    const aOrder = order[aLower];
    const bOrder = order[bLower];
    
    if (aOrder && bOrder) return aOrder - bOrder;
    if (aOrder) return -1;
    if (bOrder) return 1;
    
    const aNum = parseInt(a, 10);
    const bNum = parseInt(b, 10);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    if (!isNaN(aNum)) return -1;
    if (!isNaN(bNum)) return 1;
    return a.localeCompare(b);
  };

  const getActiveStandards = () => {
    const list = [];
    if (prePrimaryChecklist.Playgroup) list.push('Playgroup');
    if (prePrimaryChecklist.Nursery) list.push('Nursery');
    if (prePrimaryChecklist['Junior KG']) list.push('Junior KG');
    if (prePrimaryChecklist['Senior KG']) list.push('Senior KG');
    
    const count = parseInt(totalNumericStandards || 0, 10);
    for (let i = 1; i <= count; i++) {
      list.push(i.toString());
    }
    return list;
  };

  const handleSaveClassSetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const activeStds = getActiveStandards();

      // Build a map of NEW config: standard -> divisionsCount (from modal inputs)
      const newConfigMap = {};
      for (const std of activeStds) {
        newConfigMap[std] = parseInt(divisionsCountMap[std] || 1, 10);
      }

      // Merge with EXISTING classes so we never silently remove them.
      // For each existing standard NOT in the new modal selection, keep its current division count.
      const existingStdMap = {};
      for (const cls of classes) {
        const std = cls.standard;
        if (!existingStdMap[std]) existingStdMap[std] = new Set();
        existingStdMap[std].add(cls.division);
      }

      const mergedConfig = { ...existingStdMap };
      // Overlay new config on top (new values win for standards the user explicitly set up)
      for (const std of activeStds) {
        // Generate division letters for the requested count
        const count = newConfigMap[std];
        const letters = Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));
        mergedConfig[std] = new Set(letters);
      }

      // Convert merged map to classesConfig array
      const classesConfig = Object.entries(mergedConfig).map(([standard, divSet]) => ({
        standard,
        divisionsCount: divSet.size
      }));

      await apiClient.post('/classes/bulk-setup', { classesConfig });
      toast.success('Classes updated successfully!');
      
      await fetchData();
      
      setShowClassSetupModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to setup classes');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (classId) => {
    setLoading(true);
    try {
      await apiClient.delete(`/classes/${classId}`);
      toast.success('Section deleted and students distributed to other sections successfully!');
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete section');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStandard = async (stdName) => {
    setLoading(true);
    try {
      await apiClient.delete(`/classes/standard/${stdName}`);
      toast.success(`Grade "${stdName}" and its sections deleted successfully!`);
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete grade');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDivision = async (stdName) => {
    const currentDivs = classes
      .filter(c => c.standard === stdName)
      .map(c => c.division.toUpperCase());
    
    let nextLetter = 'A';
    if (currentDivs.length > 0) {
      const charCodes = currentDivs.map(d => d.charCodeAt(0));
      const maxCode = Math.max(...charCodes);
      nextLetter = String.fromCharCode(maxCode + 1);
    }

    setLoading(true);
    try {
      await apiClient.post('/classes', {
        standard: stdName,
        division: nextLetter
      });
      toast.success(`Section "${nextLetter}" added successfully to Grade "${stdName}"!`);
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add section');
    } finally {
      setLoading(false);
    }
  };
  const handleOpenClassSetupModal = () => {
    const prePrimary = {
      Playgroup: classes.some(c => c.standard === 'Playgroup'),
      Nursery: classes.some(c => c.standard === 'Nursery'),
      'Junior KG': classes.some(c => c.standard === 'Junior KG'),
      'Senior KG': classes.some(c => c.standard === 'Senior KG'),
    };
    
    let maxNumeric = 0;
    classes.forEach(c => {
      const num = parseInt(c.standard, 10);
      if (!isNaN(num) && num > maxNumeric) {
        maxNumeric = num;
      }
    });
    
    const counts = {};
    const uniqueStds = [...new Set(classes.map(c => c.standard))];
    uniqueStds.forEach(std => {
      const count = classes.filter(c => c.standard === std).length;
      counts[std] = count;
    });

    setPrePrimaryChecklist(prePrimary);
    setTotalNumericStandards(maxNumeric || 10);
    setDivisionsCountMap(counts);
    setShowClassSetupModal(true);
  };

  const handleStdDivChange = (std, div) => {
    const matched = classes.find(c => String(c.standard) === String(std) && String(c.division) === String(div));
    setTeacherForm(prev => ({
      ...prev,
      classTeacherOf: matched ? matched._id : ''
    }));
  };

  // Teacher Form State
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    employeeId: '',
    staffCode: '',
    firstName: '',
    middleName: '',
    lastName: '',
    gender: 'Male',
    dateOfBirth: '',
    bloodGroup: '',
    aadhaarNumber: '',
    panNumber: '',
    nationality: 'Indian',
    maritalStatus: 'Single',
    alternateMobileNumber: '',
    emergencyContactNumber: '',
    currentAddress: '',
    permanentAddress: '',
    city: '',
    state: '',
    pinCode: '',
    designation: '',
    department: '',
    joiningDate: '',
    employmentType: 'Full-Time',
    experience: 0,
    previousSchool: '',
    employeeStatus: 'Active',
    reportingTo: '',
    basicSalary: 0,
    hra: 0,
    da: 0,
    otherAllowances: 0,
    deductions: 0,
    pf: 0,
    tax: 0,
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    isClassTeacher: false,
    classTeacherOf: '',
    classTeacherStandard: '',
    classTeacherDivision: '',
    subjectIds: [],
    qualifications: [
      { degree: 'B.Ed', university: '', year: '', percentageCGPA: '' },
      { degree: 'M.Ed', university: '', year: '', percentageCGPA: '' },
    ],
    docAadhaarCard: '',
    docPanCard: '',
    docDegreeCertificates: '',
    docResume: '',
  });

  // Student Form State
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    rollNumber: '',
    admissionNumber: '',
    firstName: '',
    middleName: '',
    lastName: '',
    fullName: '',
    gender: 'Male',
    dateOfBirth: '',
    bloodGroup: '',
    photo: '',
    aadhaarNumber: '',
    nationality: 'Indian',
    religion: '',
    casteCategory: '',

    mobileNumber: '',
    alternateMobileNumber: '',
    emailAddress: '',
    currentAddress: '',
    permanentAddress: '',
    city: '',
    state: '',
    country: 'India',
    pinCode: '',

    fatherName: '',
    fatherOccupation: '',
    fatherMobileNumber: '',
    fatherEmail: '',

    motherName: '',
    motherOccupation: '',
    motherMobileNumber: '',
    motherEmail: '',

    guardianName: '',
    guardianRelationship: '',
    guardianMobileNumber: '',
    guardianAddress: '',

    classStandard: '',
    classDivision: '',
    classId: '',
    division: '',
    house: '',
    academicYear: '',
    admissionDate: '',
    previousSchool: 'Fresh',
    studentStatus: 'Active',
    medium: 'English',
    subjectsEnrolled: [],

    allergies: '',
    medicalConditions: '',
    disability: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactMobileNumber: '',
    doctorName: '',
    medicalNotes: '',

    usesSchoolBus: 'No',
    busRoute: '',
    busStop: '',
    busNumber: '',
    driverName: '',
    driverContact: '',

    libraryCardNumber: '',
    booksIssued: 0,
    issueDate: '',
    returnDate: '',
    fine: 0,
    bookStatus: '',

    username: '',
    accountStatus: 'Active',

    docBirthCertificate: '',
    docAadhaarCard: '',
    docPreviousMarksheet: '',
    docTransferCertificate: '',
    docLeavingCertificate: '',
    docPassportPhoto: '',
    docParentIdProof: '',
    docAddressProof: '',
    docIncomeCertificate: '',
    docCasteCertificate: '',
  });

  const [familyForm, setFamilyForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    relationshipToStudent: 'Parent',
    notes: '',
    children: [],
  });
  const [studentModalTab, setStudentModalTab] = useState('basic');
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null);
  const [showStudentDetailsModal, setShowStudentDetailsModal] = useState(false);
  const [adminStudentProfile, setAdminStudentProfile] = useState(null);
  const [adminFilterStartDate, setAdminFilterStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [adminFilterEndDate, setAdminFilterEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [adminStudentModalTab, setAdminStudentModalTab] = useState('info');
  const [adminLoadingDetails, setAdminLoadingDetails] = useState(false);
  const [showAddAttendanceOverride, setShowAddAttendanceOverride] = useState(false);
  const [adminNewAtt, setAdminNewAtt] = useState({ date: new Date().toISOString().split('T')[0], status: 'Present', subjectId: '', remarks: '' });

  const [uploadingField, setUploadingField] = useState(null);

  const handleFileUpload = async (e, fieldName, targetForm = 'teacher') => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingField(fieldName);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (targetForm === 'student') {
        setStudentForm((prev) => ({
          ...prev,
          [fieldName]: res.data.url,
        }));
      } else {
        setTeacherForm((prev) => ({
          ...prev,
          [fieldName]: res.data.url,
        }));
      }
    } catch (err) {
      console.error('File upload failed', err);
      toast.error('File upload failed. Please try again.');
    } finally {
      setUploadingField(null);
    }
  };

  const fetchAdminStudentProfile = async (studentId) => {
    try {
      setAdminLoadingDetails(true);
      const res = await apiClient.get(`/attendance/admin/student/${studentId}?startDate=${adminFilterStartDate}&endDate=${adminFilterEndDate}`);
      setAdminStudentProfile(res.data);
    } catch (err) {
      toast.error('Failed to load student details.');
    } finally {
      setAdminLoadingDetails(false);
    }
  };

  const handleAdminUpdateAttendance = async (attendanceId, status, remarks = '') => {
    try {
      await apiClient.put(`/attendance/admin/update/${attendanceId}`, { status, remarks });
      toast.success('Attendance updated successfully.');
      if (selectedStudentForDetails?._id) {
        fetchAdminStudentProfile(selectedStudentForDetails._id);
      }
    } catch (err) {
      toast.error('Failed to update attendance.');
    }
  };

  const handleAdminCreateAttendance = async (e) => {
    e.preventDefault();
    if (!selectedStudentForDetails?._id) return;
    try {
      await apiClient.post('/attendance/admin/create', {
        studentId: selectedStudentForDetails._id,
        classId: selectedStudentForDetails.classId?._id || selectedStudentForDetails.classId,
        subjectId: adminNewAtt.subjectId || null,
        date: adminNewAtt.date,
        status: adminNewAtt.status,
        remarks: adminNewAtt.remarks,
      });
      toast.success('Attendance record added successfully.');
      setShowAddAttendanceOverride(false);
      setAdminNewAtt({ date: new Date().toISOString().split('T')[0], status: 'Present', subjectId: '', remarks: '' });
      fetchAdminStudentProfile(selectedStudentForDetails._id);
    } catch (err) {
      toast.error('Failed to create attendance record.');
    }
  };

  useEffect(() => {
    if (showStudentDetailsModal && selectedStudentForDetails?._id) {
      fetchAdminStudentProfile(selectedStudentForDetails._id);
    }
  }, [showStudentDetailsModal, selectedStudentForDetails?._id, adminFilterStartDate, adminFilterEndDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      setLoading(true);
      const resTeachers = await apiClient.get('/teachers?limit=1000');
      setTeachers(resTeachers.data.teachers || []);

      const resStudents = await apiClient.get('/students?limit=1000');
      setStudents(resStudents.data.students || []);

      const resFamilies = await apiClient.get('/families?limit=1000').catch(() => ({ data: { families: [] } }));
      setFamilies(resFamilies.data.families || []);

      const resProfile = await apiClient.get('/auth/profile').catch(() => null);
      if (resProfile?.data?.user) {
        setSchoolName(resProfile.data.user.schoolId?.name || '');
      }

      const resClasses = await apiClient.get('/classes?limit=1000').catch(() => ({ data: { classes: [] } }));
      setClasses(resClasses.data.classes || []);

      const resSubjects = await apiClient.get('/subjects').catch(() => ({ data: { subjects: [] } }));
      setSubjects(resSubjects.data.subjects || []);

      const resExams = await apiClient.get('/marks/exams?limit=1000').catch(() => ({ data: { exams: [] } }));
      setExams(resExams.data.exams || []);

      const resNotices = await apiClient.get('/notices?limit=1000').catch(() => ({ data: { notices: [] } }));
      setNotices(resNotices.data.notices || []);
      setNoticesCount(resNotices.data.notices?.length || 0);

      const resGrievances = await apiClient.get('/complaints?limit=1000').catch(() => ({ data: { complaints: [] } }));
      setGrievances(resGrievances.data.complaints || []);

      const resFees = await apiClient.get('/fees/structures').catch(() => ({ data: { structures: [] } }));
      const fetchedStructures = resFees.data.structures || [];
      setFeeStructures(fetchedStructures);

      // Fetch all student fee records globally for overview
      try {
        const allFeesData = [];
        for (const struct of fetchedStructures) {
          const res = await apiClient.get(`/fees/students/${struct.standard}`).catch(() => ({ data: { fees: [] } }));
          allFeesData.push(...(res.data.fees || []));
        }
        setAllStudentFees(allFeesData);
      } catch (feeErr) {
        console.error('Failed to load all student fees for overview:', feeErr);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetableConfig = async () => {
    try {
      const res = await apiClient.get('/timetables/config');
      if (res.data.config) {
        setTimetableConfig(res.data.config);
      }
    } catch (err) {
      console.error('Failed to load timetable config:', err);
    }
  };

  const handleSaveTimetableConfig = async (e) => {
    e.preventDefault();
    try {
      setIsSavingConfig(true);
      const res = await apiClient.post('/timetables/config', timetableConfig);
      setTimetableConfig(res.data.config);
      toast.success('School timetable configuration saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save timetable configuration');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleGenerateTimetable = async () => {
    try {
      setIsGeneratingTimetable(true);
      const res = await apiClient.post('/timetables/generate', {
        standards: []
      });
      toast.success(res.data.message || 'Timetable generated successfully!');
      if (selectedViewClassId) {
        fetchClassTimetable(selectedViewClassId);
      }
      fetchAllTimetables();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to auto-generate timetable');
    } finally {
      setIsGeneratingTimetable(false);
    }
  };

  const printSpecificTimetable = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('printable-timetable');
    window.print();
    el.classList.remove('printable-timetable');
  };

  const fetchClassTimetable = async (classId) => {
    if (!classId) return;
    try {
      const res = await apiClient.get(`/timetables/class/${classId}`);
      setClassTimetables(res.data.timetables || []);
    } catch (err) {
      console.error('Failed to fetch class timetable:', err);
    }
  };

  const fetchAllTimetables = async () => {
    try {
      const res = await apiClient.get('/timetables');
      setAllTimetables(res.data.timetables || []);
    } catch (err) {
      console.error('Failed to fetch all timetables:', err);
    }
  };

  const handleUpdateGrievanceStatus = async (id, status) => {
    try {
      await apiClient.put(`/complaints/${id}/status`, {
        status,
        resolution: status === 'Resolved' ? revertMessage : undefined
      });
      toast.success(`Grievance status updated to ${status === 'In Progress' ? 'Under Process' : 'Completed'}!`);
      setRevertMessage('');
      setSelectedGrievance(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update grievance');
    }
  };

  useEffect(() => {
    fetchData();
    fetchTimetableConfig();
    fetchAllTimetables();
  }, []);

  useEffect(() => {
    if (selectedViewClassId) {
      fetchClassTimetable(selectedViewClassId);
    } else {
      setClassTimetables([]);
    }
  }, [selectedViewClassId]);

  const handleOpenAddTeacher = () => {
    if (classes.length === 0) {
      toast.error('Set up grades and sections before adding students or teachers.');
      return;
    }
    setEditingTeacherId(null);
    setTeacherForm({
      name: '', email: '', password: '', phone: '', employeeId: '', staffCode: '',
      firstName: '', middleName: '', lastName: '', gender: 'Male', dateOfBirth: '',
      bloodGroup: '', aadhaarNumber: '', panNumber: '', nationality: 'Indian',
      maritalStatus: 'Single', alternateMobileNumber: '', emergencyContactNumber: '',
      currentAddress: '', permanentAddress: '', city: '', state: '', pinCode: '',
      designation: '', department: '', joiningDate: '', employmentType: 'Full-Time',
      experience: 0, previousSchool: '', employeeStatus: 'Active', reportingTo: '',
      basicSalary: 0, hra: 0, da: 0, otherAllowances: 0, deductions: 0, pf: 0, tax: 0,
      bankName: '', accountNumber: '', ifscCode: '', isClassTeacher: false, classTeacherOf: '',
      classTeacherStandard: '', classTeacherDivision: '', subjectIds: [],
      qualifications: [
        { degree: 'B.Ed', university: '', year: '', percentageCGPA: '' },
        { degree: 'M.Ed', university: '', year: '', percentageCGPA: '' },
      ],
      docAadhaarCard: '', docPanCard: '', docDegreeCertificates: '', docResume: '',
    });
    setTeacherModalTab('basic');
    setShowAddTeacherModal(true);
  };

  const handleOpenEditTeacher = (teacher) => {
    setEditingTeacherId(teacher._id);
    setTeacherForm({
      name: teacher.name || '',
      email: teacher.email || '',
      password: '',
      phone: teacher.phone || '',
      employeeId: teacher.employeeId || '',
      staffCode: teacher.staffCode || '',
      firstName: teacher.firstName || '',
      middleName: teacher.middleName || '',
      lastName: teacher.lastName || '',
      gender: teacher.gender || 'Male',
      dateOfBirth: teacher.dateOfBirth ? teacher.dateOfBirth.split('T')[0] : '',
      bloodGroup: teacher.bloodGroup || '',
      aadhaarNumber: teacher.aadhaarNumber || '',
      panNumber: teacher.panNumber || '',
      nationality: teacher.nationality || 'Indian',
      maritalStatus: teacher.maritalStatus || 'Single',
      alternateMobileNumber: teacher.alternateMobileNumber || '',
      emergencyContactNumber: teacher.emergencyContactNumber || '',
      currentAddress: teacher.currentAddress || '',
      permanentAddress: teacher.permanentAddress || '',
      city: teacher.city || '',
      state: teacher.state || '',
      pinCode: teacher.pinCode || '',
      designation: teacher.designation || '',
      department: teacher.department || '',
      joiningDate: teacher.joiningDate ? teacher.joiningDate.split('T')[0] : '',
      employmentType: teacher.employmentType || 'Full-Time',
      experience: teacher.experience || 0,
      previousSchool: teacher.previousSchool || '',
      employeeStatus: teacher.employeeStatus || 'Active',
      reportingTo: teacher.reportingTo || '',
      basicSalary: teacher.salaryDetails?.basicSalary || 0,
      hra: teacher.salaryDetails?.hra || 0,
      da: teacher.salaryDetails?.da || 0,
      otherAllowances: teacher.salaryDetails?.otherAllowances || 0,
      deductions: teacher.salaryDetails?.deductions || 0,
      pf: teacher.salaryDetails?.pf || 0,
      tax: teacher.salaryDetails?.tax || 0,
      bankName: teacher.salaryDetails?.bankName || '',
      accountNumber: teacher.salaryDetails?.accountNumber || '',
      ifscCode: teacher.salaryDetails?.ifscCode || '',
      isClassTeacher: teacher.isClassTeacher || false,
      classTeacherOf: teacher.classTeacherOf?._id || teacher.classTeacherOf || '',
      classTeacherStandard: teacher.classTeacherOf?.standard || '',
      classTeacherDivision: teacher.classTeacherOf?.division || '',
      subjectIds: teacher.subjectIds ? teacher.subjectIds.map(s => s._id || s) : [],
      qualifications: teacher.qualifications && teacher.qualifications.length > 0 ? teacher.qualifications.map(q => ({
        degree: q.degree || 'B.Ed',
        university: q.university || '',
        year: q.year || '',
        percentageCGPA: q.percentageCGPA || ''
      })) : [
        { degree: 'B.Ed', university: '', year: '', percentageCGPA: '' },
        { degree: 'M.Ed', university: '', year: '', percentageCGPA: '' },
      ],
      docAadhaarCard: teacher.documents?.aadhaarCard || '',
      docPanCard: teacher.documents?.panCard || '',
      docDegreeCertificates: teacher.documents?.degreeCertificates || '',
      docResume: teacher.documents?.resume || '',
    });
    setTeacherModalTab('basic');
    setShowAddTeacherModal(true);
  };

  const handleOpenAddStudent = () => {
    if (classes.length === 0) {
      toast.error('Set up grades and sections before adding students or teachers.');
      return;
    }
    setEditingStudentId(null);
    setStudentForm({
      name: '', email: '', password: '', phone: '', rollNumber: '', admissionNumber: '',
      firstName: '', middleName: '', lastName: '', fullName: '', gender: 'Male',
      dateOfBirth: '', bloodGroup: '', photo: '', aadhaarNumber: '', nationality: 'Indian',
      religion: '', casteCategory: '', mobileNumber: '', alternateMobileNumber: '',
      emailAddress: '', currentAddress: '', permanentAddress: '', city: '', state: '',
      country: 'India', pinCode: '', fatherName: '', fatherOccupation: '',
      fatherMobileNumber: '', fatherEmail: '', motherName: '', motherOccupation: '',
      motherMobileNumber: '', motherEmail: '', guardianName: '', guardianRelationship: '',
      guardianMobileNumber: '', guardianAddress: '', classStandard: '', classDivision: '',
      classId: '', division: '', house: '', academicYear: '', admissionDate: '',
      previousSchool: 'Fresh', studentStatus: 'Active', medium: 'English', subjectsEnrolled: [],
      allergies: '', medicalConditions: '', disability: '', emergencyContactName: '',
      emergencyContactRelationship: '', emergencyContactMobileNumber: '', doctorName: '',
      medicalNotes: '', usesSchoolBus: 'No', busRoute: '', busStop: '', busNumber: '',
      driverName: '', driverContact: '', libraryCardNumber: '', booksIssued: 0,
      issueDate: '', returnDate: '', fine: 0, bookStatus: '', username: '', accountStatus: 'Active',
      docBirthCertificate: '', docAadhaarCard: '', docPreviousMarksheet: '',
      docTransferCertificate: '', docLeavingCertificate: '', docPassportPhoto: '',
      docParentIdProof: '', docAddressProof: '', docIncomeCertificate: '', docCasteCertificate: '',
    });
    setStudentModalTab('basic');
    setShowAddStudentModal(true);
  };

  const handleOpenEditStudent = (student) => {
    setEditingStudentId(student._id);
    setStudentForm({
      name: student.name || '',
      email: student.email || '',
      password: '',
      phone: student.phone || '',
      rollNumber: student.rollNumber || '',
      admissionNumber: student.admissionNumber || '',
      firstName: student.firstName || '',
      middleName: student.middleName || '',
      lastName: student.lastName || '',
      fullName: student.fullName || '',
      gender: student.gender || 'Male',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '',
      bloodGroup: student.bloodGroup || '',
      photo: student.photo || '',
      aadhaarNumber: student.aadhaarNumber || '',
      nationality: student.nationality || 'Indian',
      religion: student.religion || '',
      casteCategory: student.casteCategory || '',
      mobileNumber: student.mobileNumber || '',
      alternateMobileNumber: student.alternateMobileNumber || '',
      emailAddress: student.emailAddress || student.email || '',
      currentAddress: student.currentAddress || '',
      permanentAddress: student.permanentAddress || '',
      city: student.city || '',
      state: student.state || '',
      country: student.country || 'India',
      pinCode: student.pinCode || '',
      fatherName: student.father?.name || '',
      fatherOccupation: student.father?.occupation || '',
      fatherMobileNumber: student.father?.mobileNumber || '',
      fatherEmail: student.father?.email || '',
      motherName: student.mother?.name || '',
      motherOccupation: student.mother?.occupation || '',
      motherMobileNumber: student.mother?.mobileNumber || '',
      motherEmail: student.mother?.email || '',
      guardianName: student.guardian?.name || '',
      guardianRelationship: student.guardian?.relationship || '',
      guardianMobileNumber: student.guardian?.mobileNumber || '',
      guardianAddress: student.guardian?.address || '',
      classStandard: student.classId?.standard || '',
      classDivision: student.division || student.classId?.division || '',
      classId: student.classId?._id || student.classId || '',
      division: student.division || '',
      house: student.house || '',
      academicYear: student.academicYear || '',
      admissionDate: student.admissionDate ? student.admissionDate.split('T')[0] : '',
      previousSchool: student.previousSchool || 'Fresh',
      studentStatus: student.studentStatus || 'Active',
      medium: student.medium || 'English',
      subjectsEnrolled: student.subjectsEnrolled ? student.subjectsEnrolled.map(s => s._id || s) : [],
      allergies: student.allergies || '',
      medicalConditions: student.medicalConditions || '',
      disability: student.disability || '',
      emergencyContactName: student.emergencyContact?.name || '',
      emergencyContactRelationship: student.emergencyContact?.relationship || '',
      emergencyContactMobileNumber: student.emergencyContact?.mobileNumber || '',
      doctorName: student.doctorName || '',
      medicalNotes: student.medicalNotes || '',
      usesSchoolBus: student.usesSchoolBus || 'No',
      busRoute: student.busRoute || '',
      busStop: student.busStop || '',
      busNumber: student.busNumber || '',
      driverName: student.driverName || '',
      driverContact: student.driverContact || '',
      libraryCardNumber: student.libraryCardNumber || '',
      booksIssued: student.booksIssued || 0,
      issueDate: student.issueDate ? student.issueDate.split('T')[0] : '',
      returnDate: student.returnDate ? student.returnDate.split('T')[0] : '',
      fine: student.fine || 0,
      bookStatus: student.bookStatus || '',
      username: student.username || student.email || '',
      accountStatus: student.accountStatus || 'Active',
      docBirthCertificate: student.documents?.birthCertificate || '',
      docAadhaarCard: student.documents?.aadhaarCard || '',
      docPreviousMarksheet: student.documents?.previousMarksheet || '',
      docTransferCertificate: student.documents?.transferCertificate || '',
      docLeavingCertificate: student.documents?.leavingCertificate || '',
      docPassportPhoto: student.documents?.passportPhoto || '',
      docParentIdProof: student.documents?.parentIdProof || '',
      docAddressProof: student.documents?.addressProof || '',
      docIncomeCertificate: student.documents?.incomeCertificate || '',
      docCasteCertificate: student.documents?.casteCertificate || '',
    });
    setStudentModalTab('basic');
    setShowAddStudentModal(true);
  };

  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    try {
      const pwd = teacherForm.password || '';
      if (!editingTeacherId || pwd) {
        const isValid = pwd.length >= 6 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);
        if (!isValid) {
          toast.error('Password must be at least 6 characters, contain 1 capital letter, 1 number, and 1 special character');
          return;
        }
      }
      // Structure qualifications and salaryDetails to match schema
      const payload = {
        ...teacherForm,
        classTeacherOf: teacherForm.isClassTeacher && teacherForm.classTeacherOf !== "" ? teacherForm.classTeacherOf : undefined,
        qualifications: teacherForm.qualifications.filter(q => q.university),
        salaryDetails: {
          basicSalary: Number(teacherForm.basicSalary),
          hra: Number(teacherForm.hra),
          da: Number(teacherForm.da),
          otherAllowances: Number(teacherForm.otherAllowances),
          deductions: Number(teacherForm.deductions),
          pf: Number(teacherForm.pf),
          tax: Number(teacherForm.tax),
          netSalary: Number(teacherForm.basicSalary) + Number(teacherForm.hra) + Number(teacherForm.da) + Number(teacherForm.otherAllowances) - Number(teacherForm.deductions),
          bankName: teacherForm.bankName,
          accountNumber: teacherForm.accountNumber,
          ifscCode: teacherForm.ifscCode,
        },
        documents: {
          aadhaarCard: teacherForm.docAadhaarCard,
          panCard: teacherForm.docPanCard,
          degreeCertificates: teacherForm.docDegreeCertificates,
          resume: teacherForm.docResume,
        }
      };

      if (editingTeacherId) {
        await apiClient.put(`/teachers/${editingTeacherId}`, payload);
        toast.success('Teacher updated successfully!');
      } else {
        await apiClient.post('/teachers', payload);
        toast.success('Teacher created successfully!');
      }
      setShowAddTeacherModal(false);
      setEditingTeacherId(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save teacher');
    }
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    try {
      const pwd = studentForm.password || '';
      if (!editingStudentId || pwd) {
        const isValid = pwd.length >= 6 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);
        if (!isValid) {
          toast.error('Password must be at least 6 characters, contain 1 capital letter, 1 number, and 1 special character');
          return;
        }
      }
      const payload = {
        ...studentForm,
        father: {
          name: studentForm.fatherName,
          occupation: studentForm.fatherOccupation,
          mobileNumber: studentForm.fatherMobileNumber,
          email: studentForm.fatherEmail,
        },
        mother: {
          name: studentForm.motherName,
          occupation: studentForm.motherOccupation,
          mobileNumber: studentForm.motherMobileNumber,
          email: studentForm.motherEmail,
        },
        guardian: {
          name: studentForm.guardianName,
          relationship: studentForm.guardianRelationship,
          mobileNumber: studentForm.guardianMobileNumber,
          address: studentForm.guardianAddress,
        },
        emergencyContact: {
          name: studentForm.emergencyContactName,
          relationship: studentForm.emergencyContactRelationship,
          mobileNumber: studentForm.emergencyContactMobileNumber,
        },
        documents: {
          birthCertificate: studentForm.docBirthCertificate,
          aadhaarCard: studentForm.docAadhaarCard,
          previousMarksheet: studentForm.docPreviousMarksheet,
          transferCertificate: studentForm.docTransferCertificate,
          leavingCertificate: studentForm.docLeavingCertificate,
          passportPhoto: studentForm.docPassportPhoto,
          parentIdProof: studentForm.docParentIdProof,
          addressProof: studentForm.docAddressProof,
          incomeCertificate: studentForm.docIncomeCertificate,
          casteCertificate: studentForm.docCasteCertificate,
        }
      };

      if (editingStudentId) {
        await apiClient.put(`/students/${editingStudentId}`, payload);
        toast.success('Student updated successfully!');
      } else {
        await apiClient.post('/students', payload);
        toast.success('Student created successfully!');
      }
      setShowAddStudentModal(false);
      setEditingStudentId(null);
      setStudentForm({
        name: '', email: '', password: '', phone: '', rollNumber: '', admissionNumber: '',
        firstName: '', middleName: '', lastName: '', fullName: '', gender: 'Male',
        dateOfBirth: '', bloodGroup: '', photo: '', aadhaarNumber: '', nationality: 'Indian',
        religion: '', casteCategory: '', mobileNumber: '', alternateMobileNumber: '',
        emailAddress: '', currentAddress: '', permanentAddress: '', city: '', state: '',
        country: 'India', pinCode: '', fatherName: '', fatherOccupation: '',
        fatherMobileNumber: '', fatherEmail: '', motherName: '', motherOccupation: '',
        motherMobileNumber: '', motherEmail: '', guardianName: '', guardianRelationship: '',
        guardianMobileNumber: '', guardianAddress: '', classStandard: '', classDivision: '',
        classId: '', division: '', house: '', academicYear: '', admissionDate: '',
        previousSchool: 'Fresh', studentStatus: 'Active', medium: 'English', subjectsEnrolled: [],
        allergies: '', medicalConditions: '', disability: '', emergencyContactName: '',
        emergencyContactRelationship: '', emergencyContactMobileNumber: '', doctorName: '',
        medicalNotes: '', usesSchoolBus: 'No', busRoute: '', busStop: '', busNumber: '',
        driverName: '', driverContact: '', libraryCardNumber: '', booksIssued: 0,
        issueDate: '', returnDate: '', fine: 0, bookStatus: '', username: '', accountStatus: 'Active',
        docBirthCertificate: '', docAadhaarCard: '', docPreviousMarksheet: '',
        docTransferCertificate: '', docLeavingCertificate: '', docPassportPhoto: '',
        docParentIdProof: '', docAddressProof: '', docIncomeCertificate: '', docCasteCertificate: '',
      });
      setStudentModalTab('basic');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save student');
    }
  };

  const handleDeleteTeacher = async (id) => {
    if (!window.confirm('Are you sure you want to delete this teacher?')) return;
    try {
      await apiClient.delete(`/teachers/${id}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete teacher');
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      await apiClient.delete(`/students/${id}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete student');
    }
  };

  const resetFamilyForm = () => {
    setEditingFamilyId(null);
    setFamilyForm({
      name: '',
      email: '',
      password: '',
      phone: '',
      relationshipToStudent: 'Parent',
      notes: '',
      children: [],
    });
  };

  const handleOpenEditFamily = (familyRecord) => {
    setEditingFamilyId(familyRecord._id);
    setFamilyForm({
      name: familyRecord.name || '',
      email: familyRecord.email || '',
      password: '',
      phone: familyRecord.phone || '',
      relationshipToStudent: familyRecord.relationshipToStudent || 'Parent',
      notes: familyRecord.notes || '',
      children: (familyRecord.children || []).map(child => child.studentId?._id || child.studentId),
    });
  };

  const handleFamilySubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...familyForm,
        children: familyForm.children.map(studentId => ({
          studentId,
          relation: familyForm.relationshipToStudent,
        })),
      };

      const pwd = familyForm.password || '';
      if (!editingFamilyId || pwd) {
        const isValid = pwd.length >= 6 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);
        if (!isValid) {
          toast.error('Password must be at least 6 characters, contain 1 capital letter, 1 number, and 1 special character');
          return;
        }
      }

      if (editingFamilyId) {
        await apiClient.put(`/families/${editingFamilyId}`, payload);
        toast.success('Family updated successfully!');
      } else {
        await apiClient.post('/families', payload);
        toast.success('Family created successfully!');
      }

      resetFamilyForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save family');
    }
  };

  const handleDeleteFamily = async (id) => {
    if (!window.confirm('Are you sure you want to delete this family?')) return;
    try {
      await apiClient.delete(`/families/${id}`);
      toast.success('Family deleted successfully!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete family');
    }
  };

  const handleNoticeSubmit = async (e) => {
    e.preventDefault();
    try {
      setCreatingNotice(true);
      await apiClient.post('/notices', noticeForm);
      toast.success('Notice published successfully!');
      setShowAddNoticeModal(false);
      setNoticeForm({
        title: '',
        category: 'General',
        content: '',
        targetAudience: 'All',
        priority: 'Medium',
        isPinned: false,
        attachments: [],
        visibleDays: 0
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish notice');
    } finally {
      setCreatingNotice(false);
    }
  };

  const handleNoticeFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingNoticeFile(true);
      const res = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNoticeForm(prev => ({
        ...prev,
        attachments: [res.data.url]
      }));
      toast.success('Document uploaded successfully!');
    } catch (err) {
      console.error('File upload failed', err);
      toast.error('File upload failed. Please try again.');
    } finally {
      setUploadingNoticeFile(false);
    }
  };

  const handleDeleteNotice = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;
    try {
      await apiClient.delete(`/notices/${id}`);
      toast.success('Notice deleted successfully!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete notice');
    }
  };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    if (!subjectForm.standards || subjectForm.standards.length === 0) {
      toast.error('Please assign this subject to at least one grade!');
      return;
    }
    try {
      setCreatingSubject(true);
      const payload = {
        name: subjectForm.name,
        code: subjectForm.code,
        maxMarks: subjectForm.maxMarks,
        minMarks: subjectForm.minMarks,
        standard: subjectForm.standards.join(','),
        lecturesPerStandard: subjectForm.standards.map(std => {
          const matched = subjectForm.lecturesPerStandard?.find(l => l.standard === std);
          return {
            standard: std,
            weeklyLectures: matched ? Math.ceil(Number(matched.totalPortionLectures) / 30) : 2,
            lectureDuration: matched ? matched.lectureDuration : '60',
            totalPortionLectures: matched ? Number(matched.totalPortionLectures) : 40,
            weightage: matched ? Number(matched.weightage) : 1
          };
        })
      };
      if (editingSubjectId) {
        await apiClient.put(`/subjects/${editingSubjectId}`, payload);
        toast.success('Subject updated successfully!');
      } else {
        await apiClient.post('/subjects', payload);
        toast.success('Subject created successfully!');
      }
      setShowAddSubjectModal(false);
      setEditingSubjectId(null);
      setSubjectForm({ name: '', code: '', maxMarks: 100, minMarks: 35, standards: [], lecturesPerStandard: [] });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save subject');
    } finally {
      setCreatingSubject(false);
    }
  };

  const handleDeleteSubject = async (id) => {
    try {
      await apiClient.delete(`/subjects/${id}`);
      toast.success('Subject deleted successfully!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete subject');
    }
  };

  const handleEditSubject = (sub) => {
    setEditingSubjectId(sub._id);
    setSubjectForm({
      name: sub.name,
      code: sub.code,
      maxMarks: sub.maxMarks || 100,
      minMarks: sub.minMarks || 35,
      standards: sub.standard ? sub.standard.split(',') : [],
      lecturesPerStandard: sub.lecturesPerStandard || []
    });
    setShowAddSubjectModal(true);
  };

  const handleExamSubmit = async (e) => {
    e.preventDefault();
    if (!examForm.standards || examForm.standards.length === 0) {
      toast.error('Please select at least one grade!');
      return;
    }
    try {
      setCreatingExam(true);
      if (editingExamId) {
        await apiClient.put(`/marks/exams/${editingExamId}`, {
          name: examForm.name,
          date: examForm.date || new Date().toISOString().split('T')[0],
          totalMarks: Number(examForm.maxMarks),
          passingMarks: Number(examForm.passingMarks)
        });
        toast.success('Exam updated successfully!');
      } else {
        const targetClasses = classes.filter(c => examForm.standards.includes(c.standard));
        if (targetClasses.length === 0) {
          const missing = examForm.standards.join(', ');
          toast.error(`No classes configured for: ${missing}. Please set up these classes first in Class Setup.`);
          return;
        }
        const coveredStds = new Set(targetClasses.map(c => c.standard));
        const skipped = examForm.standards.filter(s => !coveredStds.has(s));
        if (skipped.length > 0) {
          toast(`Note: No classes found for ${skipped.join(', ')} — skipped.`, { icon: '⚠️' });
        }
        for (const cls of targetClasses) {
          await apiClient.post('/marks/exams', {
            name: examForm.name,
            classId: cls._id,
            date: examForm.date || new Date().toISOString().split('T')[0],
            totalMarks: Number(examForm.maxMarks),
            passingMarks: Number(examForm.passingMarks)
          });
        }
        toast.success(`Exam created successfully for ${targetClasses.length} section(s)!`);
      }
      setShowAddExamModal(false);
      setEditingExamId(null);
      setExamForm({
        name: '',
        standards: [],
        subjectId: '',
        date: '',
        maxMarks: 100,
        passingMarks: 35
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit exam details');
    } finally {
      setCreatingExam(false);
    }
  };

  const handleDeleteExam = async (id, silent = false) => {
    try {
      // Optimistically remove from local state immediately so UI updates instantly
      setExams(prev => prev.filter(ex => ex._id !== id));
      await apiClient.delete(`/marks/exams/${id}`);
      if (!silent) {
        toast.success('Exam deleted successfully!');
      }
      // Sync with server to ensure consistency
      fetchData();
    } catch (err) {
      if (!silent) {
        toast.error(err.response?.data?.message || 'Failed to delete exam');
      }
      // Revert on failure
      fetchData();
    }
  };

  const handleFeeSubmit = async (e) => {
    e.preventDefault();
    if (!feeForm.standard) {
      toast.error('Please select a grade!');
      return;
    }
    if (!feeForm.totalAmount || Number(feeForm.totalAmount) <= 0) {
      toast.error("Please enter a valid total fee amount!");
      return;
    }
    try {
      setCreatingFee(true);
      await apiClient.post('/fees/structures', {
        standard: feeForm.standard,
        totalAmount: Number(feeForm.totalAmount),
        totalMonths: Number(feeForm.totalMonths),
        totalInstallments: Number(feeForm.totalInstallments || 4),
        academicYear: feeForm.academicYear
      });
      toast.success(editingFeeId ? 'Fee structure updated!' : 'Fee structure configured!');
      setShowSetFeeModal(false);
      setEditingFeeId(null);
      setFeeForm({ standard: '', totalAmount: '', totalMonths: 12, totalInstallments: 4, academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}` });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to configure fee');
    } finally {
      setCreatingFee(false);
    }
  };

  const handleDeleteFeeStructure = async (standard) => {
    try {
      await apiClient.delete(`/fees/structures/${standard}`);
      toast.success("Fee structure deleted successfully!");
      if (selectedFeeStd === standard) {
        setSelectedFeeStd(null);
      }
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete fee structure');
    }
  };

  const handleToggleQuarterFee = async (feeId, quarter) => {
    try {
      const res = await apiClient.put(`/fees/students/${feeId}/toggle`, { quarter });
      toast.success('Payment status updated!');
      setStudentFees(prev => prev.map(f => f._id === feeId ? res.data.fee : f));
      setAllStudentFees(prev => prev.map(f => f._id === feeId ? res.data.fee : f));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update payment status');
    }
  };

  const handleEditExam = (ex) => {
    setEditingExamId(ex._id);
    setExamForm({
      name: ex.name,
      standards: ex.classId?.standard ? [ex.classId.standard] : [],
      subjectId: ex.subjectId?._id || '',
      date: ex.date ? new Date(ex.date).toISOString().split('T')[0] : '',
      maxMarks: ex.totalMarks || 100,
      passingMarks: ex.passingMarks || 35
    });
    setShowAddExamModal(true);
  };

  const getTeacherReferenceId = (reference) => String(reference?._id || reference || '');

  const teacherHasSubjectForStandard = (teacher, subjectId, standard) => {
    const subjectKey = String(subjectId);
    const standardKey = String(standard).trim();
    const hasConfiguredAssignment = teacher.assignedSubjectStandards?.some(assignment =>
      getTeacherReferenceId(assignment.subjectId) === subjectKey &&
      assignment.standards?.some(assignedStandard => String(assignedStandard).trim() === standardKey)
    );
    const hasDivisionAssignment = teacher.subjectClassAssignments?.some(assignment =>
      getTeacherReferenceId(assignment.subjectId) === subjectKey &&
      String(assignment.classId?.standard || '').trim() === standardKey
    );
    const hasSubjectAndClassIds =
      teacher.subjectIds?.some(subject => getTeacherReferenceId(subject) === subjectKey) &&
      teacher.classIds?.some(classItem => String(classItem?.standard || '').trim() === standardKey);

    return hasConfiguredAssignment || hasDivisionAssignment || hasSubjectAndClassIds;
  };

  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = 
      t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.department?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass = !selectedClassFilter || 
      (t.classTeacherOf && (t.classTeacherOf._id === selectedClassFilter || t.classTeacherOf === selectedClassFilter)) || 
      (t.classIds && t.classIds.some(c => c._id === selectedClassFilter));

    const matchesSubject = !selectedSubjectFilter || 
      (t.subjectIds && t.subjectIds.some(s => s._id === selectedSubjectFilter));

    return matchesSearch && matchesClass && matchesSubject;
  });

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.registrationNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClass = !selectedClassId || (s.classId?._id === selectedClassId || s.classId === selectedClassId);
    
    return matchesSearch && matchesClass;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const aLast = (a.lastName || a.name || '').trim().toLowerCase();
    const bLast = (b.lastName || b.name || '').trim().toLowerCase();
    if (aLast !== bLast) return aLast.localeCompare(bLast);
    
    const aFirst = (a.firstName || '').trim().toLowerCase();
    const bFirst = (b.firstName || '').trim().toLowerCase();
    return aFirst.localeCompare(bFirst);
  });

  return (
    <div className="min-h-screen bg-[#f4ecdf] text-[#3f2a1d] flex overflow-hidden">
      <Toaster position="top-right" />
      
      {/* Collapsible Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#fffaf3] border-r border-[#d9c5b0] transform transition-transform duration-300 ease-in-out p-5 flex flex-col justify-between shadow-2xl md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:-ml-64'} shrink-0`}>
        <div className="space-y-6 flex-1 overflow-y-auto pr-1">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between border-b border-[#d9c5b0]/30 pb-4">
            <div>
              <h2 className="font-black text-[#7a4e2d] tracking-wide text-lg">SCHOOL PORTAL</h2>
              <p className="text-[10px] text-[#8a6a50] font-bold uppercase">Admin Console</p>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden rounded-full p-1.5 hover:bg-[#7a4e2d]/10 text-[#7a4e2d]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Sidebar Navigation Options */}
          <div className="space-y-4">
            <div>
              <p className="text-[10px] text-[#8a6a50] font-bold uppercase tracking-wider mb-2 px-2">Directories</p>
              <div className="space-y-1">
                 {[
                  { id: 'overview', label: 'Overview', icon: BarChart3 },
                  { id: 'teachers', label: 'Teachers List', icon: Users },
                  { id: 'students', label: 'Students List', icon: GraduationCap },
                  { id: 'families', label: 'Families List', icon: Users }
                ].map(item => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setSearchQuery('');
                        setSelectedExamName(null);
                        setSelectedExamKeys([]);
                        setSelectedManageClassStd(null);
                        setSelectedFeeStd(null);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${active ? 'bg-[#7a4e2d] text-[#f7efe4]' : 'text-[#6d4c35] hover:bg-[#7a4e2d]/10'}`}
                    >
                      <Icon className="h-4 w-4" /> {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-[#8a6a50] font-bold uppercase tracking-wider mb-2 px-2">Management</p>
              <div className="space-y-1">
                {[
                  { id: 'classes', label: 'Manage Classes', icon: GraduationCap },
                  { id: 'subjects', label: 'Manage Subjects', icon: BookOpen },
                  { id: 'exams', label: 'Manage Exams', icon: ClipboardList },
                  { id: 'national-exams', label: 'National Exam Practice', icon: BookOpenCheck },
                  { id: 'notices', label: 'Manage Notice', icon: Bell },
                  { id: 'grievances', label: 'Manage Grievance', icon: Shield },
                  { id: 'fees', label: 'Manage Fees', icon: DollarSign },
                  { id: 'teacherAssignments', label: 'Teacher Assignments', icon: BookOpenCheck },
                  { id: 'timetable', label: 'Manage Timetable', icon: Calendar },
                  { id: 'messages', label: 'Messages', icon: MessageSquare }
                ].map(item => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setSearchQuery('');
                        setSelectedExamName(null);
                        setSelectedExamKeys([]);
                        setSelectedManageClassStd(null);
                        setSelectedFeeStd(null);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${active ? 'bg-[#7a4e2d] text-[#f7efe4]' : 'text-[#6d4c35] hover:bg-[#7a4e2d]/10'}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.id === 'grievances' && (() => {
                        const count = grievances.filter(g => g.status === 'Pending').length;
                        return count > 0 ? (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white shrink-0 leading-none">
                            {count}
                          </span>
                        ) : null;
                      })()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-[#8a6a50] font-bold uppercase tracking-wider mb-2 px-2">Quick Creation</p>
              <div className="space-y-1.5">
                <button 
                  onClick={handleOpenAddTeacher} 
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#7a4e2d]/10 hover:bg-[#7a4e2d]/20 text-[#7a4e2d] transition"
                >
                  <Plus className="h-4 w-4" /> Add Teacher
                </button>
                <button 
                  onClick={handleOpenAddStudent} 
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#7a4e2d]/10 hover:bg-[#7a4e2d]/20 text-[#7a4e2d] transition"
                >
                  <Plus className="h-4 w-4" /> Add Student
                </button>
                <button 
                  onClick={() => setShowAddExamModal(true)} 
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#7a4e2d]/10 hover:bg-[#7a4e2d]/20 text-[#7a4e2d] transition"
                >
                  <Plus className="h-4 w-4" /> Add Exam
                </button>
                <button 
                  onClick={handleOpenClassSetupModal} 
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#7a4e2d]/10 hover:bg-[#7a4e2d]/20 text-[#7a4e2d] transition"
                >
                  <Settings className="h-4 w-4" /> Class Setup
                </button>
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
              className="rounded-xl border border-[#d9c5b0] bg-white p-2.5 text-[#7a4e2d] hover:bg-[#7a4e2d]/10 transition shadow-sm animate-pulse"
              title="Toggle Sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex-1 rounded-2xl bg-gradient-hero p-3.5 text-[#3f2a1d] shadow-sm flex justify-between items-center flex-wrap gap-4">
              <h1 className="text-sm md:text-base font-black tracking-tight uppercase">WELCOME ADMIN of "{schoolName || 'Your School'}"</h1>
            </div>
            <MessageNotifications
              onOpenMessages={() => openMessages()}
              onOpenConversation={openMessages}
            />
          </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#7a4e2d] border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="grid gap-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    { icon: Users, title: 'Total Students', value: students.length, tone: 'bg-sky-500/10 text-sky-700' },
                    { icon: GraduationCap, title: 'Total Teachers', value: teachers.length, tone: 'bg-emerald-500/10 text-emerald-700' },
                    {
                      icon: BookOpen,
                      title: 'Total Grades & Sections',
                      value: (() => {
                        const totalStds = classes ? [...new Set(classes.map(c => c.standard))].length : 0;
                        const totalDivs = classes ? classes.length : 0;
                        return `${totalStds} Grades / ${totalDivs} Sections`;
                      })(),
                      tone: 'bg-amber-500/10 text-amber-700'
                    },
                    { icon: Bell, title: 'Notices Published', value: noticesCount, tone: 'bg-rose-500/10 text-rose-700' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="rounded-[1.75rem] border border-[#d9c5b0] bg-[#fffaf3] p-5 shadow-sm">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-sm font-medium text-[#7f634e]">{item.title}</p>
                        <p className={`mt-1 font-black text-[#3f2a1d] truncate ${typeof item.value === 'string' && item.value.length > 10 ? 'text-xl sm:text-2xl' : 'text-3xl'}`}>
                          {item.value}
                        </p>
                      </div>
                    );
                  })}
                </div>


                {/* FEE COLLECTION CIRCULAR WIDGET */}
                {(() => {
                  // totalExpected = sum of all fee structure annual amounts configured
                  let totalExpected = 0;
                  let totalCollected = 0;

                  for (const struct of feeStructures) {
                    const qAmt = Math.round(struct.totalAmount / 4);
                    // Add the configured annual amount for this standard
                    totalExpected += struct.totalAmount;
                    // Add collected from all students in this standard
                    const stdFees = allStudentFees.filter(f => f.classId?.standard === struct.standard);
                    const collected = stdFees.reduce((acc, f) => {
                      const paid = ['q1Status','q2Status','q3Status','q4Status'].filter(k => f[k] === 'Paid').length;
                      return acc + paid * qAmt;
                    }, 0);
                    totalCollected += collected;
                  }

                  const totalPending = totalExpected - totalCollected;
                  const pct = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
                  const radius = 54;
                  const circumference = 2 * Math.PI * radius;
                  const offset = circumference - (pct / 100) * circumference;

                  if (feeStructures.length === 0) return null;

                  return (
                    <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm">
                      <h2 className="text-xl font-bold text-[#3f2a1d] mb-1">Fee Collection</h2>
                      <p className="text-sm text-[#7f634e] mb-5">Overall collection progress across all grades.</p>
                      <div className="flex flex-col sm:flex-row items-center gap-8">
                        {/* Circular SVG */}
                        <div className="relative shrink-0">
                          <svg width="140" height="140" className="-rotate-90">
                            {/* Background track */}
                            <circle cx="70" cy="70" r={radius} fill="none" stroke="#e8d9c8" strokeWidth="12" />
                            {/* Progress arc */}
                            <circle
                              cx="70" cy="70" r={radius}
                              fill="none"
                              stroke="#7a4e2d"
                              strokeWidth="12"
                              strokeLinecap="round"
                              strokeDasharray={circumference}
                              strokeDashoffset={offset}
                              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                            />
                          </svg>
                          {/* Centre text */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-[#7a4e2d]">{pct}%</span>
                            <span className="text-[10px] text-[#8a6a50] font-bold uppercase">Collected</span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex-1 space-y-3 w-full">
                          <div className="flex justify-between items-center p-3 bg-white border border-[#d9c5b0]/50 rounded-xl">
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full bg-[#7a4e2d] inline-block"></span>
                              <span className="text-xs font-bold text-[#6d4c35]">Collected</span>
                            </div>
                            <span className="font-extrabold text-[#3f2a1d] text-sm">₹{totalCollected.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white border border-[#d9c5b0]/50 rounded-xl">
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full bg-rose-400 inline-block"></span>
                              <span className="text-xs font-bold text-[#6d4c35]">Pending</span>
                            </div>
                            <span className="font-extrabold text-rose-600 text-sm">₹{totalPending.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-[#7a4e2d]/5 border border-[#d9c5b0]/50 rounded-xl">
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full bg-[#d9c5b0] inline-block"></span>
                              <span className="text-xs font-bold text-[#6d4c35]">Total</span>
                            </div>
                            <span className="font-extrabold text-[#3f2a1d] text-sm">
                              ₹{totalCollected.toLocaleString()} / ₹{totalExpected.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm space-y-4">
                    <h2 className="text-xl font-bold text-[#3f2a1d]">Upcoming Exams</h2>
                    <p className="text-sm text-[#7f634e]">Assessments grouped by exam name and date across all grades.</p>
                    
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {(() => {
                        const upcoming = exams
                          .filter(ex => ex.classId?.standard && new Date(ex.date) >= new Date(new Date().setHours(0,0,0,0)))
                          .sort((a, b) => new Date(a.date) - new Date(b.date));

                        if (upcoming.length === 0) {
                          return <p className="text-xs text-[#8a6a50] italic">No upcoming exams scheduled.</p>;
                        }

                        // Group exams by name + date
                        const grouped = {};
                        for (const ex of upcoming) {
                          const key = `${ex.name}__${ex.date}`;
                          if (!grouped[key]) {
                            grouped[key] = { name: ex.name, date: ex.date, standards: [] };
                          }
                          const std = ex.classId?.standard;
                          if (std && !grouped[key].standards.includes(std)) {
                            grouped[key].standards.push(std);
                          }
                        }

                        // Sort each group's standards in the correct school order
                        const sortedGroups = Object.values(grouped).map(group => ({
                          ...group,
                          standards: [...group.standards].sort(sortStandards)
                        }));

                        return sortedGroups.map((group, idx) => (
                          <div key={idx} className="flex justify-between items-start p-3 bg-white border border-[#d9c5b0]/60 rounded-xl shadow-xs gap-3">
                            <div>
                              <p className="font-bold text-[#3f2a1d]">{group.name}</p>
                              <p className="text-[10px] text-[#8a6a50] mt-1">
                                Grade: {group.standards.length > 0
                                  ? group.standards.map(s => s.match(/^\d+$/) ? s : s).join(', ')
                                  : 'N/A'}
                              </p>
                            </div>
                            <span className="bg-emerald-500/10 text-emerald-700 text-xs font-bold px-2 py-1 rounded-md whitespace-nowrap shrink-0">
                              {new Date(group.date).toLocaleDateString()}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
            )}

            {activeTab === 'messages' && (
              <MessagingPanel
                messageTarget={messageTarget}
                contacts={[
                  ...teachers.map(teacher => ({
                    id: teacher._id,
                    name: teacher.name,
                    email: teacher.email,
                    role: 'Teacher',
                  })),
                  ...families.map(family => ({
                    id: family._id,
                    name: family.name,
                    email: family.email,
                    role: 'Family',
                  })),
                ]}
              />
            )}

            {activeTab === 'national-exams' && <NationalExamManager />}

            {/* TEACHERS TAB */}
            {activeTab === 'teachers' && (
              <div className="space-y-6">
                {/* Header row */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-[#3f2a1d]">👩‍🏫 Teachers by Grade</h2>
                    <p className="text-xs text-[#8a6a50] mt-1">Subjects assigned per grade, with teachers linked to each subject.</p>
                  </div>
                  <button
                    onClick={() => { setShowAddTeacherModal(true); resetTeacherForm(); }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#7a4e2d] text-[#f7efe4] text-xs font-bold hover:bg-[#624021] transition shadow-sm"
                  >
                    <Plus className="h-4 w-4" /> Add Teacher
                  </button>
                </div>

                {(() => {
                  // All unique standards that have at least a class or a subject
                  const allStds = [...new Set([
                    ...classes.map(c => c.standard),
                    ...subjects.flatMap(s => s.standard ? s.standard.split(',').map(x => x.trim()) : [])
                  ])].sort(sortStandards);

                  if (allStds.length === 0) {
                    return (
                      <div className="text-center py-20 text-[#8a6a50]">
                        <Users className="h-14 w-14 mx-auto mb-4 opacity-25" />
                        <p className="font-bold text-base">No grades or subjects configured yet.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      {allStds.map(std => {
                        // Subjects assigned to this standard
                        const stdSubjects = subjects.filter(s =>
                          s.standard && s.standard.split(',').map(x => x.trim()).includes(std)
                        );

                        return (() => {
                          const isOpen = expandedStds.has(std);
                          const toggleStd = () => setExpandedStds(prev => {
                            const next = new Set(prev);
                            next.has(std) ? next.delete(std) : next.add(std);
                            return next;
                          });

                          // Count total teachers assigned across all subjects in this standard
                          const totalTeachers = new Set(
                            teachers
                              .filter(teacher => stdSubjects.some(subject =>
                                teacherHasSubjectForStandard(teacher, subject._id, std)
                              ))
                              .map(teacher => getTeacherReferenceId(teacher._id))
                          ).size;

                          return (
                            <div key={std} className="rounded-3xl border border-[#d9c5b0] bg-[#fffaf3] shadow-sm overflow-hidden">
                              {/* Clickable Standard Header */}
                              <button
                                type="button"
                                onClick={toggleStd}
                                className="w-full flex items-center gap-4 px-6 py-5 hover:bg-[#7a4e2d]/5 transition text-left"
                              >
                                {/* Badge */}
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7a4e2d] text-white font-black text-base shrink-0">
                                  {std.match(/^\d+$/) ? std : std.charAt(0).toUpperCase()}
                                </div>

                                {/* Title + subtitle */}
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-base font-black text-[#3f2a1d]">
                                    {std.match(/^\d+$/) ? `Grade ${std}` : std}
                                  </h3>
                                  <div className="flex gap-3 mt-0.5 flex-wrap">
                                    <span className="text-[10px] font-bold text-[#8a6a50]">
                                      📚 {stdSubjects.length} subject{stdSubjects.length !== 1 ? 's' : ''}
                                    </span>
                                    <span className="text-[10px] font-bold text-[#8a6a50]">
                                      👩‍🏫 {totalTeachers} teacher{totalTeachers !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </div>

                                {/* Chevron */}
                                <svg
                                  className={`h-5 w-5 text-[#8a6a50] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>

                              {/* Expandable body */}
                              {isOpen && (
                                <div className="border-t border-[#d9c5b0] p-5 space-y-4 bg-white/50">
                                  {stdSubjects.length === 0 ? (
                                    <p className="text-xs text-[#8a6a50] italic text-center py-4">No subjects assigned to this grade yet.</p>
                                  ) : (
                                    stdSubjects.map(sub => {
                                      const subTeachers = teachers.filter(teacher =>
                                        teacherHasSubjectForStandard(teacher, sub._id, std)
                                      );
                                      return (
                                        <div key={sub._id} className="rounded-2xl border border-[#d9c5b0]/70 bg-white p-4 space-y-3">
                                          {/* Subject row */}
                                          <div className="flex items-center gap-2">
                                            <BookOpen className="h-4 w-4 text-[#7a4e2d] shrink-0" />
                                            <span className="font-black text-[#3f2a1d] text-sm">{sub.name}</span>
                                            {sub.code && (
                                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7a4e2d]/10 text-[#7a4e2d]">{sub.code}</span>
                                            )}
                                            <span className="ml-auto text-[10px] text-[#8a6a50]">{subTeachers.length} teacher{subTeachers.length !== 1 ? 's' : ''}</span>
                                          </div>
                                          {/* Teachers */}
                                          {subTeachers.length === 0 ? (
                                            <p className="text-[10px] text-[#8a6a50] italic pl-6">No teacher assigned to this subject yet.</p>
                                          ) : (
                                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 pl-2">
                                              {subTeachers.map(teacher => (
                                                <div key={teacher._id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#d9c5b0]/50 bg-[#fffaf3] hover:border-[#7a4e2d]/40 transition">
                                                  <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="h-8 w-8 rounded-xl bg-[#7a4e2d]/15 flex items-center justify-center text-[#7a4e2d] font-black text-xs shrink-0">
                                                      {teacher.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                      <p className="font-bold text-[#3f2a1d] text-xs leading-tight truncate">{teacher.name}</p>
                                                      <p className="text-[10px] text-[#8a6a50] truncate">{teacher.email}</p>
                                                      {teacher.phone && <p className="text-[10px] text-[#8a6a50]">{teacher.phone}</p>}
                                                    </div>
                                                  </div>
                                                  <div className="flex gap-1 shrink-0">
                                                    <button onClick={() => handleOpenEditTeacher(teacher)} className="p-1.5 text-[#7a4e2d] hover:bg-[#7a4e2d]/10 rounded-lg transition" title="Edit Teacher">
                                                      <Edit className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button onClick={() => handleDeleteTeacher(teacher._id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition" title="Delete Teacher">
                                                      <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}

                                  {/* Unassigned teachers */}
                                  {(() => {
                                    const assignedTeacherIds = new Set(
                                      teachers
                                        .filter(teacher => stdSubjects.some(subject =>
                                          teacherHasSubjectForStandard(teacher, subject._id, std)
                                        ))
                                        .map(teacher => getTeacherReferenceId(teacher._id))
                                    );
                                    const stdClassIds = new Set(
                                      classes.filter(classItem => classItem.standard === std)
                                        .map(classItem => getTeacherReferenceId(classItem._id))
                                    );
                                    const unassigned = teachers.filter(t =>
                                      !assignedTeacherIds.has(getTeacherReferenceId(t._id)) &&
                                      (
                                        t.classIds?.some(classItem =>
                                          String(classItem?.standard || '').trim() === String(std).trim() ||
                                          stdClassIds.has(getTeacherReferenceId(classItem))
                                        ) ||
                                        stdClassIds.has(getTeacherReferenceId(t.classTeacherOf))
                                      )
                                    );
                                    if (unassigned.length === 0) return null;
                                    return (
                                      <div className="rounded-2xl border border-dashed border-[#d9c5b0] bg-white/60 p-4 space-y-2">
                                        <p className="text-[10px] font-bold text-[#8a6a50] uppercase">Teachers without subject assignment</p>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                          {unassigned.map(teacher => (
                                            <div key={teacher._id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#d9c5b0]/40 bg-white">
                                              <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-black text-xs shrink-0">
                                                  {teacher.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                  <p className="font-bold text-[#3f2a1d] text-xs leading-tight truncate">{teacher.name}</p>
                                                  <p className="text-[10px] text-[#8a6a50] truncate">{teacher.email}</p>
                                                </div>
                                              </div>
                                              <div className="flex gap-1 shrink-0">
                                                <button onClick={() => handleOpenEditTeacher(teacher)} className="p-1.5 text-[#7a4e2d] hover:bg-[#7a4e2d]/10 rounded-lg transition" title="Edit"><Edit className="h-3.5 w-3.5" /></button>
                                                <button onClick={() => handleDeleteTeacher(teacher._id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          );
                        })();
                      })}
                    </div>
                  );
                })()}
              </div>
            )}


            {/* STUDENTS TAB */}
            {activeTab === 'students' && (
              <div className="space-y-4">
                {!selectedStandard ? (
                  <div className="space-y-6">
                    <div className="bg-[#fffaf3] border border-[#d9c5b0] rounded-3xl p-6 shadow-sm">
                      <h3 className="text-lg font-bold text-[#3f2a1d] mb-1">Grade-Wise Student Records</h3>
                      <p className="text-sm text-[#8a6a50]">Select a grade and section card below to view its enrolled students.</p>
                    </div>

                    {classes.length === 0 ? (
                      <div className="text-center py-12 rounded-3xl border border-dashed border-[#d9c5b0] bg-[#fffaf3]">
                        <p className="text-[#8a6a50] font-semibold">No classes or grades configured yet.</p>
                        <p className="text-xs text-[#b68c67] mt-1">Click the "Class Setup" button above to configure your school grades.</p>
                      </div>
                    ) : (
                      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {[...new Set(classes.map(c => c.standard))].sort(sortStandards).map((std) => {
                          const divisions = [...new Set(classes.filter(c => c.standard === std).map(c => c.division))].sort();
                          return (
                            <div key={std} className="rounded-3xl border border-[#d9c5b0] bg-[#fffaf3] p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4">
                              <div>
                                <h4 className="text-2xl font-black text-[#7a4e2d]">{std}</h4>
                                <p className="text-xs text-[#8a6a50] mt-1 font-medium">{divisions.length} section(s) available</p>
                              </div>
                              <div className="pt-2 border-t border-[#f4ecdf]">
                                <p className="text-[10px] uppercase tracking-[0.1em] font-semibold text-[#b68c67] mb-2">Sections</p>
                                <div className="flex flex-wrap gap-2">
                                  {divisions.map((div) => {
                                    const classObj = classes.find(c => c.standard === std && c.division === div);
                                    return (
                                      <button
                                        key={div}
                                        onClick={() => {
                                          setSelectedStandard(std);
                                          setSelectedDivision(div);
                                          setSelectedClassId(classObj?._id);
                                        }}
                                        className="px-3.5 py-1.5 text-xs font-extrabold rounded-xl bg-[#7a4e2d] text-[#f7efe4] hover:bg-[#624021] transition shadow-sm"
                                      >
                                        {div}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Header back button */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-[#fffaf3] border border-[#d9c5b0] rounded-3xl p-5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setSelectedStandard(null);
                            setSelectedDivision(null);
                            setSelectedClassId(null);
                          }}
                          className="flex items-center gap-1 bg-[#7a4e2d] text-[#f7efe4] hover:bg-[#624021] text-xs font-bold px-3 py-1.5 rounded-xl transition"
                        >
                          ← Back
                        </button>
                        <div>
                          <h3 className="text-lg font-bold text-[#3f2a1d]">
                            Grade {selectedStandard} &mdash; Section {selectedDivision}
                          </h3>
                          <p className="text-xs text-[#8a6a50]">Sorted by last name in ascending order</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#7a4e2d]/10 text-[#7a4e2d]">
                        {sortedStudents.length} Student(s)
                      </span>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-4 top-3.5 h-5 w-5 text-[#b68c67]" />
                      <input
                        type="text"
                        placeholder="Search students in this class by name, email, roll number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-2xl border border-[#d9c5b0] bg-[#fffaf3] py-3 pl-12 pr-4 outline-none focus:border-[#7a4e2d]"
                      />
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      {sortedStudents.length > 0 ? (
                        sortedStudents.map((student) => (
                          <div key={student._id} className="rounded-3xl border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm space-y-4 hover:shadow-md transition">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-xl font-bold text-[#3f2a1d]">
                                  {student.name}
                                </h3>
                                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#7a4e2d]/10 text-[#7a4e2d]">
                                  Roll: {student.rollNumber || 'Not Assigned'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button 
                                  type="button"
                                  onClick={() => handleOpenEditStudent(student)}
                                  className="p-2 text-[#7a4e2d] hover:bg-[#7a4e2d]/10 rounded-xl transition"
                                  title="Edit Student"
                                >
                                  <Edit className="h-5 w-5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteStudent(student._id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition"
                                  title="Delete Student"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm border-t border-[#f4ecdf] pt-4">
                              <div className="flex items-center gap-2 text-[#6d4c35]">
                                <Mail className="h-4 w-4 text-[#b68c67]" />
                                <span className="truncate">{student.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[#6d4c35]">
                                <BookOpen className="h-4 w-4 text-[#b68c67]" />
                                <span>Grade: {student.classId?.standard || 'N/A'} | Section: {student.division || 'N/A'}</span>
                              </div>
                            </div>

                            <div className="flex justify-end pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudentForDetails(student);
                                  setShowStudentDetailsModal(true);
                                }}
                                className="text-xs font-bold text-[#7a4e2d] bg-[#7a4e2d]/10 hover:bg-[#7a4e2d]/20 px-3 py-1.5 rounded-xl transition"
                              >
                                View Full Details
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 text-center py-10 text-[#8a6a50]">
                          No students found matching current criteria.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FAMILIES TAB */}
            {activeTab === 'families' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-[#3f2a1d]">👨‍👩‍👧‍👦 Family Records</h2>
                    <p className="text-xs text-[#8a6a50] mt-1">Admin-managed family profiles linked to one or more students.</p>
                  </div>
                  <button
                    type="button"
                    onClick={resetFamilyForm}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#7a4e2d] text-[#f7efe4] text-xs font-bold hover:bg-[#624021] transition shadow-sm"
                  >
                    <Plus className="h-4 w-4" /> Add Family
                  </button>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-black text-[#3f2a1d]">{editingFamilyId ? 'Edit family profile' : 'Create family profile'}</h3>
                    </div>

                    <form onSubmit={handleFamilySubmit} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[#8a6a50]">Full name</label>
                          <input value={familyForm.name} onChange={(e) => setFamilyForm(prev => ({ ...prev, name: e.target.value }))} className="w-full rounded-xl border border-[#d9c5b0] bg-white px-3 py-2.5 text-sm text-[#3f2a1d] outline-none focus:border-[#7a4e2d]" required />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[#8a6a50]">Email</label>
                          <input type="email" value={familyForm.email} onChange={(e) => setFamilyForm(prev => ({ ...prev, email: e.target.value }))} className="w-full rounded-xl border border-[#d9c5b0] bg-white px-3 py-2.5 text-sm text-[#3f2a1d] outline-none focus:border-[#7a4e2d]" required />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[#8a6a50]">Phone</label>
                          <input value={familyForm.phone} onChange={(e) => setFamilyForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full rounded-xl border border-[#d9c5b0] bg-white px-3 py-2.5 text-sm text-[#3f2a1d] outline-none focus:border-[#7a4e2d]" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[#8a6a50]">Relationship</label>
                          <select value={familyForm.relationshipToStudent} onChange={(e) => setFamilyForm(prev => ({ ...prev, relationshipToStudent: e.target.value }))} className="w-full rounded-xl border border-[#d9c5b0] bg-white px-3 py-2.5 text-sm text-[#3f2a1d] outline-none focus:border-[#7a4e2d]">
                            <option value="Parent">Parent</option>
                            <option value="Mother">Mother</option>
                            <option value="Father">Father</option>
                            <option value="Guardian">Guardian</option>
                            <option value="Grandparent">Grandparent</option>
                          </select>
                        </div>
                        {!editingFamilyId && (
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[#8a6a50]">Password</label>
                            <input type="password" value={familyForm.password} onChange={(e) => setFamilyForm(prev => ({ ...prev, password: e.target.value }))} className="w-full rounded-xl border border-[#d9c5b0] bg-white px-3 py-2.5 text-sm text-[#3f2a1d] outline-none focus:border-[#7a4e2d]" placeholder="At least 6 chars with caps, number, special symbol" required={!editingFamilyId} />
                          </div>
                        )}
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[#8a6a50]">Linked students</label>
                          <select multiple value={familyForm.children} onChange={(e) => {
                            const selected = Array.from(e.target.selectedOptions, option => option.value);
                            setFamilyForm(prev => ({ ...prev, children: selected }));
                          }} className="min-h-[120px] w-full rounded-xl border border-[#d9c5b0] bg-white px-3 py-2.5 text-sm text-[#3f2a1d] outline-none focus:border-[#7a4e2d]">
                            {students.length === 0 ? (
                              <option value="">No students available</option>
                            ) : (
                              students.map(student => (
                                <option key={student._id} value={student._id}>
                                  {student.name} ({student.classId?.standard || 'N/A'} - {student.division || 'N/A'})
                                </option>
                              ))
                            )}
                          </select>
                          <p className="mt-1 text-[10px] text-[#8a6a50]">Hold Ctrl/Cmd to select multiple children.</p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[#8a6a50]">Notes</label>
                          <textarea value={familyForm.notes} onChange={(e) => setFamilyForm(prev => ({ ...prev, notes: e.target.value }))} rows="3" className="w-full rounded-xl border border-[#d9c5b0] bg-white px-3 py-2.5 text-sm text-[#3f2a1d] outline-none focus:border-[#7a4e2d]" />
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        {editingFamilyId && (
                          <button type="button" onClick={resetFamilyForm} className="rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-4 py-2 text-sm font-semibold text-[#8a6a50] hover:bg-[#f4ecdf] transition">
                            Cancel
                          </button>
                        )}
                        <button type="submit" className="rounded-xl bg-[#7a4e2d] px-4 py-2 text-sm font-bold text-[#f7efe4] hover:bg-[#624021] transition">
                          {editingFamilyId ? 'Update Family' : 'Create Family'}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm">
                    <h3 className="text-lg font-black text-[#3f2a1d] mb-4">Family directory</h3>
                    <div className="space-y-3">
                      {families.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#d9c5b0] bg-white/60 p-5 text-sm text-[#8a6a50] text-center">
                          No family profiles have been created yet.
                        </div>
                      ) : (
                        families.map((familyRecord) => (
                          <div key={familyRecord._id} className="rounded-2xl border border-[#d9c5b0] bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-base font-black text-[#3f2a1d]">{familyRecord.name}</p>
                                <p className="text-xs text-[#8a6a50]">{familyRecord.email}</p>
                              </div>
                              <div className="flex gap-1">
                                <button type="button" onClick={() => handleOpenEditFamily(familyRecord)} className="p-1.5 text-[#7a4e2d] hover:bg-[#7a4e2d]/10 rounded-lg transition" title="Edit family">
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button type="button" onClick={() => handleDeleteFamily(familyRecord._id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition" title="Delete family">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a6a50]">
                              <span className="rounded-full bg-[#7a4e2d]/10 px-2 py-1">{familyRecord.children?.length || 0} children</span>
                              <span className="rounded-full bg-[#7a4e2d]/10 px-2 py-1">{familyRecord.relationshipToStudent || 'Parent'}</span>
                            </div>

                            {familyRecord.children?.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {familyRecord.children.map((child) => (
                                  <div key={child.studentId?._id || child.studentId} className="rounded-xl border border-[#d9c5b0]/70 bg-[#fffaf3] p-2 text-xs text-[#6d4c35]">
                                    {child.studentName || 'Linked student'} · {child.studentClass || 'Class not assigned'}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CLASSES DIRECTORY TAB */}
            {activeTab === 'classes' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#3f2a1d]">Classes & Sections Directory</h2>
                    <p className="text-sm text-[#7f634e]">View, add sections, or delete classes. Deleting a section will automatically redistribute students.</p>
                  </div>
                  <button
                    onClick={handleOpenClassSetupModal}
                    className="flex items-center gap-2 rounded-xl bg-[#7a4e2d] px-4 py-2.5 text-sm font-bold text-[#f7efe4] hover:bg-[#624021] transition shadow-sm"
                  >
                    <Settings className="h-4 w-4" /> Class Setup Config
                  </button>
                </div>
                {classes && classes.length > 0 ? (() => {
                  // Group classes by standard
                  const grouped = {};
                  for (const cls of classes) {
                    const std = cls.standard;
                    if (!grouped[std]) grouped[std] = [];
                    grouped[std].push(cls);
                  }
                  
                  const sortedStds = Object.keys(grouped).sort(sortStandards);

                  // IF A STANDARD IS SELECTED: SHOW DETAILED VIEW (INSIDE VIEW)
                  if (selectedManageClassStd) {
                    const divs = grouped[selectedManageClassStd];
                    if (!divs || divs.length === 0) {
                      setSelectedManageClassStd(null);
                      return null;
                    }
                    const sortedDivs = divs.sort((a, b) => a.division.localeCompare(b.division));
                    const stdLabel = selectedManageClassStd.match(/^\d+$/) ? `Grade ${selectedManageClassStd}` : selectedManageClassStd;
                    const totalStudents = students.filter(s => sortedDivs.some(cls => s.classId?._id === cls._id || s.classId === cls._id)).length;

                    return (
                      <div className="rounded-3xl border border-[#d9c5b0] bg-white p-6 shadow-md space-y-6">
                        {/* Detail View Header */}
                        <div className="flex items-center justify-between border-b border-[#f4ecdf] pb-4 flex-wrap gap-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setSelectedManageClassStd(null)}
                              className="flex items-center gap-1 bg-[#7a4e2d] text-[#f7efe4] hover:bg-[#624021] text-xs font-bold px-3 py-1.5 rounded-xl transition"
                            >
                              ← Back
                            </button>
                            <div>
                              <h3 className="text-xl font-black text-[#3f2a1d]">{stdLabel}</h3>
                              <p className="text-xs text-[#8a6a50] font-medium mt-0.5">
                                Sections: <span className="font-bold">{sortedDivs.length}</span> | Total Students: <span className="font-bold">{totalStudents}</span>
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddDivision(selectedManageClassStd)}
                            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                          >
                            <Plus className="h-4 w-4" /> Add Section
                          </button>
                        </div>

                        {/* List of Divisions in Detail View */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-[#8a6a50] uppercase tracking-wider">Configured Sections</h4>
                          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                            {sortedDivs.map(cls => (
                              <div key={cls._id} className="p-4 rounded-2xl border border-[#d9c5b0]/40 bg-[#fffaf3] flex items-center justify-between shadow-sm hover:shadow-md transition">
                                <div>
                                  <span className="text-sm font-bold text-[#3f2a1d]">Section {cls.division}</span>
                                  <p className="text-xs text-[#8a6a50] mt-0.5">Students: {students.filter(s => s.classId?._id === cls._id || s.classId === cls._id).length}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDeleteClass(cls._id);
                                  }}
                                  className="text-rose-600 hover:bg-rose-100 p-2 rounded-xl transition"
                                  title={`Delete Section ${cls.division}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // DEFAULT VIEW: LIST OF STANDARDS (OUTSIDE VIEW)
                  return (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {sortedStds.map(std => {
                        const divs = grouped[std];
                        const stdLabel = std.match(/^\d+$/) ? `Grade ${std}` : std;
                        const totalStudents = students.filter(s => divs.some(cls => s.classId?._id === cls._id || s.classId === cls._id)).length;

                        return (
                          <div
                            key={std}
                            onClick={() => setSelectedManageClassStd(std)}
                            className="rounded-3xl border border-[#d9c5b0] bg-white p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between cursor-pointer group hover:border-[#7a4e2d]"
                          >
                            <div className="space-y-4">
                              {/* Header: Standard Name and Delete Class */}
                              <div className="flex justify-between items-start gap-3">
                                <div>
                                  <h3 className="text-base font-black text-[#3f2a1d] group-hover:text-[#7a4e2d] transition">{stdLabel}</h3>
                                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                                    Total Divisions: {divs.length}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation(); // prevent card click
                                    if (window.confirm(`Are you sure you want to delete the whole Grade "${stdLabel}" and all of its sections?`)) {
                                      handleDeleteStandard(std);
                                    }
                                  }}
                                  className="text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition"
                                  title="Delete Whole Class"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>

                              {/* Division and Student counts */}
                              <div className="grid grid-cols-2 gap-2 text-center text-xs bg-[#fffaf3] border border-[#d9c5b0]/30 p-2.5 rounded-xl">
                                <div>
                                  <span className="text-[10px] text-[#8a6a50] uppercase font-bold">Sections</span>
                                  <p className="font-extrabold text-[#6d4c35] mt-0.5">{divs.length}</p>
                                </div>
                                <div className="border-l border-[#d9c5b0]/30">
                                  <span className="text-[10px] text-[#8a6a50] uppercase font-bold">Students</span>
                                  <p className="font-extrabold text-[#6d4c35] mt-0.5">{totalStudents}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })() : (
                  <div className="col-span-4 text-center py-12 text-[#8a6a50] rounded-2xl border border-dashed border-[#d9c5b0] bg-[#fffaf3]">
                    No classes configured yet. Click "Class Setup Config" to configure your standards.
                  </div>
                )}
              </div>
            )}

            {/* GRIEVANCES TAB */}
            {/* SUBJECTS TAB */}
            {activeTab === 'subjects' && (
              <div className="space-y-6">
                <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#3f2a1d]">Subject Directory</h2>
                    <p className="text-sm text-[#7f634e]">Configure academic subjects, syllabus parameters, and map them grade-wise.</p>
                  </div>
                  <button
                    onClick={() => setShowAddSubjectModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-[#7a4e2d] px-4 py-2.5 text-sm font-bold text-[#f7efe4] hover:bg-[#624021] transition shadow-sm"
                  >
                    <Plus className="h-4 w-4" /> Add Subject
                  </button>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {subjects && subjects.length > 0 ? (
                    subjects.map((sub) => (
                      <div key={sub._id} className="rounded-3xl border border-[#d9c5b0] bg-white p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between group hover:border-[#7a4e2d]">
                        <div className="space-y-4">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h3 className="font-bold text-base text-[#3f2a1d] group-hover:text-[#7a4e2d] transition">{sub.name}</h3>
                              <p className="text-[10px] text-gray-500 font-mono mt-0.5">Code: {sub.code}</p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEditSubject(sub)}
                                className="text-[#7a4e2d] hover:bg-[#faf4ea] p-1.5 rounded-lg transition"
                                title="Edit Subject"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSubject(sub._id)}
                                className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition"
                                title="Delete Subject"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Marks Info */}
                          {(() => {
                            const stdsCount = sub.standard
                              ? sub.standard.split(',').map(s => s.trim()).filter(Boolean).length
                              : 0;
                            return (
                              <div className="grid grid-cols-3 gap-2 text-center text-xs bg-[#fffaf3] border border-[#d9c5b0]/30 p-2.5 rounded-xl">
                                <div>
                                  <span className="text-[10px] text-[#8a6a50] uppercase font-bold">Max Marks</span>
                                  <p className="font-extrabold text-[#6d4c35] mt-0.5">{sub.maxMarks || 100}</p>
                                </div>
                                <div className="border-l border-[#d9c5b0]/30">
                                  <span className="text-[10px] text-[#8a6a50] uppercase font-bold">Passing Marks</span>
                                  <p className="font-extrabold text-[#6d4c35] mt-0.5">{sub.minMarks || 35}</p>
                                </div>
                                <div className="border-l border-[#d9c5b0]/30">
                                  <span className="text-[10px] text-[#8a6a50] uppercase font-bold">Total Grades</span>
                                  <p className="font-extrabold text-[#6d4c35] mt-0.5">{stdsCount}</p>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Small Standards Text */}
                          <div className="pt-2 border-t border-[#f4ecdf]">
                            <span className="text-[9px] font-bold text-[#8a6a50] uppercase tracking-wider block">Assigned Grades</span>
                            <p className="text-xs font-semibold text-[#7a4e2d] truncate mt-0.5">
                              {sub.standard ? sub.standard.split(',').sort(sortStandards).map(s => s.match(/^\d+$/) ? `Grade ${s}` : s).join(', ') : 'All Grades'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-4 text-center py-10 text-[#8a6a50] rounded-2xl border border-dashed border-[#d9c5b0] bg-[#fffaf3]">
                      No subjects configured yet. Click "Add Subject" to define your curriculum.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* EXAMS DIRECTORY TAB */}
            {activeTab === 'exams' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#3f2a1d]">Exams & Assessments Directory</h2>
                    <p className="text-sm text-[#7f634e]">Click a grade card to view and manage its exams.</p>
                  </div>
                  <button
                    onClick={() => setShowAddExamModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-[#7a4e2d] px-4 py-2.5 text-sm font-bold text-[#f7efe4] hover:bg-[#624021] transition shadow-sm"
                  >
                    <Plus className="h-4 w-4" /> Add Exam
                  </button>
                </div>

                {!exams || exams.filter(ex => ex.classId?.standard).length === 0 ? (
                  <div className="text-center py-12 text-[#8a6a50] rounded-2xl border border-dashed border-[#d9c5b0] bg-[#fffaf3]">
                    No exams configured yet. Click "Add Exam" to get started.
                  </div>
                ) : (() => {
                  const validExams = exams.filter(ex => ex.classId?.standard);
                  
                  // Group valid exams by name and date to distinguish exams of different dates
                  const groupedByGroupKey = {};
                  for (const ex of validExams) {
                    const dateStr = ex.date ? new Date(ex.date).toISOString().split('T')[0] : '';
                    const groupKey = `${ex.name}_${dateStr}`;
                    if (!groupedByGroupKey[groupKey]) groupedByGroupKey[groupKey] = [];
                    groupedByGroupKey[groupKey].push(ex);
                  }
                  const examGroupKeys = Object.keys(groupedByGroupKey).sort();

                  // IF AN EXAM IS SELECTED: SHOW DETAILED VIEW (INSIDE VIEW)
                  if (selectedExamName) {
                    const examList = groupedByGroupKey[selectedExamName];
                    if (!examList || examList.length === 0) {
                      setSelectedExamName(null);
                      return null;
                    }
                    const date = examList[0].date;
                    const maxMarks = examList[0].totalMarks;
                    const passingMarks = examList[0].passingMarks;
                    
                    const selectedForThisExam = selectedExamKeys.filter(id => examList.some(e => e._id === id));
                    const allSelected = examList.every(e => selectedExamKeys.includes(e._id));
                    const selectedStudentsCount = students.filter(s => {
                      const selectedExs = examList.filter(e => selectedExamKeys.includes(e._id));
                      return selectedExs.some(e => (e.classId?._id || e.classId) === (s.classId?._id || s.classId));
                    }).length;
                    
                    const handleToggleSelectAll = () => {
                      const examIds = examList.map(e => e._id);
                      if (allSelected) {
                        setSelectedExamKeys(prev => prev.filter(id => !examIds.includes(id)));
                      } else {
                        setSelectedExamKeys(prev => [...new Set([...prev, ...examIds])]);
                      }
                    };
                    
                    const handleDeleteSelectedForThisExam = async () => {
                      if (selectedForThisExam.length === 0) return;
                      const toDelete = [...selectedForThisExam];
                      const last = toDelete.pop();
                      await Promise.all([
                        ...toDelete.map(id => handleDeleteExam(id, true)),
                        handleDeleteExam(last, false)
                      ]);
                      setSelectedExamKeys(prev => prev.filter(id => !selectedForThisExam.includes(id)));
                    };

                    return (
                      <div className="rounded-3xl border border-[#d9c5b0] bg-white p-6 shadow-md space-y-6">
                        {/* Header Row */}
                        <div className="flex items-center justify-between border-b border-[#f4ecdf] pb-4 flex-wrap gap-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => { setSelectedExamName(null); setSelectedExamKeys([]); }}
                              className="flex items-center gap-1 bg-[#7a4e2d] text-[#f7efe4] hover:bg-[#624021] text-xs font-bold px-3 py-1.5 rounded-xl transition"
                            >
                              ← Back
                            </button>
                            <div>
                              <h3 className="text-xl font-black text-[#3f2a1d]">{examList[0]?.name}</h3>
                              <p className="text-xs text-gray-500 font-mono mt-0.5">
                                📅 Date: {new Date(date).toLocaleDateString()} | Max: {maxMarks} | Pass: {passingMarks}
                              </p>
                              <p className="text-[10px] text-[#8a6a50] font-semibold mt-1">
                                Selected Students: <span className="font-bold text-[#7a4e2d]">{selectedStudentsCount}</span> (from {selectedForThisExam.length} selected classes)
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={handleToggleSelectAll}
                              className="text-xs font-bold text-[#7a4e2d] hover:underline"
                            >
                              {allSelected ? 'Deselect All' : 'Select All'}
                            </button>
                            {selectedForThisExam.length > 0 && (
                              <button
                                type="button"
                                onClick={handleDeleteSelectedForThisExam}
                                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition"
                              >
                                <Trash2 className="h-3 w-3" /> Delete Selected ({selectedForThisExam.length})
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inside checklist: Standards & Divisions */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-[#8a6a50] uppercase tracking-wider">Assigned Classes & Sections Checklist</h4>
                          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                            {(() => {
                              const stdGrouped = {};
                              for (const ex of examList) {
                                const std = ex.classId.standard;
                                if (!stdGrouped[std]) stdGrouped[std] = [];
                                stdGrouped[std].push(ex);
                              }
                              const sortedStds = Object.keys(stdGrouped).sort(sortStandards);

                              return sortedStds.map(std => {
                                const stdExams = stdGrouped[std].sort((a, b) => a.classId.division.localeCompare(b.classId.division));
                                const stdLabel = std.match(/^\d+$/) ? `Grade ${std}` : std;
                                const stdExamIds = stdExams.map(e => e._id);
                                const allStdSelected = stdExamIds.every(id => selectedExamKeys.includes(id));
                                
                                const handleToggleStd = () => {
                                  if (allStdSelected) {
                                    setSelectedExamKeys(prev => prev.filter(id => !stdExamIds.includes(id)));
                                  } else {
                                    setSelectedExamKeys(prev => [...new Set([...prev, ...stdExamIds])]);
                                  }
                                };

                                return (
                                  <div key={std} className="p-4 rounded-2xl border border-[#d9c5b0]/40 bg-[#fffaf3] space-y-3 flex flex-col justify-between hover:shadow-sm transition">
                                    <div className="flex items-center justify-between border-b border-[#f4ecdf] pb-2">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={allStdSelected}
                                          onChange={handleToggleStd}
                                          className="h-4 w-4 rounded border-[#d9c5b0] text-rose-600 focus:ring-rose-400 cursor-pointer"
                                        />
                                        <span className="text-sm font-bold text-[#7a4e2d]">{stdLabel}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const toDelete = [...stdExams];
                                          const last = toDelete.pop();
                                          await Promise.all([
                                            ...toDelete.map(e => handleDeleteExam(e._id, true)),
                                            handleDeleteExam(last._id, false)
                                          ]);
                                        }}
                                        className="text-rose-600 hover:bg-rose-100 p-1.5 rounded-lg transition"
                                        title={`Delete Exam for ${stdLabel}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {stdExams.map(ex => (
                                        <div key={ex._id} className="bg-white border border-[#d9c5b0]/40 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#3f2a1d]">
                                          Div {ex.classId.division}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // DEFAULT VIEW: LIST OF EXAMS (OUTSIDE VIEW)
                  return (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {examGroupKeys.map(groupKey => {
                        const examList = groupedByGroupKey[groupKey];
                        const examName = examList[0].name;
                        const date = examList[0].date;
                        const maxMarks = examList[0].totalMarks;
                        const passingMarks = examList[0].passingMarks;
                        
                        // Get list of sorted standards for small text
                        const stds = [...new Set(examList.map(e => e.classId.standard))].sort(sortStandards);
                        const stdsLabel = stds.map(s => s.match(/^\d+$/) ? `Grade ${s}` : s).join(', ');

                        return (
                          <div
                            key={groupKey}
                            onClick={() => setSelectedExamName(groupKey)}
                            className="rounded-3xl border border-[#d9c5b0] bg-white p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between cursor-pointer group hover:border-[#7a4e2d]"
                          >
                            <div className="space-y-4">
                              {/* Header: Exam Name and Whole Exam Delete */}
                              <div className="flex justify-between items-start gap-3">
                                <div>
                                  <h3 className="text-lg font-black text-[#3f2a1d] group-hover:text-[#7a4e2d] transition">{examName}</h3>
                                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                                    📅 Date: {new Date(date).toLocaleDateString()}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation(); // prevent card click
                                    const toDelete = [...examList];
                                    const last = toDelete.pop();
                                    await Promise.all([
                                      ...toDelete.map(ex => handleDeleteExam(ex._id, true)),
                                      handleDeleteExam(last._id, false)
                                    ]);
                                  }}
                                  className="text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition"
                                  title="Delete Whole Exam"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>

                              {/* Marks Info */}
                              {(() => {
                                const stdsCount = [...new Set(examList.map(e => e.classId?.standard || (typeof e.classId === 'string' ? classes.find(c => c._id === e.classId)?.standard : '')))].filter(Boolean).length;
                                return (
                                  <div className="grid grid-cols-3 gap-2 text-center text-xs bg-[#fffaf3] border border-[#d9c5b0]/30 p-2.5 rounded-xl">
                                    <div>
                                      <span className="text-[10px] text-[#8a6a50] uppercase font-bold">Max Marks</span>
                                      <p className="font-extrabold text-[#6d4c35] mt-0.5">{maxMarks || 100}</p>
                                    </div>
                                    <div className="border-l border-[#d9c5b0]/30">
                                      <span className="text-[10px] text-[#8a6a50] uppercase font-bold">Passing</span>
                                      <p className="font-extrabold text-[#6d4c35] mt-0.5">{passingMarks || 35}</p>
                                    </div>
                                    <div className="border-l border-[#d9c5b0]/30">
                                      <span className="text-[10px] text-[#8a6a50] uppercase font-bold">Total Grades</span>
                                      <p className="font-extrabold text-[#6d4c35] mt-0.5">{stdsCount}</p>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Small Standards Text */}
                              <div className="pt-2 border-t border-[#f4ecdf]">
                                <span className="text-[9px] font-bold text-[#8a6a50] uppercase tracking-wider block">Assigned Grades</span>
                                <p className="text-xs font-semibold text-[#7a4e2d] truncate mt-0.5">{stdsLabel}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ===================== MANAGE FEES TAB ===================== */}
            {activeTab === 'fees' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-[#3f2a1d]">
                      {selectedFeeStd ? `📋 ${selectedFeeStd === selectedFeeStd ? `Grade ${selectedFeeStd}` : selectedFeeStd} — Student Fees` : '💰 Manage Fees'}
                    </h2>
                    <p className="text-xs text-[#8a6a50] mt-1">
                      {selectedFeeStd ? 'Click quarters to toggle payment status for each student.' : 'Configure grade-wise annual fees split into 4 equal quarters.'}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {selectedFeeStd && (
                      <button
                        onClick={() => setSelectedFeeStd(null)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#d9c5b0] bg-white text-[#7a4e2d] text-xs font-bold hover:bg-[#7a4e2d]/10 transition"
                      >
                        ← Back
                      </button>
                    )}
                    {!selectedFeeStd && (
                      <button
                        onClick={() => { setFeeForm({ standard: '', totalAmount: '', totalMonths: 12, totalInstallments: 4, academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}` }); setShowSetFeeModal(true); }}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#7a4e2d] text-[#f7efe4] text-xs font-bold hover:bg-[#624021] transition shadow-sm"
                      >
                        <Plus className="h-4 w-4" /> Set Fees
                      </button>
                    )}
                  </div>
                </div>

                {/* INSIDE VIEW: Student fees for selected standard */}
                {selectedFeeStd ? (
                  <div className="space-y-4">
                    {(() => {
                      const struct = feeStructures.find(f => f.standard === selectedFeeStd);
                      const totalInst = struct ? (struct.totalInstallments || 4) : 4;
                      const instAmt = struct ? Math.round(struct.totalAmount / totalInst) : 0;
                      if (studentFees.length === 0) {
                        return (
                          <div className="text-center py-16 text-[#8a6a50]">
                            <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="font-bold text-sm">No students found for this grade.</p>
                            <p className="text-xs mt-1">Add students to Grade {selectedFeeStd} to track fees.</p>
                          </div>
                        );
                      }
                      return (
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                          {studentFees.map(fee => {
                            const paidCount = fee.paidInstallments?.length ?? ['q1Status','q2Status','q3Status','q4Status'].filter(k => fee[k] === 'Paid').length;
                            const totalPaid = fee.paidInstallments 
                              ? fee.paidInstallments.length * instAmt 
                              : ['q1Status','q2Status','q3Status','q4Status'].filter(k => fee[k] === 'Paid').length * instAmt;
                            const totalPending = struct ? struct.totalAmount - totalPaid : 0;
                            const overallStatus = totalPending === 0 ? 'Full Paid' : totalPaid > 0 ? 'Partial' : 'Pending';
                            const statusColor = overallStatus === 'Full Paid' ? 'bg-emerald-100 text-emerald-700' : overallStatus === 'Partial' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
                            const student = fee.studentId;
                            const cls = fee.classId;
                            return (
                              <div key={fee._id} className="rounded-3xl border border-[#d9c5b0] bg-white p-5 shadow-sm hover:shadow-md transition space-y-4">
                                {/* Student Header */}
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h3 className="font-black text-[#3f2a1d] text-base leading-tight">{student?.name || 'Unknown'}</h3>
                                    <p className="text-[10px] text-[#8a6a50] mt-0.5">
                                      Roll: {student?.rollNumber || '—'} &nbsp;|&nbsp; Section: {cls?.division || '—'}
                                    </p>
                                    <p className="text-[10px] text-[#8a6a50]">{student?.email || ''}</p>
                                  </div>
                                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${statusColor}`}>
                                    {overallStatus}
                                  </span>
                                </div>

                                {/* Fee Summary */}
                                <div className="grid grid-cols-2 gap-2 text-center text-xs bg-[#fffaf3] border border-[#d9c5b0]/30 p-2.5 rounded-xl">
                                  <div>
                                    <span className="text-[10px] text-[#8a6a50] font-bold uppercase block">Paid</span>
                                    <span className="font-extrabold text-emerald-600">₹{totalPaid.toLocaleString()}</span>
                                  </div>
                                  <div className="border-l border-[#d9c5b0]/30">
                                    <span className="text-[10px] text-[#8a6a50] font-bold uppercase block">Pending</span>
                                    <span className="font-extrabold text-rose-600">₹{totalPending.toLocaleString()}</span>
                                  </div>
                                </div>

                                {/* Installment Toggles */}
                                <div className="grid grid-cols-4 gap-1.5">
                                  {Array.from({ length: totalInst }, (_, i) => {
                                    const idx = i + 1;
                                    const isPaid = fee.paidInstallments?.includes(idx) || (idx <= 4 && fee[`q${idx}Status`] === 'Paid');
                                    const dateKey = `q${idx}PaidDate`;
                                    const dateValue = fee.paidInstallments?.includes(idx) 
                                      ? (fee.paidDates?.[idx.toString()] || fee.paidDates?.get?.(idx.toString()))
                                      : fee[dateKey];
                                    return (
                                      <button
                                        key={idx}
                                        onClick={() => handleToggleQuarterFee(fee._id, idx.toString())}
                                        title={isPaid && dateValue ? `Paid on ${new Date(dateValue).toLocaleDateString()}` : 'Click to mark as paid'}
                                        className={`rounded-xl py-2 px-1 text-[10px] font-bold transition border ${isPaid ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600' : 'bg-white text-[#8a6a50] border-[#d9c5b0] hover:border-[#7a4e2d]'}`}
                                      >
                                        Term {idx}
                                        <br />
                                        <span className="text-[8px]">{isPaid ? '✓' : '○'}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                                <p className="text-[10px] text-[#8a6a50] text-center">₹{instAmt.toLocaleString()} per installment ({totalInst} terms)</p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* OUTSIDE VIEW: Standard fee structure cards */
                  <div className="space-y-4">
                    {feeStructures.length === 0 ? (
                      <div className="text-center py-20 text-[#8a6a50]">
                        <DollarSign className="h-14 w-14 mx-auto mb-4 opacity-25" />
                        <p className="font-bold text-base">No fee structures configured yet.</p>
                        <p className="text-xs mt-1">Click "Set Grade Fee" to configure fees for a grade.</p>
                      </div>
                    ) : (
                      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {feeStructures.map(struct => {
                          const totalInst = struct.totalInstallments || 4;
                          const instAmt = Math.round(struct.totalAmount / totalInst);
                          const stdStudentCount = students.filter(s => {
                            const cls = classes.find(c => c._id === (s.classId?._id || s.classId));
                            return cls && cls.standard === struct.standard;
                          }).length;
                          return (
                            <div
                              key={struct._id}
                              onClick={() => setSelectedFeeStd(struct.standard)}
                              className="rounded-3xl border border-[#d9c5b0] bg-white p-6 shadow-sm hover:shadow-md cursor-pointer transition group hover:border-[#7a4e2d] space-y-4"
                            >
                              {/* Card Header */}
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className="text-xl font-black text-[#3f2a1d] group-hover:text-[#7a4e2d] transition">
                                    {struct.standard.match(/^\d+$/) ? `Grade ${struct.standard}` : struct.standard}
                                  </h3>
                                  <p className="text-[10px] text-[#8a6a50] mt-0.5">{struct.totalMonths} months · {struct.academicYear || ''} · {stdStudentCount} student{stdStudentCount !== 1 ? 's' : ''}</p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingFeeId(struct.standard);
                                      setFeeForm({ standard: struct.standard, totalAmount: struct.totalAmount, totalMonths: struct.totalMonths, totalInstallments: struct.totalInstallments || 4, academicYear: struct.academicYear || '' });
                                      setShowSetFeeModal(true);
                                    }}
                                    className="text-[#7a4e2d] hover:bg-[#7a4e2d]/10 p-2 rounded-xl transition"
                                    title="Edit Fee Structure"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteFeeStructure(struct.standard); }}
                                    className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition"
                                    title="Delete Fee Structure"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Amounts grid */}
                              <div className="grid grid-cols-2 gap-2 text-center text-xs bg-[#fffaf3] border border-[#d9c5b0]/30 p-2.5 rounded-xl">
                                <div>
                                  <span className="text-[10px] text-[#8a6a50] font-bold uppercase block">Annual Fee</span>
                                  <span className="font-extrabold text-[#6d4c35] text-base">₹{struct.totalAmount.toLocaleString()}</span>
                                </div>
                                <div className="border-l border-[#d9c5b0]/30">
                                  <span className="text-[10px] text-[#8a6a50] font-bold uppercase block">Per Term</span>
                                  <span className="font-extrabold text-[#6d4c35] text-base">₹{instAmt.toLocaleString()}</span>
                                </div>
                              </div>

                              {/* Installment labels */}
                              <div className="grid grid-cols-4 gap-1.5">
                                {Array.from({ length: Math.min(totalInst, 4) }, (_, i) => (
                                  <div key={i} className="rounded-lg bg-[#7a4e2d]/10 text-[#7a4e2d] text-[10px] font-bold text-center py-1.5">
                                    Term {i+1}<br/><span className="text-[8px]">₹{instAmt.toLocaleString()}</span>
                                  </div>
                                ))}
                                {totalInst > 4 && (
                                  <div className="rounded-lg bg-[#8a6a50]/10 text-[#8a6a50] text-[9px] font-bold text-center py-1.5 flex items-center justify-center">
                                    + {totalInst - 4} more
                                  </div>
                                )}
                              </div>

                              <p className="text-[10px] text-[#8a6a50] text-center pt-1">Click to view student payment status →</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ===================== SET FEE MODAL ===================== */}
            {showSetFeeModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
                <div className="w-full max-w-md rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[#d9c5b0] pb-3">
                    <h3 className="text-lg font-black text-[#3f2a1d]">{editingFeeId ? 'Edit Fee Structure' : 'Set Fees'}</h3>
                    <button onClick={() => { setShowSetFeeModal(false); setEditingFeeId(null); }} className="rounded-full p-1.5 text-[#8a6a50] hover:bg-[#f4ecdf]">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={handleFeeSubmit} className="space-y-4">
                    {/* Standard selector */}
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Grade *</label>
                      {editingFeeId ? (
                        <div className="w-full rounded-xl border border-[#d9c5b0] bg-[#f4ecdf] px-3 py-2.5 text-sm text-[#6d4c35] font-bold flex items-center gap-2">
                          <span>🔒</span>
                          <span>{feeForm.standard.match(/^\d+$/) ? `Grade ${feeForm.standard}` : feeForm.standard}</span>
                        </div>
                      ) : (
                        <select
                          value={feeForm.standard}
                          onChange={e => setFeeForm(prev => ({ ...prev, standard: e.target.value }))}
                          required
                          className="w-full rounded-xl border border-[#d9c5b0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7a4e2d]"
                        >
                              <option value="">— Select Grade —</option>
                          {[...new Set(classes.map(c => c.standard))]
                            .filter(std => !feeStructures.some(f => f.standard === std))
                            .sort(sortStandards)
                            .map(std => (
                              <option key={std} value={std}>{std.match(/^\d+$/) ? `Grade ${std}` : std}</option>
                            ))
                          }
                        </select>
                      )}
                    </div>

                    {/* Total annual fee */}
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Annual Total Fee (₹) *</label>
                      <input
                        type="number"
                        min="1"
                        value={feeForm.totalAmount}
                        onChange={e => setFeeForm(prev => ({ ...prev, totalAmount: e.target.value }))}
                        placeholder="e.g. 12000"
                        required
                        className="w-full rounded-xl border border-[#d9c5b0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7a4e2d]"
                      />
                    </div>

                    {/* Total months */}
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Total Billing Months</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={feeForm.totalMonths}
                        onChange={e => setFeeForm(prev => ({ ...prev, totalMonths: e.target.value }))}
                        className="w-full rounded-xl border border-[#d9c5b0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7a4e2d]"
                      />
                    </div>

                    {/* Total Installments */}
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Total Fee Installments (Terms) *</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={feeForm.totalInstallments}
                        onChange={e => setFeeForm(prev => ({ ...prev, totalInstallments: Number(e.target.value) }))}
                        required
                        className="w-full rounded-xl border border-[#d9c5b0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7a4e2d]"
                      />
                    </div>

                    {/* Academic Year */}
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Academic Year *</label>
                      <input
                        type="text"
                        value={feeForm.academicYear}
                        onChange={e => setFeeForm(prev => ({ ...prev, academicYear: e.target.value }))}
                        placeholder="e.g. 2024-2025"
                        required
                        className="w-full rounded-xl border border-[#d9c5b0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7a4e2d]"
                      />
                    </div>

                    {/* Calculated installments preview */}
                    {feeForm.totalAmount > 0 && feeForm.totalInstallments > 0 && (
                      <div className="bg-[#7a4e2d]/5 border border-[#d9c5b0] rounded-xl p-3 max-h-36 overflow-y-auto">
                        <p className="text-[10px] font-bold text-[#8a6a50] uppercase mb-2">Installments Breakdown Preview</p>
                        <div className="grid grid-cols-3 gap-1.5 text-center">
                          {Array.from({ length: feeForm.totalInstallments || 4 }, (_, idx) => (
                            <div key={idx} className="bg-white rounded-lg py-2 border border-[#d9c5b0]/50">
                              <p className="text-[10px] font-bold text-[#7a4e2d]">Term {idx + 1}</p>
                              <p className="text-xs font-extrabold text-[#3f2a1d]">₹{Math.round(Number(feeForm.totalAmount) / (feeForm.totalInstallments || 4)).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 border-t border-[#d9c5b0]/50 pt-3">
                      <button type="button" onClick={() => { setShowSetFeeModal(false); setEditingFeeId(null); }} className="rounded-xl border border-[#d9c5b0] bg-white px-5 py-2 text-sm font-bold text-[#7a4e2d] hover:bg-[#7a4e2d]/10 transition">
                        Cancel
                      </button>
                      <button type="submit" disabled={creatingFee} className="rounded-xl bg-[#7a4e2d] px-6 py-2 text-sm font-bold text-[#f7efe4] hover:bg-[#624021] transition disabled:opacity-50">
                        {creatingFee ? (editingFeeId ? 'Saving...' : 'Setting...') : (editingFeeId ? 'Save Changes' : 'Set Fees')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ADD SUBJECT MODAL */}
            {showAddSubjectModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
                <div className="w-full max-w-4xl rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-[#d9c5b0] pb-3">
                    <h3 className="text-lg font-black text-[#3f2a1d]">
                      {editingSubjectId ? 'Edit Subject Credentials' : 'Add New Subject'}
                    </h3>
                    <button 
                      onClick={() => {
                        setShowAddSubjectModal(false);
                        setEditingSubjectId(null);
                        setSubjectForm({ name: '', code: '', maxMarks: 100, minMarks: 35, standards: [] });
                      }}
                      className="rounded-full p-1.5 text-[#8a6a50] hover:bg-[#f4ecdf]"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSubjectSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Subject Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g., Mathematics"
                        value={subjectForm.name}
                        onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                        className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Subject Code *</label>
                        <input
                          type="text"
                          required
                          placeholder="E.g., MATH101"
                          value={subjectForm.code}
                          onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                          className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-[#6d4c35] mb-1">Max Marks *</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={subjectForm.maxMarks}
                            onChange={(e) => setSubjectForm({ ...subjectForm, maxMarks: Number(e.target.value) })}
                            className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#6d4c35] mb-1">Passing *</label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={subjectForm.minMarks}
                            onChange={(e) => setSubjectForm({ ...subjectForm, minMarks: Number(e.target.value) })}
                            className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">
                        Assign to Grades *
                        <span className="text-[10px] text-[#7a4e2d] ml-1 font-extrabold font-mono">
                          (Selected: {subjectForm.standards?.length || 0})
                        </span>
                      </label>
                      {(() => {
                        const createdStds = [...new Set(classes.map(c => c.standard))].sort(sortStandards);
                        return (
                          <>
                            <div className="flex gap-2 mb-1.5">
                              <button
                                type="button"
                                onClick={() => setSubjectForm(prev => ({ ...prev, standards: createdStds }))}
                                className="text-[10px] font-bold text-[#7a4e2d] hover:underline"
                              >
                                Select All
                              </button>
                              <span className="text-[10px] text-gray-400">|</span>
                              <button
                                type="button"
                                onClick={() => setSubjectForm(prev => ({ ...prev, standards: [] }))}
                                className="text-[10px] font-bold text-[#7a4e2d] hover:underline"
                              >
                                Deselect All
                              </button>
                            </div>
                            {createdStds.length === 0 ? (
                              <p className="text-xs text-rose-500 italic">No classes configured yet. Please set up classes first.</p>
                            ) : (
                              <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto p-3 border border-[#d9c5b0] bg-[#faf4ea] rounded-xl font-medium">
                                {createdStds.map(std => {
                                  const isChecked = subjectForm.standards?.includes(std);
                                  return (
                                    <label key={std} className="flex items-center gap-1.5 text-xs text-[#6d4c35] cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const nextStds = e.target.checked
                                            ? [...(subjectForm.standards || []), std]
                                            : (subjectForm.standards || []).filter(s => s !== std);
                                          setSubjectForm(prev => ({ ...prev, standards: nextStds }));
                                        }}
                                        className="rounded border-[#d9c5b0] text-[#7a4e2d] focus:ring-[#7a4e2d] h-3.5 w-3.5 cursor-pointer"
                                      />
                                      {std.match(/^\d+$/) ? `Grade ${std}` : std}
                                    </label>
                                  );
                                })}
                              </div>
                            )}

                            {subjectForm.standards && subjectForm.standards.length > 0 && (
                              <div className="space-y-3 mt-3 p-3 border border-[#d9c5b0]/55 bg-[#fffaf3] rounded-xl">
                                <label className="block text-xs font-bold text-[#6d4c35]">Grade-wise Yearly Lectures & Duration Config</label>
                                <div className="grid grid-cols-3 gap-4 max-h-[25rem] overflow-y-auto pr-1">
                                  {subjectForm.standards.map(std => {
                                    const matched = subjectForm.lecturesPerStandard?.find(l => l.standard === std);
                                    const currentDuration = matched ? (matched.lectureDuration || '60') : '60';
                                    const currentTotal = matched ? matched.totalPortionLectures : '';
                                    
                                    const updateField = (field, val) => {
                                      const updated = [...(subjectForm.lecturesPerStandard || [])];
                                      const idx = updated.findIndex(l => l.standard === std);
                                      if (idx > -1) {
                                        updated[idx] = { ...updated[idx], [field]: val };
                                      } else {
                                        updated.push({
                                          standard: std,
                                          weeklyLectures: val && field === 'totalPortionLectures' ? Math.ceil(Number(val) / 30) : 2,
                                          lectureDuration: currentDuration,
                                          totalPortionLectures: currentTotal,
                                          [field]: val
                                        });
                                      }
                                      setSubjectForm(prev => ({ ...prev, lecturesPerStandard: updated }));
                                    };

                                    return (
                                      <div key={std} className="p-3 border border-[#d9c5b0] bg-white rounded-2xl space-y-3 text-xs shadow-xs hover:border-[#7a4e2d]/40 transition">
                                        <div className="flex justify-between items-center bg-[#7a4e2d]/5 px-2.5 py-1 rounded-lg">
                                          <span className="font-bold text-[#7a4e2d]">
                                            {std.match(/^\d+$/) ? `Grade ${std}` : std}
                                          </span>
                                        </div>
                                        
                                        <div className="space-y-2">
                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] text-gray-500 font-bold">Total Yearly:</span>
                                            <input
                                              type="number"
                                              required
                                              min="1"
                                              max="1000"
                                              placeholder="E.g., 80"
                                              value={currentTotal}
                                              onChange={(e) => updateField('totalPortionLectures', e.target.value === '' ? '' : Number(e.target.value))}
                                              className="w-full rounded-lg border border-[#d9c5b0] bg-[#faf4ea] px-2 py-1 font-bold outline-none text-center"
                                            />
                                          </div>

                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] text-gray-500 font-bold">Duration:</span>
                                            <select
                                              value={currentDuration}
                                              onChange={(e) => updateField('lectureDuration', e.target.value)}
                                              className="w-full rounded-lg border border-[#d9c5b0] bg-[#faf4ea] px-2 py-1 font-bold outline-none text-[11px]"
                                            >
                                              <option value="30">30m</option>
                                              <option value="45">45m</option>
                                              <option value="60">60m</option>
                                            </select>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    <div className="flex justify-end gap-2 border-t border-[#d9c5b0] pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddSubjectModal(false);
                          setEditingSubjectId(null);
                          setSubjectForm({ name: '', code: '', maxMarks: 100, minMarks: 35, standards: [] });
                        }}
                        className="rounded-xl border border-[#d9c5b0] bg-white px-4 py-2 text-xs font-semibold text-[#8a6a50]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creatingSubject}
                        className="rounded-xl bg-[#7a4e2d] px-4 py-2 text-xs font-semibold text-[#f7efe4] hover:bg-[#624021] transition shadow-sm disabled:opacity-50"
                      >
                        {creatingSubject ? 'Saving...' : editingSubjectId ? 'Save Changes' : 'Add Subject'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ADD EXAM MODAL */}
            {showAddExamModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
                <div className="w-full max-w-md rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-2xl space-y-4 font-medium">
                  <div className="flex items-center justify-between border-b border-[#d9c5b0] pb-3">
                    <h3 className="text-lg font-black text-[#3f2a1d]">
                      {editingExamId ? 'Edit Exam Credentials' : 'Create New Exam / Assessment'}
                    </h3>
                    <button 
                      onClick={() => {
                        setShowAddExamModal(false);
                        setEditingExamId(null);
                        setExamForm({ name: '', standards: [], subjectId: '', date: '', maxMarks: 100, passingMarks: 35 });
                      }}
                      className="rounded-full p-1.5 text-[#8a6a50] hover:bg-[#f4ecdf]"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={handleExamSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Assessment / Exam Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g., Term 1 Examination"
                        value={examForm.name}
                        onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                        className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none"
                      />
                    </div>

                    {!editingExamId ? (
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">
                          Assign to Grades *
                          <span className="text-[10px] text-[#7a4e2d] ml-1 font-extrabold font-mono">
                            (Selected: {examForm.standards?.length || 0})
                          </span>
                        </label>
                        {(() => {
                          const availableStds = [...new Set(classes.map(c => c.standard))].sort(sortStandards);
                          return (
                            <>
                              <div className="flex gap-2 mb-1.5">
                                <button
                                  type="button"
                                  onClick={() => setExamForm(prev => ({ ...prev, standards: availableStds }))}
                                  className="text-[10px] font-bold text-[#7a4e2d] hover:underline"
                                >
                                  Select All
                                </button>
                                <span className="text-[10px] text-gray-400">|</span>
                                <button
                                  type="button"
                                  onClick={() => setExamForm(prev => ({ ...prev, standards: [] }))}
                                  className="text-[10px] font-bold text-[#7a4e2d] hover:underline"
                                >
                                  Deselect All
                                </button>
                              </div>
                              {availableStds.length === 0 ? (
                                <p className="text-xs text-rose-500 italic">No classes configured yet. Please set up classes first.</p>
                              ) : (
                                <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto p-3 border border-[#d9c5b0] bg-[#faf4ea] rounded-xl font-medium">
                                  {availableStds.map(std => {
                                    const isChecked = examForm.standards?.includes(std);
                                    return (
                                      <label key={std} className="flex items-center gap-1.5 text-xs text-[#6d4c35] cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            const nextStds = e.target.checked
                                              ? [...(examForm.standards || []), std]
                                              : (examForm.standards || []).filter(s => s !== std);
                                            setExamForm(prev => ({ ...prev, standards: nextStds }));
                                          }}
                                          className="rounded border-[#d9c5b0] text-[#7a4e2d] focus:ring-[#7a4e2d] h-3.5 w-3.5 cursor-pointer"
                                        />
                                        {std.match(/^\d+$/) ? `Grade ${std}` : std}
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Grade (Read-only during edit)</label>
                        <input
                          type="text"
                          disabled
                          value={examForm.standards?.[0] ? `Grade ${examForm.standards[0]}` : 'N/A'}
                          className="w-full rounded-xl border border-[#d9c5b0] bg-gray-100 px-3 py-2 text-sm outline-none cursor-not-allowed"
                        />
                      </div>
                    )}



                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Exam Date *</label>
                      <input
                        type="date"
                        required
                        value={examForm.date}
                        onChange={(e) => setExamForm({ ...examForm, date: e.target.value })}
                        className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Maximum Marks *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={examForm.maxMarks}
                          onChange={(e) => setExamForm({ ...examForm, maxMarks: Number(e.target.value) })}
                          className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Passing Marks *</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={examForm.passingMarks}
                          onChange={(e) => setExamForm({ ...examForm, passingMarks: Number(e.target.value) })}
                          className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-[#d9c5b0] pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddExamModal(false);
                          setEditingExamId(null);
                          setExamForm({ name: '', standards: [], subjectId: '', date: '', maxMarks: 100, passingMarks: 35 });
                        }}
                        className="rounded-xl border border-[#d9c5b0] bg-white px-4 py-2 text-xs font-semibold text-[#8a6a50]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creatingExam}
                        className="rounded-xl bg-[#7a4e2d] px-4 py-2 text-xs font-semibold text-[#f7efe4] hover:bg-[#624021] transition shadow-sm disabled:opacity-50"
                      >
                        {creatingExam ? 'Saving...' : editingExamId ? 'Save Changes' : 'Create Exam'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'grievances' && (() => {
              const sortedGrievances = [...grievances].sort((a, b) => {
                const statusOrder = { 'Pending': 1, 'In Progress': 2, 'Resolved': 3 };
                const orderA = statusOrder[a.status] || 99;
                const orderB = statusOrder[b.status] || 99;
                if (orderA !== orderB) return orderA - orderB;
                return new Date(b.createdAt) - new Date(a.createdAt);
              });

              const teacherPendingCount = grievances.filter(g => g.raisedByModel === 'Teacher' && g.status === 'Pending').length;
              const studentPendingCount = grievances.filter(g => g.raisedByModel === 'Student' && g.status === 'Pending').length;

              const displayGrievances = sortedGrievances.filter(g => 
                grievanceSubTab === 'teacher' ? g.raisedByModel === 'Teacher' : g.raisedByModel === 'Student'
              );

              return (
                <div className="space-y-6">
                  <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-[#3f2a1d]">Grievances & Complaints</h2>
                    <p className="mt-1 text-sm text-[#7f634e]">Review and resolve complaints raised by students and teachers.</p>
                  </div>

                  {/* Grievance Sub-Tabs */}
                  <div className="flex border-b border-[#d9c5b0] gap-4 pb-2">
                    <button
                      onClick={() => setGrievanceSubTab('teacher')}
                      className={`relative px-4 py-2 text-sm font-bold transition flex items-center gap-1.5 ${grievanceSubTab === 'teacher' ? 'text-[#7a4e2d] border-b-2 border-[#7a4e2d]' : 'text-[#8a6a50] hover:text-[#7a4e2d]'}`}
                    >
                      Teacher Grievances
                      {teacherPendingCount > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white shrink-0 leading-none">
                          {teacherPendingCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setGrievanceSubTab('student')}
                      className={`relative px-4 py-2 text-sm font-bold transition flex items-center gap-1.5 ${grievanceSubTab === 'student' ? 'text-[#7a4e2d] border-b-2 border-[#7a4e2d]' : 'text-[#8a6a50] hover:text-[#7a4e2d]'}`}
                    >
                      Student Grievances
                      {studentPendingCount > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white shrink-0 leading-none">
                          {studentPendingCount}
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {displayGrievances.length > 0 ? (
                      displayGrievances.map((grievance) => (
                        <div key={grievance._id} className="rounded-3xl border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm space-y-4 hover:shadow-md transition">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  grievance.raisedByModel === 'Teacher' ? 'bg-amber-500/10 text-amber-700' : 'bg-sky-500/10 text-sky-700'
                                }`}>
                                  From: {grievance.raisedByModel} ({grievance.raisedBy?.name || 'Unknown'})
                                </span>
                                {grievance.status === 'Pending' && (
                                  <span className="flex h-2 w-2 rounded-full bg-red-600 animate-pulse" title="New Grievance" />
                                )}
                              </div>
                              <h3 className="text-lg font-bold text-[#3f2a1d] mt-2">{grievance.title}</h3>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                              grievance.status === 'Resolved' 
                                ? 'bg-emerald-500/10 text-emerald-700' 
                                : grievance.status === 'In Progress'
                                  ? 'bg-amber-500/10 text-amber-700'
                                  : 'bg-rose-500/10 text-rose-700'
                            }`}>
                              {grievance.status === 'In Progress' ? 'Under Process' : (grievance.status === 'Resolved' ? 'Completed' : 'Pending')}
                            </span>
                          </div>

                          <p className="text-sm text-[#6d4c35] leading-relaxed bg-[#f4ecdf] p-3 rounded-2xl">
                            {grievance.description}
                          </p>

                          {grievance.attachments && grievance.attachments.length > 0 && (
                            <div className="border border-[#d9c5b0] p-2 rounded-2xl bg-white max-w-[200px]">
                              <p className="text-xs font-bold text-[#8a6a50] mb-1">Attached image/photo:</p>
                              <a href={grievance.attachments[0]} target="_blank" rel="noopener noreferrer">
                                <img src={grievance.attachments[0]} alt="Grievance Attach" className="h-24 w-full object-cover rounded-xl hover:opacity-80 transition" />
                              </a>
                            </div>
                          )}

                          {grievance.resolution && (
                            <div className="border-t border-[#f4ecdf] pt-3 mt-2">
                              <p className="text-xs font-bold text-emerald-700">Revert Message:</p>
                              <p className="text-xs text-[#6d4c35] italic mt-0.5">{grievance.resolution}</p>
                            </div>
                          )}

                          {grievance.status !== 'Resolved' && (
                            <div className="flex gap-2 border-t border-[#f4ecdf] pt-4">
                              {grievance.status === 'Pending' && (
                                <button
                                  onClick={() => handleUpdateGrievanceStatus(grievance._id, 'In Progress')}
                                  className="text-xs font-bold text-[#7a4e2d] bg-[#7a4e2d]/10 hover:bg-[#7a4e2d]/20 px-3 py-1.5 rounded-xl transition"
                                >
                                  Mark Under Process
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedGrievance(grievance);
                                  setRevertMessage('');
                                }}
                                className="text-xs font-bold text-[#f7efe4] bg-[#7a4e2d] hover:bg-[#624021] px-3 py-1.5 rounded-xl transition"
                              >
                                Resolve / Complete
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-10 text-[#8a6a50]">
                        No grievances found.
                      </div>
                    )}
                  </div>

                  {/* RESOLUTION MODAL */}
                  {selectedGrievance && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                      <div className="w-full max-w-md bg-[#fffaf3] rounded-[2rem] border border-[#d9c5b0] p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-[#d9c5b0] pb-2">
                          <h3 className="text-lg font-black text-[#3f2a1d]">Resolve Grievance</h3>
                          <button onClick={() => setSelectedGrievance(null)} className="p-1 text-[#8a6a50] hover:bg-[#f4ecdf] rounded-full">
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#6d4c35]">Title: {selectedGrievance.title}</p>
                          <p className="text-xs text-[#7f634e] mt-1">{selectedGrievance.description}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#6d4c35] mb-1">Revert Message / Resolution Details *</label>
                          <textarea
                            required
                            value={revertMessage}
                            onChange={(e) => setRevertMessage(e.target.value)}
                            placeholder="Type details of the action taken..."
                            className="w-full h-24 rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none focus:border-[#7a4e2d]"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-[#d9c5b0]">
                          <button
                            type="button"
                            onClick={() => setSelectedGrievance(null)}
                            className="rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-4 py-2 text-xs font-semibold text-[#8a6a50]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={!revertMessage.trim()}
                            onClick={() => handleUpdateGrievanceStatus(selectedGrievance._id, 'Resolved')}
                            className="rounded-xl bg-[#7a4e2d] px-4 py-2 text-xs font-semibold text-[#f7efe4] hover:bg-[#624021] transition disabled:opacity-50"
                          >
                            Mark Completed
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* NOTICES TAB */}
            {activeTab === 'notices' && (
              <div className="space-y-6">
                <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#3f2a1d]">Notice Board Management</h2>
                    <p className="text-sm text-[#7f634e]">Publish official updates, achievements, events, and results announcements.</p>
                  </div>
                  <button
                    onClick={() => setShowAddNoticeModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-[#7a4e2d] px-4 py-2.5 text-sm font-bold text-[#f7efe4] hover:bg-[#624021] transition shadow-sm"
                  >
                    <Plus className="h-4 w-4" /> Publish Notice
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {notices && notices.length > 0 ? (
                    notices.map((notice) => (
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
                          <button
                            onClick={() => handleDeleteNotice(notice._id)}
                            className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-xs text-[#6d4c35] bg-[#fffaf3] p-3 rounded-xl whitespace-pre-line">{notice.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-10 text-[#8a6a50]">
                      No notices found. Get started by publishing your first notice!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ADD NOTICE MODAL */}
            {showAddNoticeModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
                <div className="w-full max-w-lg rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[#d9c5b0] pb-3">
                    <h3 className="text-lg font-black text-[#3f2a1d]">Publish New Notice</h3>
                    <button 
                      onClick={() => setShowAddNoticeModal(false)}
                      className="rounded-full p-1.5 text-[#8a6a50] hover:bg-[#f4ecdf]"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={handleNoticeSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Notice Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g., Sports Day Schedule Announcement"
                        value={noticeForm.title}
                        onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                        className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Notice Category *</label>
                        <select
                          value={noticeForm.category}
                          onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })}
                          className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none"
                        >
                          <option value="General">General</option>
                          <option value="Event">Event</option>
                          <option value="Achievement">Achievement</option>
                          <option value="Exam">Exam/Test</option>
                          <option value="Result">Result Announcement</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Target Audience *</label>
                        <select
                          value={noticeForm.targetAudience}
                          onChange={(e) => setNoticeForm({ ...noticeForm, targetAudience: e.target.value })}
                          className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none"
                        >
                          <option value="All">All Users</option>
                          <option value="Students">Students Only</option>
                          <option value="Teachers">Teachers Only</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Priority *</label>
                        <select
                          value={noticeForm.priority}
                          onChange={(e) => setNoticeForm({ ...noticeForm, priority: e.target.value })}
                          className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2 pt-5">
                        <input
                          type="checkbox"
                          id="isPinned"
                          checked={noticeForm.isPinned}
                          onChange={(e) => setNoticeForm({ ...noticeForm, isPinned: e.target.checked })}
                          className="h-4 w-4 rounded border-[#d9c5b0] text-[#7a4e2d] focus:ring-[#7a4e2d]"
                        />
                        <label htmlFor="isPinned" className="text-xs font-bold text-[#6d4c35] select-none cursor-pointer">Pin to top</label>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Attach PDF or Document</label>
                        <input
                          type="file"
                          onChange={handleNoticeFileUpload}
                          className="w-full text-xs text-[#6d4c35] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#7a4e2d] file:text-[#f7efe4] hover:file:bg-[#624021] cursor-pointer"
                        />
                        {uploadingNoticeFile && <p className="text-xs text-amber-600 mt-1">Uploading file...</p>}
                        {noticeForm.attachments?.[0] && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Document Attached: <a href={noticeForm.attachments[0]} target="_blank" rel="noopener noreferrer" className="underline font-semibold">View File</a>
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Visibility Duration (Days)</label>
                        <input
                          type="number"
                          min="0"
                          value={noticeForm.visibleDays}
                          onChange={(e) => setNoticeForm({ ...noticeForm, visibleDays: Number(e.target.value) })}
                          placeholder="0 = Persistent notice"
                          className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none"
                        />
                        <p className="text-[10px] text-[#8a6a50] mt-0.5">Notice & files auto-delete after these days.</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Notice Content *</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Write the details here..."
                        value={noticeForm.content}
                        onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                        className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 border-t border-[#d9c5b0] pt-3">
                      <button
                        type="button"
                        onClick={() => setShowAddNoticeModal(false)}
                        className="rounded-xl border border-[#d9c5b0] bg-white px-4 py-2 text-xs font-semibold text-[#8a6a50]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creatingNotice}
                        className="rounded-xl bg-[#7a4e2d] px-4 py-2 text-xs font-semibold text-[#f7efe4] hover:bg-[#624021] transition shadow-sm disabled:opacity-50"
                      >
                        {creatingNotice ? 'Publishing...' : 'Publish Update'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TEACHER ASSIGNMENTS TAB */}
            {activeTab === 'teacherAssignments' && (() => {
              const filteredTeachers = teachers.filter(t => 
                t.name?.toLowerCase().includes(assignSearchQuery.toLowerCase()) ||
                t.employeeId?.toLowerCase().includes(assignSearchQuery.toLowerCase()) ||
                t.department?.toLowerCase().includes(assignSearchQuery.toLowerCase())
              );

              const handleOpenAssignModal = (teacher) => {
                setAssigningTeacher(teacher);
                const initialAssignments = {};
                if (teacher.assignedSubjectStandards) {
                  teacher.assignedSubjectStandards.forEach(ass => {
                    initialAssignments[ass.subjectId?._id || ass.subjectId] = ass.standards || [];
                  });
                }
                setTempAssignments(initialAssignments);
                setShowAssignModal(true);
              };

              return (
                <div className="space-y-6">
                  {/* Header Card */}
                  <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm flex justify-between items-center flex-wrap gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-[#3f2a1d]">Teacher Assignments</h2>
                      <p className="text-sm text-[#7f634e]">Manage teacher subject and grade assignments. Sections are automatically balanced based on workload.</p>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="flex gap-4 items-center bg-[#fffaf3] border border-[#d9c5b0] px-4 py-3 rounded-2xl max-w-md shadow-sm">
                    <Search className="h-5 w-5 text-[#8a6a50]" />
                    <input
                      type="text"
                      placeholder="Search teachers by name, employee ID, or department..."
                      value={assignSearchQuery}
                      onChange={(e) => setAssignSearchQuery(e.target.value)}
                      className="w-full bg-transparent text-sm text-[#3f2a1d] outline-none placeholder-[#8a6a50]/60"
                    />
                  </div>

                  {/* Teachers Grid */}
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTeachers.map(teacher => (
                      <div key={teacher._id} className="rounded-3xl border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm space-y-4 hover:shadow-md transition flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-[#7a4e2d] text-white flex items-center justify-center font-black text-sm shrink-0">
                              {teacher.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-base font-bold text-[#3f2a1d] truncate">{teacher.name}</h3>
                              <p className="text-xs text-[#8a6a50]">ID: {teacher.employeeId || 'N/A'} • {teacher.department || 'General'}</p>
                            </div>
                          </div>

                          {/* Active Assignments list */}
                          <div className="border-t border-[#d9c5b0]/40 pt-3 space-y-2">
                            <p className="text-[10px] font-bold text-[#8a6a50] uppercase tracking-wider">Assigned Subjects & Grades</p>
                            {teacher.assignedSubjectStandards && teacher.assignedSubjectStandards.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {teacher.assignedSubjectStandards.map(ass => {
                                  const sub = subjects.find(s => s._id === (ass.subjectId?._id || ass.subjectId));
                                  return (
                                    <span key={ass._id || ass.subjectId} className="text-[10px] font-bold bg-[#7a4e2d]/10 text-[#7a4e2d] px-2 py-0.5 rounded-full flex items-center gap-1">
                                      {sub?.name || 'Subject'}: {ass.standards?.join(', ')}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-[#8a6a50] italic">No active assignments</p>
                            )}

                            {/* Dynamically Allocated Divisions list */}
                            <p className="text-[10px] font-bold text-[#8a6a50] uppercase tracking-wider pt-1">Allocated Sections (Auto-Balanced)</p>
                            {teacher.subjectClassAssignments && teacher.subjectClassAssignments.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {teacher.subjectClassAssignments.map(ass => {
                                  const sub = subjects.find(s => s._id === (ass.subjectId?._id || ass.subjectId));
                                  const cls = classes.find(c => c._id === (ass.classId?._id || ass.classId));
                                  return (
                                    <span key={ass._id} className="text-[9px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                      {sub?.name || 'Sub'} ({cls?.standard}{cls?.division})
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-[#8a6a50] italic">No allocated sections</p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenAssignModal(teacher)}
                          className="w-full mt-4 rounded-xl border border-[#7a4e2d] px-4 py-2 text-xs font-bold text-[#7a4e2d] hover:bg-[#7a4e2d] hover:text-[#f7efe4] transition duration-200"
                        >
                          Assign Subjects & Standards
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* TIMETABLE TAB */}
            {activeTab === 'timetable' && (() => {
              const createdStds = [...new Set(classes.map(c => c.standard))].sort(sortStandards);
              const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              
              return (
                <div className="space-y-6 font-medium">
                  {/* Header Card */}
                  <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm flex justify-between items-center flex-wrap gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-[#3f2a1d]">Timetable Manager</h2>
                      <p className="text-sm text-[#7f634e]">Configure school timings, breaks, and auto-generate class timetables with a single click.</p>
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* TIMING CONFIGURATION CARD */}
                    <div className="rounded-3xl border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm space-y-4">
                      <h3 className="text-lg font-bold text-[#3f2a1d]">1. School Timings & Breaks</h3>
                      <form onSubmit={handleSaveTimetableConfig} className="space-y-4 font-semibold">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-[#6d4c35] mb-1">School Start Time</label>
                            <input
                              type="time"
                              required
                              value={timetableConfig.schoolStartTime}
                              onChange={(e) => setTimetableConfig({ ...timetableConfig, schoolStartTime: e.target.value })}
                              className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none font-bold text-[#3f2a1d]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#6d4c35] mb-1">School End Time</label>
                            <input
                              type="time"
                              required
                              value={timetableConfig.schoolEndTime}
                              onChange={(e) => setTimetableConfig({ ...timetableConfig, schoolEndTime: e.target.value })}
                              className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none font-bold text-[#3f2a1d]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-[#6d4c35] mb-1">Lecture Duration (mins)</label>
                            <input
                              type="number"
                              required
                              min="10"
                              max="180"
                              value={timetableConfig.lectureDurationMinutes}
                              onChange={(e) => setTimetableConfig({ ...timetableConfig, lectureDurationMinutes: Number(e.target.value) })}
                              className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none font-bold text-[#3f2a1d]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#6d4c35] mb-1">Academic Year</label>
                            <input
                              type="text"
                              required
                              value={timetableConfig.academicYear}
                              onChange={(e) => setTimetableConfig({ ...timetableConfig, academicYear: e.target.value })}
                              className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none font-bold text-[#3f2a1d]"
                            />
                          </div>
                        </div>

                        {/* Working Days */}
                        <div>
                          <label className="block text-xs font-bold text-[#6d4c35] mb-1">Working Days</label>
                          <div className="flex flex-wrap gap-3">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                              const isChecked = timetableConfig.workingDays?.includes(day);
                              return (
                                <label key={day} className="flex items-center gap-1.5 text-xs text-[#6d4c35] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const nextDays = e.target.checked
                                        ? [...(timetableConfig.workingDays || []), day]
                                        : (timetableConfig.workingDays || []).filter(d => d !== day);
                                      setTimetableConfig({ ...timetableConfig, workingDays: nextDays });
                                    }}
                                    className="rounded border-[#d9c5b0] text-[#7a4e2d] focus:ring-[#7a4e2d]"
                                  />
                                  {day}
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* Breaks list */}
                        <div className="border-t border-[#d9c5b0]/50 pt-4 space-y-3">
                          <h4 className="text-xs font-bold text-[#6d4c35] uppercase tracking-wider">Breaks Configuration</h4>
                          
                          {/* List of existing breaks */}
                          {timetableConfig.breaks && timetableConfig.breaks.length > 0 ? (
                            <div className="space-y-2">
                              {timetableConfig.breaks.map((br, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white border border-[#d9c5b0]/60 p-2.5 rounded-xl text-xs">
                                  <div>
                                    <span className="font-bold text-[#3f2a1d]">{br.name}</span>
                                    <span className="text-[#8a6a50] ml-2">({br.startTime} - {br.endTime})</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedBreaks = timetableConfig.breaks.filter((_, i) => i !== idx);
                                      setTimetableConfig({ ...timetableConfig, breaks: updatedBreaks });
                                    }}
                                    className="text-rose-500 hover:text-rose-700 font-bold"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-[#8a6a50] italic">No breaks configured yet. Specify breaks below.</p>
                          )}

                          {/* Add New Break Fields */}
                          <div className="bg-[#faf4ea] p-3 rounded-xl border border-[#d9c5b0] space-y-2">
                            <p className="text-xs font-bold text-[#7a4e2d]">Add Custom Break Slot</p>
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                type="text"
                                placeholder="Break Name (e.g. Lunch)"
                                value={newBreak.name}
                                onChange={(e) => setNewBreak({ ...newBreak, name: e.target.value })}
                                className="col-span-1 rounded-lg border border-[#d9c5b0] bg-white px-2 py-1.5 text-xs outline-none"
                              />
                              <input
                                type="time"
                                value={newBreak.startTime}
                                onChange={(e) => setNewBreak({ ...newBreak, startTime: e.target.value })}
                                className="col-span-1 rounded-lg border border-[#d9c5b0] bg-white px-2 py-1.5 text-xs outline-none"
                              />
                              <input
                                type="time"
                                value={newBreak.endTime}
                                onChange={(e) => setNewBreak({ ...newBreak, endTime: e.target.value })}
                                className="col-span-1 rounded-lg border border-[#d9c5b0] bg-white px-2 py-1.5 text-xs outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (!newBreak.startTime || !newBreak.endTime) {
                                  toast.error('Please specify start and end times for the break.');
                                  return;
                                }
                                const updatedBreaks = [...(timetableConfig.breaks || []), { ...newBreak }];
                                setTimetableConfig({ ...timetableConfig, breaks: updatedBreaks });
                                setNewBreak({ name: 'Short Break', startTime: '', endTime: '' });
                              }}
                              className="w-full text-center text-xs font-bold bg-[#7a4e2d]/10 text-[#7a4e2d] py-1.5 rounded-lg border border-[#7a4e2d]/20 hover:bg-[#7a4e2d]/20 transition animate-pulse"
                            >
                              + Add to Breaks
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSavingConfig}
                          className="w-full py-2.5 rounded-xl bg-[#7a4e2d] text-white text-xs font-bold hover:bg-[#624021] transition duration-200 disabled:opacity-50"
                        >
                          {isSavingConfig ? 'Saving Settings...' : 'Save Timing Configuration'}
                        </button>
                      </form>
                    </div>

                    {/* TIMETABLE GENERATION & GENERATOR CARD */}
                    <div className="rounded-3xl border border-[#d9c5b0] bg-[#fffaf3] p-6 shadow-sm space-y-4">
                      <h3 className="text-lg font-bold text-[#3f2a1d]">2. Auto-Generate Timetable</h3>
                      <p className="text-xs text-[#6d4c35] leading-relaxed">
                        Our algorithm automatically constructs a clash-free schedule. It respects subject weightages, assigned teachers' schedules, break times, and total standard lectures configured under Manage Subjects.
                      </p>
                      
                      <div className="bg-[#faf4ea] p-4 rounded-xl border border-[#d9c5b0] space-y-3">
                        <button
                          type="button"
                          onClick={handleGenerateTimetable}
                          disabled={isGeneratingTimetable}
                          className="w-full py-3 rounded-xl bg-[#7a4e2d] text-white text-sm font-black tracking-wide shadow-md hover:bg-[#624021] transition duration-200 disabled:opacity-50"
                        >
                          {isGeneratingTimetable ? 'Generating Clash-Free Schedule...' : '⚡ One-Click Generate All Timetables'}
                        </button>
                      </div>

                      {/* View generated timetable info placeholder */}
                      <div className="border-t border-[#d9c5b0]/50 pt-3 space-y-1 no-print">
                        <p className="text-[11px] text-[#8a6a50] italic font-semibold">
                          * Both Student and Teacher View timetables are generated instantly in one single click and displayed below.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* DISPLAY TIMETABLES (STUDENT & TEACHER VIEWS) */}
                  {allTimetables.length === 0 ? (
                    <div className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-8 text-center text-[#8a6a50] italic text-sm shadow-sm">
                      No timetables have been auto-generated yet. Please configure school timings, breaks, and click "⚡ One-Click Generate All Timetables" above to schedule classes conflict-free.
                    </div>
                  ) : (
                    timetableTabMode === null ? (
                      <div className="grid gap-6 md:grid-cols-2 pt-4">
                        {/* Student Timetables Card */}
                        <button
                          type="button"
                          onClick={() => setTimetableTabMode('student')}
                          className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-8 text-left shadow-sm hover:shadow-md hover:scale-[1.01] transition duration-200 group flex items-start gap-5"
                        >
                          <div className="p-4 bg-[#7a4e2d]/10 text-[#7a4e2d] rounded-2xl group-hover:bg-[#7a4e2d] group-hover:text-white transition duration-200">
                            <GraduationCap className="h-8 w-8" />
                          </div>
                          <div className="space-y-1.5">
                            <h4 className="text-lg font-bold text-[#3f2a1d]">Student View (All Timetables)</h4>
                            <p className="text-xs text-[#8a6a50] leading-relaxed">
                              View and print complete weekly timetable schedules for all standard-wise class division groups.
                            </p>
                          </div>
                        </button>

                        {/* Teacher Timetables Card */}
                        <button
                          type="button"
                          onClick={() => setTimetableTabMode('teacher')}
                          className="rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-8 text-left shadow-sm hover:shadow-md hover:scale-[1.01] transition duration-200 group flex items-start gap-5"
                        >
                          <div className="p-4 bg-[#7a4e2d]/10 text-[#7a4e2d] rounded-2xl group-hover:bg-[#7a4e2d] group-hover:text-white transition duration-200">
                            <Users className="h-8 w-8" />
                          </div>
                          <div className="space-y-1.5">
                            <h4 className="text-lg font-bold text-[#3f2a1d]">Teacher View (All Schedules)</h4>
                            <p className="text-xs text-[#8a6a50] leading-relaxed">
                              Inspect weekly teaching rosters, periods, and class division schedules for all teaching staff.
                            </p>
                          </div>
                        </button>
                      </div>
                    ) : (() => {
                      const toMin = (hhmm) => {
                        const [h, m] = hhmm.split(':').map(Number);
                        return h * 60 + m;
                      };

                      return (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center no-print">
                            <button
                              type="button"
                              onClick={() => setTimetableTabMode(null)}
                              className="px-3.5 py-2 bg-white border border-[#d9c5b0] text-[#7a4e2d] rounded-xl text-xs font-bold shadow-xs hover:bg-[#faf4ea] transition flex items-center gap-1.5"
                            >
                              ⬅️ Back
                            </button>
                          </div>

                          {timetableTabMode === 'student' ? (
                            /* 1. STUDENT VIEW (CLASS DIVISION WISE GRIDS) */
                            <div className="space-y-4">
                              <div className="border-b border-[#d9c5b0] pb-2 no-print">
                                <h3 className="text-lg font-bold text-[#3f2a1d]">Class Section Timetables (Student View)</h3>
                                <p className="text-xs text-[#8a6a50]">Weekly class section grids (Days vs Time Slots)</p>
                              </div>

                              <div className="grid gap-6 md:grid-cols-2">
                                {classes.map(cls => {
                                  const classTTs = allTimetables.filter(t => t.classId?._id?.toString() === cls._id.toString() || t.classId?.toString() === cls._id.toString());
                                  const slotsSet = new Set();
                                  classTTs.forEach(t => t.slots?.forEach(s => slotsSet.add(`${s.startTime} - ${s.endTime}`)));
                                  const classTimeSlots = [...slotsSet].sort((a, b) => toMin(a.split(' - ')[0]) - toMin(b.split(' - ')[0]));

                                  if (classTimeSlots.length === 0) return null;

                                  const cellContent = (day, slot) => {
                                    const tday = classTTs.find(t => t.dayOfWeek?.toLowerCase() === day.toLowerCase());
                                    if (!tday || !tday.slots) return null;
                                    const match = tday.slots.find(s => `${s.startTime} - ${s.endTime}` === slot);
                                    if (!match) return null;
                                    if (match.isBreak) {
                                      return (
                                        <div className="p-1.5 bg-[#ecd9c5]/40 border border-dashed border-[#b68c67]/40 rounded-xl text-center text-[9px] text-[#8a6a50] font-extrabold select-none">
                                          ☕ {match.breakName || 'Break'}
                                        </div>
                                      );
                                    }
                                    return (
                                      <div className="p-1.5 bg-[#faf4ea] border border-[#e1d0be] rounded-xl text-center shadow-xs">
                                        <p className="font-bold text-[#3f2a1d] text-[11px] leading-tight">{match.subjectId?.name || 'Subject'}</p>
                                        <p className="text-[9px] text-[#8a6a50] mt-0.5 font-semibold">{match.teacherId?.name || 'Teacher'}</p>
                                      </div>
                                    );
                                  };

                                  const cardId = `print-student-class-${cls._id}`;

                                  return (
                                    <div key={cls._id} id={cardId} className="rounded-3xl border border-[#d9c5b0] bg-[#fffaf3] p-5 shadow-xs space-y-3 overflow-x-auto print-card">
                                      <div className="flex justify-between items-center border-b border-[#d9c5b0]/35 pb-1.5 no-print">
                                        <span className="text-xs font-bold text-[#7a4e2d]">Grade {cls.standard} (Section {cls.division})</span>
                                        <button
                                          type="button"
                                          onClick={() => printSpecificTimetable(cardId)}
                                          className="px-2.5 py-1 bg-[#7a4e2d] text-white rounded-lg text-[9px] font-bold shadow-xs hover:bg-[#624021] transition flex items-center gap-1 no-print"
                                        >
                                          📥 Print / PDF
                                        </button>
                                      </div>

                                      <div className="hidden print:block mb-4 text-center">
                                        <h1 className="text-xl font-black text-[#3f2a1d]">{schoolName || 'School Hub'}</h1>
                                        <h2 className="text-md font-bold text-[#7a4e2d]">Class Timetable — Grade {cls.standard} (Section {cls.division})</h2>
                                        <p className="text-[10px] text-gray-500">Academic Year: 2026-2027</p>
                                      </div>

                                      <div className="min-w-full overflow-x-auto border border-[#d9c5b0] rounded-xl bg-white shadow-2xs">
                                        <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                                          <thead>
                                            <tr className="bg-[#faf4ea] border-b border-[#d9c5b0]">
                                              <th className="p-2.5 font-bold text-[#6d4c35] border-r border-[#d9c5b0] w-24 bg-[#faf4ea]">
                                                Day / Time
                                              </th>
                                              {classTimeSlots.map(slot => (
                                                <th key={slot} className="p-2.5 font-bold text-[#6d4c35] text-center border-r border-[#d9c5b0]/40 last:border-r-0">
                                                  {slot}
                                                </th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {daysOrder.map((day, dayIdx) => (
                                              <tr key={day} className="border-b border-[#d9c5b0]/45 last:border-b-0 hover:bg-[#fffaf3]/45 transition">
                                                <td className="p-2.5 font-bold text-[#7a4e2d] border-r border-[#d9c5b0] bg-[#faf4ea]">
                                                  {day}
                                                </td>
                                                {classTimeSlots.map(slot => {
                                                  const breakMatch = (() => {
                                                    for (const t of classTTs) {
                                                      const match = t.slots?.find(s => `${s.startTime} - ${s.endTime}` === slot);
                                                      if (match && match.isBreak) return match;
                                                    }
                                                    return null;
                                                  })();

                                                  if (breakMatch) {
                                                    if (dayIdx !== 0) return null;
                                                    return (
                                                      <td key={slot} rowSpan={daysOrder.length} className="p-2 border-r border-[#d9c5b0]/40 last:border-r-0 min-w-[70px] bg-[#ecd9c5]/30 text-center font-extrabold text-[#8a6a50] align-middle select-none">
                                                        <div className="flex flex-col items-center justify-center space-y-1 py-4">
                                                          <span>☕</span>
                                                          <span className="uppercase tracking-widest text-[9px] font-black" style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}>
                                                            {breakMatch.breakName || 'BREAK'}
                                                          </span>
                                                        </div>
                                                      </td>
                                                    );
                                                  }

                                                  const cell = cellContent(day, slot);
                                                  return (
                                                    <td key={slot} className="p-1 border-r border-[#d9c5b0]/40 last:border-r-0 min-w-[100px]">
                                                      {cell || (
                                                        <div className="p-1 bg-gray-50 border border-dashed border-gray-150 rounded-lg text-center text-[9px] text-gray-300 font-bold">
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
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            /* 2. TEACHER VIEW (TEACHER SCHEDULE GRIDS) */
                            <div className="space-y-4">
                              <div className="border-b border-[#d9c5b0] pb-2 no-print">
                                <h3 className="text-lg font-bold text-[#3f2a1d]">Teacher Schedules (Teacher View)</h3>
                                <p className="text-xs text-[#8a6a50]">Weekly schedules for all teachers (Days vs Time Slots)</p>
                              </div>

                              <div className="grid gap-6 md:grid-cols-2">
                                {teachers.map(teacher => {
                                  const slotsSet = new Set();
                                  allTimetables.forEach(t => t.slots?.forEach(s => {
                                    if (s.startTime && s.endTime) {
                                      if (s.isBreak || (s.teacherId?._id?.toString() === teacher._id.toString() || s.teacherId?.toString() === teacher._id.toString())) {
                                        slotsSet.add(`${s.startTime} - ${s.endTime}`);
                                      }
                                    }
                                  }));
                                  const teacherTimeSlots = [...slotsSet].sort((a, b) => toMin(a.split(' - ')[0]) - toMin(b.split(' - ')[0]));

                                  if (teacherTimeSlots.length === 0) return null;

                                  const cellContent = (day, slot) => {
                                    // 1. Check if it is a break
                                    for (const t of allTimetables) {
                                      if (t.dayOfWeek?.toLowerCase() === day.toLowerCase()) {
                                        const foundBreak = t.slots?.find(s => `${s.startTime} - ${s.endTime}` === slot && s.isBreak);
                                        if (foundBreak) {
                                          return (
                                            <div className="p-1.5 bg-[#ecd9c5]/40 border border-dashed border-[#b68c67]/40 rounded-xl text-center text-[9px] text-[#8a6a50] font-extrabold select-none">
                                              ☕ {foundBreak.breakName || 'Break'}
                                            </div>
                                          );
                                        }
                                      }
                                    }

                                    let match = null;
                                    let className = '';
                                    for (const t of allTimetables) {
                                      if (t.dayOfWeek?.toLowerCase() === day.toLowerCase()) {
                                        const found = t.slots?.find(s => 
                                          `${s.startTime} - ${s.endTime}` === slot && 
                                          (s.teacherId?._id?.toString() === teacher._id.toString() || s.teacherId?.toString() === teacher._id.toString())
                                        );
                                        if (found) {
                                          match = found;
                                          className = t.classId ? `Grade ${t.classId.standard} (Section ${t.classId.division})` : 'Class';
                                          break;
                                        }
                                      }
                                    }
                                    if (!match) return null;
                                    return (
                                      <div className="p-1.5 bg-[#7a4e2d]/5 border border-[#7a4e2d]/10 rounded-xl text-center shadow-xs">
                                        <p className="font-bold text-[#7a4e2d] text-[11px] leading-tight">{match.subjectId?.name || 'Subject'}</p>
                                        <p className="text-[9px] text-[#8a6a50] mt-0.5 font-bold">{className}</p>
                                      </div>
                                    );
                                  };

                                  const cardId = `print-teacher-${teacher._id}`;

                                  return (
                                    <div key={teacher._id} id={cardId} className="rounded-3xl border border-[#d9c5b0] bg-[#fffaf3] p-5 shadow-xs space-y-3 overflow-x-auto print-card">
                                      <div className="flex justify-between items-center border-b border-[#d9c5b0]/35 pb-1.5 no-print">
                                        <span className="text-xs font-bold text-[#7a4e2d]">{teacher.name}</span>
                                        <button
                                          type="button"
                                          onClick={() => printSpecificTimetable(cardId)}
                                          className="px-2.5 py-1 bg-[#7a4e2d] text-white rounded-lg text-[9px] font-bold shadow-xs hover:bg-[#624021] transition flex items-center gap-1 no-print"
                                        >
                                          📥 Print / PDF
                                        </button>
                                      </div>

                                      <div className="hidden print:block mb-4 text-center">
                                        <h1 className="text-xl font-black text-[#3f2a1d]">{schoolName || 'School Hub'}</h1>
                                        <h2 className="text-md font-bold text-[#7a4e2d]">Teacher Schedule — {teacher.name}</h2>
                                        <p className="text-[10px] text-gray-500">Employee ID: {teacher.employeeId || ''} | Dept: {teacher.department || ''}</p>
                                      </div>

                                      <div className="min-w-full overflow-x-auto border border-[#d9c5b0] rounded-xl bg-white shadow-2xs">
                                        <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                                          <thead>
                                            <tr className="bg-[#faf4ea] border-b border-[#d9c5b0]">
                                              <th className="p-2.5 font-bold text-[#6d4c35] border-r border-[#d9c5b0] w-24 bg-[#faf4ea]">
                                                Day / Time
                                              </th>
                                              {teacherTimeSlots.map(slot => (
                                                <th key={slot} className="p-2.5 font-bold text-[#6d4c35] text-center border-r border-[#d9c5b0]/40 last:border-r-0">
                                                  {slot}
                                                </th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {daysOrder.map((day, dayIdx) => (
                                              <tr key={day} className="border-b border-[#d9c5b0]/45 last:border-b-0 hover:bg-[#fffaf3]/45 transition">
                                                <td className="p-2.5 font-bold text-[#7a4e2d] border-r border-[#d9c5b0] bg-[#faf4ea]">
                                                  {day}
                                                </td>
                                                {teacherTimeSlots.map(slot => {
                                                  const breakMatch = (() => {
                                                    for (const t of allTimetables) {
                                                      const match = t.slots?.find(s => `${s.startTime} - ${s.endTime}` === slot);
                                                      if (match && match.isBreak) return match;
                                                    }
                                                    return null;
                                                  })();

                                                  if (breakMatch) {
                                                    if (dayIdx !== 0) return null;
                                                    return (
                                                      <td key={slot} rowSpan={daysOrder.length} className="p-2 border-r border-[#d9c5b0]/40 last:border-r-0 min-w-[70px] bg-[#ecd9c5]/30 text-center font-extrabold text-[#8a6a50] align-middle select-none">
                                                        <div className="flex flex-col items-center justify-center space-y-1 py-4">
                                                          <span>☕</span>
                                                          <span className="uppercase tracking-widest text-[9px] font-black" style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}>
                                                            {breakMatch.breakName || 'BREAK'}
                                                          </span>
                                                        </div>
                                                      </td>
                                                    );
                                                  }

                                                  const cell = cellContent(day, slot);
                                                  return (
                                                    <td key={slot} className="p-1 border-r border-[#d9c5b0]/40 last:border-r-0 min-w-[100px]">
                                                      {cell || (
                                                        <div className="p-1 bg-gray-50 border border-dashed border-gray-150 rounded-lg text-center text-[9px] text-gray-300 font-bold">
                                                          Free Period
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
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>
              );
            })()}
          </>
        )}

        {/* --- ADD TEACHER MODAL --- */}
        {showAddTeacherModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-4xl bg-[#fffaf3] rounded-[2rem] border border-[#d9c5b0] p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-[#d9c5b0] pb-4">
                <div>
                  <h2 className="text-2xl font-black text-[#3f2a1d]">{editingTeacherId ? 'Edit Teacher Details' : 'Add New Teacher'}</h2>
                  <p className="text-sm text-[#7f634e]">Provide detailed professional, contact, payroll and qualification data.</p>
                </div>
                <button onClick={() => setShowAddTeacherModal(false)} className="p-2 text-[#8a6a50] hover:bg-[#f4ecdf] rounded-full transition">
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Form Tabs */}
              <div className="flex border-b border-[#d9c5b0] gap-4 overflow-x-auto pb-2">
                {[
                  ['basic', 'Basic Info'],
                  ['contact', 'Contact'],
                  ['professional', 'Professional'],
                  ['qualifications', 'Qualifications'],
                  ['payroll', 'Payroll'],
                  ['documents', 'Documents'],
                ].map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTeacherModalTab(tab)}
                    className={`px-3 py-1.5 text-xs font-bold whitespace-nowrap rounded-xl transition ${teacherModalTab === tab ? 'bg-[#7a4e2d] text-[#f7efe4]' : 'text-[#8a6a50] hover:bg-[#f4ecdf]'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleTeacherSubmit} className="space-y-6">
                
                {/* TAB 1: BASIC INFORMATION */}
                {teacherModalTab === 'basic' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Full Name (Display Name) *</label>
                      <input type="text" required value={teacherForm.name} onChange={(e) => setTeacherForm({...teacherForm, name: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Employee ID / Staff Code</label>
                      <input type="text" value={teacherForm.employeeId} onChange={(e) => setTeacherForm({...teacherForm, employeeId: e.target.value, staffCode: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">First Name</label>
                      <input type="text" value={teacherForm.firstName} onChange={(e) => setTeacherForm({...teacherForm, firstName: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Middle Name</label>
                      <input type="text" value={teacherForm.middleName} onChange={(e) => setTeacherForm({...teacherForm, middleName: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Last Name</label>
                      <input type="text" value={teacherForm.lastName} onChange={(e) => setTeacherForm({...teacherForm, lastName: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Gender</label>
                      <select value={teacherForm.gender} onChange={(e) => setTeacherForm({...teacherForm, gender: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none">
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Date of Birth</label>
                      <input type="date" value={teacherForm.dateOfBirth} onChange={(e) => setTeacherForm({...teacherForm, dateOfBirth: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Blood Group</label>
                      <input type="text" placeholder="e.g. O+" value={teacherForm.bloodGroup} onChange={(e) => setTeacherForm({...teacherForm, bloodGroup: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Aadhaar Number (Optional)</label>
                      <input type="text" value={teacherForm.aadhaarNumber} onChange={(e) => setTeacherForm({...teacherForm, aadhaarNumber: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">PAN Number (Optional)</label>
                      <input type="text" value={teacherForm.panNumber} onChange={(e) => setTeacherForm({...teacherForm, panNumber: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Nationality</label>
                      <input type="text" value={teacherForm.nationality} onChange={(e) => setTeacherForm({...teacherForm, nationality: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Marital Status</label>
                      <select value={teacherForm.maritalStatus} onChange={(e) => setTeacherForm({...teacherForm, maritalStatus: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none">
                        <option>Single</option>
                        <option>Married</option>
                        <option>Divorced</option>
                        <option>Widowed</option>
                      </select>
                    </div>
                    <div className="border-t border-[#d9c5b0] col-span-2 pt-4">
                      <h4 className="text-sm font-bold text-[#3f2a1d] mb-3">Login Credentials</h4>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Email / Username *</label>
                      <input type="email" required value={teacherForm.email} onChange={(e) => setTeacherForm({...teacherForm, email: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Password *</label>
                      <input type="password" required={!editingTeacherId} placeholder={editingTeacherId ? "Leave blank to keep current" : "At least 6 characters"} value={teacherForm.password} onChange={(e) => setTeacherForm({...teacherForm, password: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      <div className="mt-1.5 space-y-1 text-[10px]">
                        <p className="font-semibold text-[#6d4c35]">Password requirements:</p>
                        <div className="grid grid-cols-2 gap-1 mt-0.5">
                          <div className="flex items-center gap-1">
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${(teacherForm.password || '').length >= 6 ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className={(teacherForm.password || '').length >= 6 ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>Min 6 characters</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${/[A-Z]/.test(teacherForm.password || '') ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className={/[A-Z]/.test(teacherForm.password || '') ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>1 capital letter</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${/[0-9]/.test(teacherForm.password || '') ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className={/[0-9]/.test(teacherForm.password || '') ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>1 number</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(teacherForm.password || '') ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(teacherForm.password || '') ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>1 special character</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: CONTACT INFORMATION */}
                {teacherModalTab === 'contact' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Mobile Number *</label>
                      <input type="tel" required value={teacherForm.phone} onChange={(e) => setTeacherForm({...teacherForm, phone: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Alternate Mobile Number</label>
                      <input type="tel" value={teacherForm.alternateMobileNumber} onChange={(e) => setTeacherForm({...teacherForm, alternateMobileNumber: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Emergency Contact Number</label>
                      <input type="tel" value={teacherForm.emergencyContactNumber} onChange={(e) => setTeacherForm({...teacherForm, emergencyContactNumber: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">PIN Code</label>
                      <input type="text" value={teacherForm.pinCode} onChange={(e) => setTeacherForm({...teacherForm, pinCode: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Current Address</label>
                      <textarea value={teacherForm.currentAddress} onChange={(e) => setTeacherForm({...teacherForm, currentAddress: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none h-16" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Permanent Address</label>
                      <textarea value={teacherForm.permanentAddress} onChange={(e) => setTeacherForm({...teacherForm, permanentAddress: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none h-16" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">City</label>
                      <input type="text" value={teacherForm.city} onChange={(e) => setTeacherForm({...teacherForm, city: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">State</label>
                      <input type="text" value={teacherForm.state} onChange={(e) => setTeacherForm({...teacherForm, state: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                  </div>
                )}

                {/* TAB 3: PROFESSIONAL INFORMATION */}
                {teacherModalTab === 'professional' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Designation</label>
                      <input type="text" placeholder="e.g. Senior Lecturer" value={teacherForm.designation} onChange={(e) => setTeacherForm({...teacherForm, designation: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Department</label>
                      <input type="text" placeholder="e.g. Mathematics" value={teacherForm.department} onChange={(e) => setTeacherForm({...teacherForm, department: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Joining Date</label>
                      <input type="date" value={teacherForm.joiningDate} onChange={(e) => setTeacherForm({...teacherForm, joiningDate: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Employment Type</label>
                      <select value={teacherForm.employmentType} onChange={(e) => setTeacherForm({...teacherForm, employmentType: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none">
                        <option>Full-Time</option>
                        <option>Part-Time</option>
                        <option>Contract</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Experience (Years)</label>
                      <input type="number" value={teacherForm.experience} onChange={(e) => setTeacherForm({...teacherForm, experience: Number(e.target.value)})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Previous School</label>
                      <input type="text" value={teacherForm.previousSchool} onChange={(e) => setTeacherForm({...teacherForm, previousSchool: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Employee Status</label>
                      <select value={teacherForm.employeeStatus} onChange={(e) => setTeacherForm({...teacherForm, employeeStatus: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none">
                        <option>Active</option>
                        <option>On Leave</option>
                        <option>Resigned</option>
                        <option>Retired</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Reporting To</label>
                      <input type="text" placeholder="e.g. Principal" value={teacherForm.reportingTo} onChange={(e) => setTeacherForm({...teacherForm, reportingTo: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div className="border-t border-[#d9c5b0] col-span-2 pt-4">
                      <h4 className="text-sm font-bold text-[#3f2a1d] mb-3">Class Teacher Assignment</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="isClassTeacher" checked={teacherForm.isClassTeacher} onChange={(e) => setTeacherForm({...teacherForm, isClassTeacher: e.target.checked})} className="rounded border-[#d9c5b0]" />
                      <label htmlFor="isClassTeacher" className="text-xs font-bold text-[#6d4c35]">Is Class Teacher?</label>
                    </div>
                    {teacherForm.isClassTeacher && (
                      <div className="col-span-2 grid grid-cols-2 gap-4 bg-[#faf4ea]/50 p-4 rounded-2xl border border-[#d9c5b0]">
                        <div className="col-span-2">
                          <h5 className="text-xs font-bold text-[#7a4e2d]">Assign Class by Grade & Section</h5>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#6d4c35] mb-1">Grade *</label>
                          <select
                            required
                            value={teacherForm.classTeacherStandard || ''}
                            onChange={(e) => {
                              const std = e.target.value;
                              setTeacherForm({
                                ...teacherForm,
                                classTeacherStandard: std,
                                classTeacherDivision: '',
                                classTeacherOf: ''
                              });
                            }}
                            className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none focus:bg-white"
                          >
                            <option value="">-- Select Grade --</option>
                            {[...new Set(classes.map(c => c.standard))].sort(sortStandards).map(std => (
                              <option key={std} value={std}>{std}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#6d4c35] mb-1">Section *</label>
                          <select
                            required
                            disabled={!teacherForm.classTeacherStandard}
                            value={teacherForm.classTeacherDivision || ''}
                            onChange={(e) => {
                              const div = e.target.value;
                              setTeacherForm({
                                ...teacherForm,
                                classTeacherDivision: div
                              });
                              handleStdDivChange(teacherForm.classTeacherStandard, div);
                            }}
                            className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none focus:bg-white disabled:opacity-50"
                          >
                            <option value="">-- Select Section --</option>
                            {teacherForm.classTeacherStandard && classes
                              .filter(c => c.standard === teacherForm.classTeacherStandard)
                              .map(c => c.division)
                              .sort()
                              .map(div => (
                                <option key={div} value={div}>{div}</option>
                              ))
                            }
                          </select>
                        </div>
                        <p className="col-span-2 text-xs text-[#8a6a50] italic">
                          Type any Standard and Division. The system will automatically link or create this Class.
                        </p>
                      </div>
                    )}

                  </div>
                )}

                {/* TAB 4: ACADEMIC QUALIFICATIONS */}
                {teacherModalTab === 'qualifications' && (
                  <div className="space-y-4">
                    <p className="text-xs text-[#7f634e]">Provide university, graduation year, and GPA/percentage for each applicable degree.</p>
                    <div className="overflow-x-auto rounded-2xl border border-[#d9c5b0]">
                      <table className="w-full text-left text-sm text-[#6d4c35]">
                        <thead className="bg-[#f4ecdf] text-xs font-bold uppercase text-[#3f2a1d]">
                          <tr>
                            <th className="px-4 py-3">Degree</th>
                            <th className="px-4 py-3">University</th>
                            <th className="px-4 py-3">Year</th>
                            <th className="px-4 py-3">Percentage/CGPA</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#d9c5b0]">
                          {teacherForm.qualifications.map((q, idx) => (
                            <tr key={q.degree}>
                              <td className="px-4 py-2 font-semibold">{q.degree}</td>
                              <td className="px-4 py-2">
                                <input 
                                  type="text" 
                                  placeholder="University Name" 
                                  value={q.university} 
                                  onChange={(e) => {
                                    const newQuals = [...teacherForm.qualifications];
                                    newQuals[idx].university = e.target.value;
                                    setTeacherForm({...teacherForm, qualifications: newQuals});
                                  }}
                                  className="w-full rounded-lg border border-[#d9c5b0] bg-[#faf4ea] px-2 py-1 text-xs outline-none"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input 
                                  type="text" 
                                  placeholder="Year" 
                                  value={q.year} 
                                  onChange={(e) => {
                                    const newQuals = [...teacherForm.qualifications];
                                    newQuals[idx].year = e.target.value;
                                    setTeacherForm({...teacherForm, qualifications: newQuals});
                                  }}
                                  className="w-full rounded-lg border border-[#d9c5b0] bg-[#faf4ea] px-2 py-1 text-xs outline-none"
                                />
                              </td>
                              <td className="px-4 py-2">
                                  <input 
                                  type="text" 
                                  placeholder="Percentage/CGPA" 
                                  value={q.percentageCGPA} 
                                  onChange={(e) => {
                                    const newQuals = [...teacherForm.qualifications];
                                    newQuals[idx].percentageCGPA = e.target.value;
                                    setTeacherForm({...teacherForm, qualifications: newQuals});
                                  }}
                                  className="w-full rounded-lg border border-[#d9c5b0] bg-[#faf4ea] px-2 py-1 text-xs outline-none"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 5: SALARY / PAYROLL */}
                {teacherModalTab === 'payroll' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Basic Salary</label>
                      <input type="number" value={teacherForm.basicSalary} onChange={(e) => setTeacherForm({...teacherForm, basicSalary: Number(e.target.value)})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">HRA</label>
                      <input type="number" value={teacherForm.hra} onChange={(e) => setTeacherForm({...teacherForm, hra: Number(e.target.value)})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">DA</label>
                      <input type="number" value={teacherForm.da} onChange={(e) => setTeacherForm({...teacherForm, da: Number(e.target.value)})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Other Allowances</label>
                      <input type="number" value={teacherForm.otherAllowances} onChange={(e) => setTeacherForm({...teacherForm, otherAllowances: Number(e.target.value)})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Deductions</label>
                      <input type="number" value={teacherForm.deductions} onChange={(e) => setTeacherForm({...teacherForm, deductions: Number(e.target.value)})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">PF</label>
                      <input type="number" value={teacherForm.pf} onChange={(e) => setTeacherForm({...teacherForm, pf: Number(e.target.value)})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Tax</label>
                      <input type="number" value={teacherForm.tax} onChange={(e) => setTeacherForm({...teacherForm, tax: Number(e.target.value)})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Bank Name</label>
                      <input type="text" value={teacherForm.bankName} onChange={(e) => setTeacherForm({...teacherForm, bankName: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Account Number</label>
                      <input type="text" value={teacherForm.accountNumber} onChange={(e) => setTeacherForm({...teacherForm, accountNumber: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">IFSC Code</label>
                      <input type="text" value={teacherForm.ifscCode} onChange={(e) => setTeacherForm({...teacherForm, ifscCode: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                  </div>
                )}

                {/* TAB 6: DOCUMENTS */}
                {teacherModalTab === 'documents' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Aadhaar Card (PDF / Image)</label>
                      <input 
                        type="file" 
                        onChange={(e) => handleFileUpload(e, 'docAadhaarCard')} 
                        className="w-full text-xs text-[#6d4c35] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#7a4e2d] file:text-[#f7efe4] hover:file:bg-[#624021]" 
                      />
                      {uploadingField === 'docAadhaarCard' && <p className="text-xs text-amber-600 mt-1">Uploading...</p>}
                      {teacherForm.docAadhaarCard && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ File uploaded: <a href={teacherForm.docAadhaarCard} target="_blank" rel="noopener noreferrer" className="underline font-semibold">View document</a>
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">PAN Card (PDF / Image)</label>
                      <input 
                        type="file" 
                        onChange={(e) => handleFileUpload(e, 'docPanCard')} 
                        className="w-full text-xs text-[#6d4c35] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#7a4e2d] file:text-[#f7efe4] hover:file:bg-[#624021]" 
                      />
                      {uploadingField === 'docPanCard' && <p className="text-xs text-amber-600 mt-1">Uploading...</p>}
                      {teacherForm.docPanCard && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ File uploaded: <a href={teacherForm.docPanCard} target="_blank" rel="noopener noreferrer" className="underline font-semibold">View document</a>
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Degree Certificates (PDF / Image)</label>
                      <input 
                        type="file" 
                        onChange={(e) => handleFileUpload(e, 'docDegreeCertificates')} 
                        className="w-full text-xs text-[#6d4c35] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#7a4e2d] file:text-[#f7efe4] hover:file:bg-[#624021]" 
                      />
                      {uploadingField === 'docDegreeCertificates' && <p className="text-xs text-amber-600 mt-1">Uploading...</p>}
                      {teacherForm.docDegreeCertificates && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ File uploaded: <a href={teacherForm.docDegreeCertificates} target="_blank" rel="noopener noreferrer" className="underline font-semibold">View document</a>
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Resume (PDF / DOC)</label>
                      <input 
                        type="file" 
                        onChange={(e) => handleFileUpload(e, 'docResume')} 
                        className="w-full text-xs text-[#6d4c35] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#7a4e2d] file:text-[#f7efe4] hover:file:bg-[#624021]" 
                      />
                      {uploadingField === 'docResume' && <p className="text-xs text-amber-600 mt-1">Uploading...</p>}
                      {teacherForm.docResume && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ File uploaded: <a href={teacherForm.docResume} target="_blank" rel="noopener noreferrer" className="underline font-semibold">View document</a>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 7: ASSIGN SUBJECTS */}
                {teacherModalTab === 'subjects' && (() => {
                  // Compute age from DOB
                  const dob = teacherForm.dateOfBirth ? new Date(teacherForm.dateOfBirth) : null;
                  const age = dob ? Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null;

                  // All unique standards from subjects
                  const stdList = [...new Set(
                    subjects.flatMap(s => s.standard ? s.standard.split(',').map(x => x.trim()) : [])
                  )].sort(sortStandards);

                  return (
                    <div className="space-y-5">
                      {/* Teacher summary card */}
                      <div className="flex items-center gap-4 p-4 bg-white border border-[#d9c5b0] rounded-2xl">
                        <div className="h-12 w-12 rounded-2xl bg-[#7a4e2d] flex items-center justify-center text-white font-black text-lg shrink-0">
                          {teacherForm.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-[#3f2a1d] text-base truncate">{teacherForm.name || 'Teacher Name'}</p>
                          <div className="flex gap-3 flex-wrap mt-0.5">
                            <span className="text-[10px] font-bold text-[#8a6a50] bg-[#7a4e2d]/10 px-2 py-0.5 rounded-full">
                              {teacherForm.gender || 'Gender N/A'}
                            </span>
                            {age !== null && (
                              <span className="text-[10px] font-bold text-[#8a6a50] bg-[#7a4e2d]/10 px-2 py-0.5 rounded-full">
                                Age: {age} yrs
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-[#8a6a50] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                              {teacherForm.subjectIds?.length || 0} subject{teacherForm.subjectIds?.length !== 1 ? 's' : ''} assigned
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Subjects grouped by standard */}
                      {stdList.length === 0 ? (
                        <p className="text-xs text-[#8a6a50] italic text-center py-8">No subjects configured yet. Add subjects in the Manage Subjects section first.</p>
                      ) : (
                        <div className="space-y-4">
                          {stdList.map(std => {
                            const stdSubjects = subjects.filter(s =>
                              s.standard && s.standard.split(',').map(x => x.trim()).includes(std)
                            );
                            const allChecked = stdSubjects.every(s => teacherForm.subjectIds?.includes(s._id));
                            const someChecked = stdSubjects.some(s => teacherForm.subjectIds?.includes(s._id));

                            return (
                              <div key={std} className="rounded-2xl border border-[#d9c5b0] bg-white overflow-hidden">
                                {/* Standard header with select-all */}
                                <div className="flex items-center gap-3 px-4 py-3 bg-[#7a4e2d]/5 border-b border-[#d9c5b0]">
                                  <input
                                    type="checkbox"
                                    id={`std-all-${std}`}
                                    checked={allChecked}
                                    ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                                    onChange={e => {
                                      const ids = stdSubjects.map(s => s._id);
                                      if (e.target.checked) {
                                        setTeacherForm(prev => ({ ...prev, subjectIds: [...new Set([...(prev.subjectIds || []), ...ids])] }));
                                      } else {
                                        setTeacherForm(prev => ({ ...prev, subjectIds: (prev.subjectIds || []).filter(id => !ids.includes(id)) }));
                                      }
                                    }}
                                    className="h-4 w-4 accent-[#7a4e2d] cursor-pointer"
                                  />
                                  <label htmlFor={`std-all-${std}`} className="font-black text-[#3f2a1d] text-sm cursor-pointer">
                                    {std.match(/^\d+$/) ? `Grade ${std}` : std}
                                  </label>
                                  <span className="ml-auto text-[10px] text-[#8a6a50]">{stdSubjects.length} subject{stdSubjects.length !== 1 ? 's' : ''}</span>
                                </div>

                                {/* Subject checkboxes */}
                                <div className="p-3 grid gap-2 sm:grid-cols-2">
                                  {stdSubjects.map(sub => {
                                    const checked = teacherForm.subjectIds?.includes(sub._id);
                                    return (
                                      <label
                                        key={sub._id}
                                        htmlFor={`sub-${sub._id}`}
                                        className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition ${checked ? 'border-[#7a4e2d] bg-[#7a4e2d]/5' : 'border-[#d9c5b0]/60 hover:border-[#7a4e2d]/40'}`}
                                      >
                                        <input
                                          type="checkbox"
                                          id={`sub-${sub._id}`}
                                          checked={checked}
                                          onChange={e => {
                                            if (e.target.checked) {
                                              setTeacherForm(prev => ({ ...prev, subjectIds: [...(prev.subjectIds || []), sub._id] }));
                                            } else {
                                              setTeacherForm(prev => ({ ...prev, subjectIds: (prev.subjectIds || []).filter(id => id !== sub._id) }));
                                            }
                                          }}
                                          className="h-4 w-4 accent-[#7a4e2d] shrink-0"
                                        />
                                        <div className="min-w-0">
                                          <p className="text-xs font-bold text-[#3f2a1d] truncate">{sub.name}</p>
                                          {sub.code && <p className="text-[10px] text-[#8a6a50]">{sub.code}</p>}
                                        </div>
                                        {checked && <span className="ml-auto text-emerald-600 text-[10px] font-bold shrink-0">✓</span>}
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Selected summary */}
                      {(teacherForm.subjectIds?.length || 0) > 0 && (
                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                          <p className="text-[10px] font-bold text-emerald-700 uppercase mb-2">Assigned Subjects ({teacherForm.subjectIds.length})</p>
                          <div className="flex flex-wrap gap-1.5">
                            {teacherForm.subjectIds.map(id => {
                              const sub = subjects.find(s => s._id === id);
                              return sub ? (
                                <span key={id} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white border border-emerald-300 text-emerald-700">
                                  {sub.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}


                <div className="flex justify-end gap-2 border-t border-[#d9c5b0] pt-4">
                  <button type="button" onClick={() => setShowAddTeacherModal(false)} className="rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-4 py-2 text-sm font-semibold text-[#8a6a50] hover:bg-[#f4ecdf] transition">
                    Cancel
                  </button>
                  <button type="submit" className="rounded-xl bg-[#7a4e2d] px-4 py-2 text-sm font-semibold text-[#f7efe4] hover:bg-[#624021] transition">
                    {editingTeacherId ? 'Update Teacher' : 'Save Teacher'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- ASSIGN SUBJECTS MODAL --- */}
        {showAssignSubjectsModal && assignSubjectsTeacher && (() => {
          const t = assignSubjectsTeacher;
          const dob = t.dateOfBirth ? new Date(t.dateOfBirth) : null;
          const age = dob ? Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null;
          const stdList = [...new Set(
            subjects.flatMap(s => s.standard ? s.standard.split(',').map(x => x.trim()) : [])
          )].sort(sortStandards);

          const handleSave = async () => {
            try {
              setSavingSubjects(true);
              await apiClient.put(`/teachers/${t._id}`, { subjectIds: assignSubjectsIds });
              toast.success(`Subjects assigned to ${t.name}!`);
              setShowAssignSubjectsModal(false);
              setAssignSubjectsTeacher(null);
              fetchData();
            } catch (err) {
              toast.error(err.response?.data?.message || 'Failed to assign subjects');
            } finally {
              setSavingSubjects(false);
            }
          };

          return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="w-full max-w-lg rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#d9c5b0] px-6 py-4 shrink-0">
                  <h3 className="text-lg font-black text-[#3f2a1d]">📚 Assign Subjects</h3>
                  <button onClick={() => { setShowAssignSubjectsModal(false); setAssignSubjectsTeacher(null); }} className="rounded-full p-1.5 text-[#8a6a50] hover:bg-[#f4ecdf]">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Teacher info card */}
                <div className="px-6 pt-5 shrink-0">
                  <div className="flex items-center gap-4 p-4 bg-white border border-[#d9c5b0] rounded-2xl">
                    <div className="h-12 w-12 rounded-2xl bg-[#7a4e2d] flex items-center justify-center text-white font-black text-lg shrink-0">
                      {t.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[#3f2a1d] text-base truncate">{t.name}</p>
                      <div className="flex gap-2 flex-wrap mt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7a4e2d]/10 text-[#7a4e2d]">
                          {t.gender || 'Gender N/A'}
                        </span>
                        {age !== null && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7a4e2d]/10 text-[#7a4e2d]">
                            Age {age} yrs
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          {assignSubjectsIds.length} subject{assignSubjectsIds.length !== 1 ? 's' : ''} selected
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subject list scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {stdList.length === 0 ? (
                    <p className="text-xs text-[#8a6a50] italic text-center py-8">No subjects configured. Add subjects in Manage Subjects first.</p>
                  ) : stdList.map(std => {
                    const stdSubjects = subjects.filter(s =>
                      s.standard && s.standard.split(',').map(x => x.trim()).includes(std)
                    );
                    const allChecked = stdSubjects.every(s => assignSubjectsIds.includes(s._id));
                    const someChecked = stdSubjects.some(s => assignSubjectsIds.includes(s._id));

                    return (
                      <div key={std} className="rounded-2xl border border-[#d9c5b0] bg-white overflow-hidden">
                        {/* Standard row with select all */}
                        <div className="flex items-center gap-3 px-4 py-3 bg-[#7a4e2d]/5 border-b border-[#d9c5b0]">
                          <input
                            type="checkbox"
                            id={`asgn-std-${std}`}
                            checked={allChecked}
                            ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                            onChange={e => {
                              const ids = stdSubjects.map(s => s._id);
                              if (e.target.checked) {
                                setAssignSubjectsIds(prev => [...new Set([...prev, ...ids])]);
                              } else {
                                setAssignSubjectsIds(prev => prev.filter(id => !ids.includes(id)));
                              }
                            }}
                            className="h-4 w-4 accent-[#7a4e2d] cursor-pointer"
                          />
                          <label htmlFor={`asgn-std-${std}`} className="font-black text-[#3f2a1d] text-sm cursor-pointer flex-1">
                            {std.match(/^\d+$/) ? `Grade ${std}` : std}
                          </label>
                          <span className="text-[10px] text-[#8a6a50]">{stdSubjects.length} subject{stdSubjects.length !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Subjects */}
                        <div className="p-3 grid gap-2 sm:grid-cols-2">
                          {stdSubjects.map(sub => {
                            const checked = assignSubjectsIds.includes(sub._id);
                            return (
                              <label
                                key={sub._id}
                                htmlFor={`asgn-sub-${sub._id}`}
                                className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition ${checked ? 'border-[#7a4e2d] bg-[#7a4e2d]/5' : 'border-[#d9c5b0]/60 hover:border-[#7a4e2d]/40'}`}
                              >
                                <input
                                  type="checkbox"
                                  id={`asgn-sub-${sub._id}`}
                                  checked={checked}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setAssignSubjectsIds(prev => [...prev, sub._id]);
                                    } else {
                                      setAssignSubjectsIds(prev => prev.filter(id => id !== sub._id));
                                    }
                                  }}
                                  className="h-4 w-4 accent-[#7a4e2d] shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-[#3f2a1d] truncate">{sub.name}</p>
                                  {sub.code && <p className="text-[10px] text-[#8a6a50]">{sub.code}</p>}
                                </div>
                                {checked && <span className="text-emerald-600 text-[10px] font-bold shrink-0">✓</span>}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Selected chips summary */}
                  {assignSubjectsIds.length > 0 && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                      <p className="text-[10px] font-bold text-emerald-700 uppercase mb-2">Assigned ({assignSubjectsIds.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {assignSubjectsIds.map(id => {
                          const sub = subjects.find(s => s._id === id);
                          return sub ? (
                            <span key={id} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white border border-emerald-300 text-emerald-700">
                              {sub.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 border-t border-[#d9c5b0] px-6 py-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setShowAssignSubjectsModal(false); setAssignSubjectsTeacher(null); }}
                    className="rounded-xl border border-[#d9c5b0] bg-white px-5 py-2 text-sm font-bold text-[#7a4e2d] hover:bg-[#7a4e2d]/10 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={savingSubjects}
                    className="rounded-xl bg-[#7a4e2d] px-6 py-2 text-sm font-bold text-[#f7efe4] hover:bg-[#624021] transition disabled:opacity-50"
                  >
                    {savingSubjects ? 'Saving...' : 'Save Assignment'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* --- ADD STUDENT MODAL --- */}
        {showAddStudentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-4xl bg-[#fffaf3] rounded-[2rem] border border-[#d9c5b0] p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-[#d9c5b0] pb-4">
                <div>
                  <h2 className="text-2xl font-black text-[#3f2a1d]">{editingStudentId ? 'Edit Student Details' : 'Add New Student'}</h2>
                  <p className="text-sm text-[#7f634e]">Register student details, login info, and upload supporting documents.</p>
                </div>
                <button onClick={() => setShowAddStudentModal(false)} className="p-2 text-[#8a6a50] hover:bg-[#f4ecdf] rounded-full transition">
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Form Tabs */}
              <div className="flex border-b border-[#d9c5b0] gap-4 overflow-x-auto pb-2">
                {[
                  ['basic', 'Basic Info'],
                  ['contact', 'Contact'],
                  ['parent', 'Parents/Guardian'],
                  ['academic', 'Academic'],
                  ['health', 'Health & Bus'],
                  ['library', 'Library & Login'],
                  ['documents', 'Documents'],
                ].map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStudentModalTab(tab)}
                    className={`px-3 py-1.5 text-xs font-bold whitespace-nowrap rounded-xl transition ${studentModalTab === tab ? 'bg-[#7a4e2d] text-[#f7efe4]' : 'text-[#8a6a50] hover:bg-[#f4ecdf]'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleStudentSubmit} className="space-y-6">
                
                {/* TAB 1: BASIC INFORMATION */}
                {studentModalTab === 'basic' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Full Display Name *</label>
                      <input type="text" required value={studentForm.name} onChange={(e) => setStudentForm({...studentForm, name: e.target.value, fullName: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Admission Number</label>
                      <input type="text" value={studentForm.admissionNumber || ''} onChange={(e) => setStudentForm({...studentForm, admissionNumber: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Roll Number</label>
                      <input type="text" value={studentForm.rollNumber} onChange={(e) => setStudentForm({...studentForm, rollNumber: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">First Name</label>
                      <input type="text" value={studentForm.firstName || ''} onChange={(e) => setStudentForm({...studentForm, firstName: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Middle Name</label>
                      <input type="text" value={studentForm.middleName || ''} onChange={(e) => setStudentForm({...studentForm, middleName: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Last Name</label>
                      <input type="text" value={studentForm.lastName || ''} onChange={(e) => setStudentForm({...studentForm, lastName: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Gender</label>
                      <select value={studentForm.gender} onChange={(e) => setStudentForm({...studentForm, gender: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none">
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Date of Birth</label>
                      <input type="date" value={studentForm.dateOfBirth || ''} onChange={(e) => setStudentForm({...studentForm, dateOfBirth: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Blood Group</label>
                      <input type="text" value={studentForm.bloodGroup || ''} onChange={(e) => setStudentForm({...studentForm, bloodGroup: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" placeholder="e.g. O+" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Aadhaar Number (Optional)</label>
                      <input type="text" value={studentForm.aadhaarNumber || ''} onChange={(e) => setStudentForm({...studentForm, aadhaarNumber: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Nationality</label>
                      <input type="text" value={studentForm.nationality || ''} onChange={(e) => setStudentForm({...studentForm, nationality: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Religion (Optional)</label>
                      <input type="text" value={studentForm.religion || ''} onChange={(e) => setStudentForm({...studentForm, religion: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Caste/Category (Optional)</label>
                      <input type="text" value={studentForm.casteCategory || ''} onChange={(e) => setStudentForm({...studentForm, casteCategory: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Student Photo (PDF / Image)</label>
                      <input 
                        type="file" 
                        onChange={(e) => handleFileUpload(e, 'photo', 'student')} 
                        className="w-full text-xs text-[#6d4c35] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#7a4e2d] file:text-[#f7efe4] hover:file:bg-[#624021]" 
                      />
                      {uploadingField === 'photo' && <p className="text-xs text-amber-600 mt-1">Uploading...</p>}
                      {studentForm.photo && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ Photo uploaded: <a href={studentForm.photo} target="_blank" rel="noopener noreferrer" className="underline font-semibold">View photo</a>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: CONTACT INFORMATION */}
                {studentModalTab === 'contact' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Mobile Number</label>
                      <input type="tel" value={studentForm.mobileNumber || ''} onChange={(e) => setStudentForm({...studentForm, mobileNumber: e.target.value, phone: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Alternate Mobile Number</label>
                      <input type="tel" value={studentForm.alternateMobileNumber || ''} onChange={(e) => setStudentForm({...studentForm, alternateMobileNumber: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Email Address</label>
                      <input type="email" value={studentForm.emailAddress || ''} onChange={(e) => setStudentForm({...studentForm, emailAddress: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">City</label>
                      <input type="text" value={studentForm.city || ''} onChange={(e) => setStudentForm({...studentForm, city: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">State</label>
                      <input type="text" value={studentForm.state || ''} onChange={(e) => setStudentForm({...studentForm, state: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Country</label>
                      <input type="text" value={studentForm.country || ''} onChange={(e) => setStudentForm({...studentForm, country: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">PIN Code</label>
                      <input type="text" value={studentForm.pinCode || ''} onChange={(e) => setStudentForm({...studentForm, pinCode: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Current Address</label>
                      <textarea value={studentForm.currentAddress || ''} onChange={(e) => setStudentForm({...studentForm, currentAddress: e.target.value})} rows={2} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Permanent Address</label>
                      <textarea value={studentForm.permanentAddress || ''} onChange={(e) => setStudentForm({...studentForm, permanentAddress: e.target.value})} rows={2} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                  </div>
                )}

                {/* TAB 3: PARENT/GUARDIAN DETAILS */}
                {studentModalTab === 'parent' && (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 border-b border-[#d9c5b0]/50 pb-4">
                      <h4 className="col-span-2 font-bold text-[#7a4e2d] text-sm">Father Details</h4>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Father Name</label>
                        <input type="text" value={studentForm.fatherName || ''} onChange={(e) => setStudentForm({...studentForm, fatherName: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Occupation</label>
                        <input type="text" value={studentForm.fatherOccupation || ''} onChange={(e) => setStudentForm({...studentForm, fatherOccupation: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Mobile Number</label>
                        <input type="tel" value={studentForm.fatherMobileNumber || ''} onChange={(e) => setStudentForm({...studentForm, fatherMobileNumber: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Email</label>
                        <input type="email" value={studentForm.fatherEmail || ''} onChange={(e) => setStudentForm({...studentForm, fatherEmail: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 border-b border-[#d9c5b0]/50 pb-4">
                      <h4 className="col-span-2 font-bold text-[#7a4e2d] text-sm">Mother Details</h4>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Mother Name</label>
                        <input type="text" value={studentForm.motherName || ''} onChange={(e) => setStudentForm({...studentForm, motherName: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Occupation</label>
                        <input type="text" value={studentForm.motherOccupation || ''} onChange={(e) => setStudentForm({...studentForm, motherOccupation: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Mobile Number</label>
                        <input type="tel" value={studentForm.motherMobileNumber || ''} onChange={(e) => setStudentForm({...studentForm, motherMobileNumber: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Email</label>
                        <input type="email" value={studentForm.motherEmail || ''} onChange={(e) => setStudentForm({...studentForm, motherEmail: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <h4 className="col-span-2 font-bold text-[#7a4e2d] text-sm">Guardian Details (If different)</h4>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Guardian Name</label>
                        <input type="text" value={studentForm.guardianName || ''} onChange={(e) => setStudentForm({...studentForm, guardianName: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Relationship</label>
                        <input type="text" value={studentForm.guardianRelationship || ''} onChange={(e) => setStudentForm({...studentForm, guardianRelationship: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Mobile Number</label>
                        <input type="tel" value={studentForm.guardianMobileNumber || ''} onChange={(e) => setStudentForm({...studentForm, guardianMobileNumber: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Address</label>
                        <input type="text" value={studentForm.guardianAddress || ''} onChange={(e) => setStudentForm({...studentForm, guardianAddress: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: ACADEMIC INFORMATION */}
                {studentModalTab === 'academic' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Grade / Class *</label>
                      <select
                        required
                        value={studentForm.classStandard || ''}
                        onChange={(e) => setStudentForm({ ...studentForm, classStandard: e.target.value, classDivision: '' })}
                        className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none focus:bg-white"
                      >
                        <option value="">-- Select Grade --</option>
                        {[...new Set(classes.map(c => c.standard))].sort(sortStandards).map(std => (
                          <option key={std} value={std}>{std}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Section *</label>
                      <select
                        required
                        disabled={!studentForm.classStandard}
                        value={studentForm.classDivision || ''}
                        onChange={(e) => setStudentForm({ ...studentForm, classDivision: e.target.value })}
                        className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none focus:bg-white disabled:opacity-50"
                      >
                        <option value="">-- Select Section --</option>
                        {studentForm.classStandard && classes
                          .filter(c => c.standard === studentForm.classStandard)
                          .map(c => c.division)
                          .sort()
                          .map(div => (
                            <option key={div} value={div}>{div}</option>
                          ))
                        }
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">House (e.g. Red / Blue)</label>
                      <input type="text" value={studentForm.house || ''} onChange={(e) => setStudentForm({...studentForm, house: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Academic Year</label>
                      <input type="text" value={studentForm.academicYear || ''} onChange={(e) => setStudentForm({...studentForm, academicYear: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" placeholder="e.g. 2026-2027" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Admission Date</label>
                      <input type="date" value={studentForm.admissionDate || ''} onChange={(e) => setStudentForm({...studentForm, admissionDate: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Previous School (Type prev name or Fresh)</label>
                      <input type="text" value={studentForm.previousSchool || ''} onChange={(e) => setStudentForm({...studentForm, previousSchool: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Student Status</label>
                      <select value={studentForm.studentStatus} onChange={(e) => setStudentForm({...studentForm, studentStatus: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none">
                        <option>Active</option>
                        <option>Graduated</option>
                        <option>Transferred</option>
                        <option>Suspended</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6d4c35] mb-1">Medium</label>
                      <input type="text" value={studentForm.medium || ''} onChange={(e) => setStudentForm({...studentForm, medium: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-[#6d4c35] mb-2">Subjects Enrolled</label>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 border border-[#d9c5b0] bg-[#faf4ea] rounded-xl">
                        {subjects.length > 0 ? (
                          subjects
                            .filter(sub => !sub.standard || sub.standard === 'All' || !studentForm.classStandard || sub.standard.toLowerCase() === studentForm.classStandard.toLowerCase())
                            .map(sub => (
                            <label key={sub._id} className="flex items-center gap-2 text-xs text-[#6d4c35] cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={studentForm.subjectsEnrolled.includes(sub._id)} 
                                onChange={(e) => {
                                  const val = sub._id;
                                  const current = studentForm.subjectsEnrolled;
                                  const nextVal = e.target.checked 
                                    ? [...current, val]
                                    : current.filter(x => x !== val);
                                  setStudentForm({...studentForm, subjectsEnrolled: nextVal});
                                }}
                                className="rounded border-[#d9c5b0]"
                              />
                              {sub.name} ({sub.code})
                            </label>
                          ))
                        ) : (
                          <p className="text-xs text-[#8a6a50] italic col-span-2">No subjects configured. Add subjects first.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: HEALTH & BUS INFORMATION */}
                {studentModalTab === 'health' && (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 border-b border-[#d9c5b0]/50 pb-4">
                      <h4 className="col-span-2 font-bold text-[#7a4e2d] text-sm">Health Information</h4>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Allergies</label>
                        <input type="text" value={studentForm.allergies || ''} onChange={(e) => setStudentForm({...studentForm, allergies: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Medical Conditions</label>
                        <input type="text" value={studentForm.medicalConditions || ''} onChange={(e) => setStudentForm({...studentForm, medicalConditions: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Disability</label>
                        <input type="text" value={studentForm.disability || ''} onChange={(e) => setStudentForm({...studentForm, disability: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Doctor Name</label>
                        <input type="text" value={studentForm.doctorName || ''} onChange={(e) => setStudentForm({...studentForm, doctorName: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Medical Notes</label>
                        <input type="text" value={studentForm.medicalNotes || ''} onChange={(e) => setStudentForm({...studentForm, medicalNotes: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                      <div className="col-span-2 grid gap-3 sm:grid-cols-3 bg-[#faf4ea]/50 p-3 rounded-xl border border-[#d9c5b0]/60">
                        <h5 className="col-span-3 text-xs font-bold text-[#7a4e2d]">Emergency Contact Details</h5>
                        <div>
                          <label className="block text-xs text-[#6d4c35] mb-1">Contact Name</label>
                          <input type="text" value={studentForm.emergencyContactName || ''} onChange={(e) => setStudentForm({...studentForm, emergencyContactName: e.target.value})} className="w-full rounded-lg border border-[#d9c5b0] bg-[#faf4ea] px-2 py-1 text-xs outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs text-[#6d4c35] mb-1">Relationship</label>
                          <input type="text" value={studentForm.emergencyContactRelationship || ''} onChange={(e) => setStudentForm({...studentForm, emergencyContactRelationship: e.target.value})} className="w-full rounded-lg border border-[#d9c5b0] bg-[#faf4ea] px-2 py-1 text-xs outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs text-[#6d4c35] mb-1">Mobile Number</label>
                          <input type="tel" value={studentForm.emergencyContactMobileNumber || ''} onChange={(e) => setStudentForm({...studentForm, emergencyContactMobileNumber: e.target.value})} className="w-full rounded-lg border border-[#d9c5b0] bg-[#faf4ea] px-2 py-1 text-xs outline-none" />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <h4 className="col-span-2 font-bold text-[#7a4e2d] text-sm">Transport / School Bus</h4>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Uses School Bus?</label>
                        <select value={studentForm.usesSchoolBus} onChange={(e) => setStudentForm({...studentForm, usesSchoolBus: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none">
                          <option>No</option>
                          <option>Yes</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Bus Route</label>
                        <input type="text" disabled={studentForm.usesSchoolBus==='No'} value={studentForm.busRoute || ''} onChange={(e) => setStudentForm({...studentForm, busRoute: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Bus Stop</label>
                        <input type="text" disabled={studentForm.usesSchoolBus==='No'} value={studentForm.busStop || ''} onChange={(e) => setStudentForm({...studentForm, busStop: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Bus Number</label>
                        <input type="text" disabled={studentForm.usesSchoolBus==='No'} value={studentForm.busNumber || ''} onChange={(e) => setStudentForm({...studentForm, busNumber: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Driver Name</label>
                        <input type="text" disabled={studentForm.usesSchoolBus==='No'} value={studentForm.driverName || ''} onChange={(e) => setStudentForm({...studentForm, driverName: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Driver Contact</label>
                        <input type="tel" disabled={studentForm.usesSchoolBus==='No'} value={studentForm.driverContact || ''} onChange={(e) => setStudentForm({...studentForm, driverContact: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none disabled:opacity-50" />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 6: LIBRARY & LOGIN DETAILS */}
                {studentModalTab === 'library' && (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 border-b border-[#d9c5b0]/50 pb-4">
                      <h4 className="col-span-2 font-bold text-[#7a4e2d] text-sm">Library Information</h4>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Library Card Number</label>
                        <input type="text" value={studentForm.libraryCardNumber || ''} onChange={(e) => setStudentForm({...studentForm, libraryCardNumber: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Books Issued</label>
                        <input type="number" value={studentForm.booksIssued || 0} onChange={(e) => setStudentForm({...studentForm, booksIssued: Number(e.target.value)})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Issue Date</label>
                        <input type="date" value={studentForm.issueDate || ''} onChange={(e) => setStudentForm({...studentForm, issueDate: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Return Date</label>
                        <input type="date" value={studentForm.returnDate || ''} onChange={(e) => setStudentForm({...studentForm, returnDate: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Fine Outstanding</label>
                        <input type="number" value={studentForm.fine || 0} onChange={(e) => setStudentForm({...studentForm, fine: Number(e.target.value)})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Book Status</label>
                        <input type="text" value={studentForm.bookStatus || ''} onChange={(e) => setStudentForm({...studentForm, bookStatus: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" placeholder="e.g. Issued / Returned" />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <h4 className="col-span-2 font-bold text-[#7a4e2d] text-sm">Login & Account Details</h4>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Login Email / Username *</label>
                        <input type="email" required value={studentForm.email} onChange={(e) => setStudentForm({...studentForm, email: e.target.value, username: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Login Password *</label>
                        <input type="password" required={!editingStudentId} placeholder={editingStudentId ? "Leave blank to keep current" : "At least 6 characters"} value={studentForm.password} onChange={(e) => setStudentForm({...studentForm, password: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none" />
                        <div className="mt-1.5 space-y-1 text-[10px]">
                          <p className="font-semibold text-[#6d4c35]">Password requirements:</p>
                          <div className="grid grid-cols-2 gap-1 mt-0.5">
                            <div className="flex items-center gap-1">
                              <span className={`inline-block h-1.5 w-1.5 rounded-full ${(studentForm.password || '').length >= 6 ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className={(studentForm.password || '').length >= 6 ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>Min 6 characters</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`inline-block h-1.5 w-1.5 rounded-full ${/[A-Z]/.test(studentForm.password || '') ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className={/[A-Z]/.test(studentForm.password || '') ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>1 capital letter</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`inline-block h-1.5 w-1.5 rounded-full ${/[0-9]/.test(studentForm.password || '') ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className={/[0-9]/.test(studentForm.password || '') ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>1 number</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`inline-block h-1.5 w-1.5 rounded-full ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(studentForm.password || '') ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(studentForm.password || '') ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>1 special character</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">Account Status</label>
                        <select value={studentForm.accountStatus} onChange={(e) => setStudentForm({...studentForm, accountStatus: e.target.value})} className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-3 py-2 text-sm outline-none">
                          <option>Active</option>
                          <option>Suspended</option>
                          <option>Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 7: DOCUMENTS UPLOAD */}
                {studentModalTab === 'documents' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      ['docBirthCertificate', 'Birth Certificate'],
                      ['docAadhaarCard', 'Aadhaar Card'],
                      ['docPreviousMarksheet', 'Previous Marksheet'],
                      ['docTransferCertificate', 'Transfer Certificate'],
                      ['docLeavingCertificate', 'Leaving Certificate (Optional)'],
                      ['docPassportPhoto', 'Passport Photo'],
                      ['docParentIdProof', 'Parent ID Proof'],
                      ['docAddressProof', 'Address Proof'],
                      ['docIncomeCertificate', 'Income Certificate (Optional)'],
                      ['docCasteCertificate', 'Caste Certificate (Optional)'],
                    ].map(([fieldName, label]) => (
                      <div key={fieldName} className="p-3 border border-[#d9c5b0]/60 rounded-xl bg-[#faf4ea]/40">
                        <label className="block text-xs font-bold text-[#6d4c35] mb-1">{label}</label>
                        <input 
                          type="file" 
                          onChange={(e) => handleFileUpload(e, fieldName, 'student')} 
                          className="w-full text-xs text-[#6d4c35] file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#7a4e2d] file:text-[#f7efe4] hover:file:bg-[#624021] cursor-pointer" 
                        />
                        {uploadingField === fieldName && <p className="text-xs text-amber-600 mt-1">Uploading...</p>}
                        {studentForm[fieldName] && (
                          <p className="text-xs text-green-600 mt-1 font-medium">
                            ✓ Document saved! <a href={studentForm[fieldName]} target="_blank" rel="noopener noreferrer" className="underline font-bold">View Document</a>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-2 border-t border-[#d9c5b0] pt-4">
                  <button type="button" onClick={() => setShowAddStudentModal(false)} className="rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-4 py-2 text-sm font-semibold text-[#8a6a50] hover:bg-[#f4ecdf] transition">
                    Cancel
                  </button>
                  <button type="submit" className="rounded-xl bg-[#7a4e2d] px-4 py-2 text-sm font-semibold text-[#f7efe4] hover:bg-[#624021] transition">
                    {editingStudentId ? 'Update Student' : 'Save Student'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- VIEW STUDENT DETAILS MODAL --- */}
        {showStudentDetailsModal && selectedStudentForDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-4xl bg-[#fffaf3] rounded-[2rem] border border-[#d9c5b0] p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-[#d9c5b0] pb-4">
                <div className="flex items-center gap-4">
                  {selectedStudentForDetails.photo ? (
                    <img src={selectedStudentForDetails.photo} alt={selectedStudentForDetails.name} className="h-14 w-14 rounded-2xl object-cover border border-[#d9c5b0]" />
                  ) : (
                    <div className="h-14 w-14 rounded-2xl bg-[#7a4e2d]/10 text-[#7a4e2d] flex items-center justify-center font-bold text-xl">
                      {selectedStudentForDetails.name?.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-black text-[#3f2a1d]">{selectedStudentForDetails.name}</h2>
                    <p className="text-sm text-[#7f634e]">Student ID: <span className="font-semibold">{selectedStudentForDetails.studentId || 'N/A'}</span> | Grade: <span className="font-semibold">{selectedStudentForDetails.classId?.standard || 'N/A'} | Section {selectedStudentForDetails.division || 'N/A'}</span></p>
                  </div>
                </div>
                <button onClick={() => { setShowStudentDetailsModal(false); setSelectedStudentForDetails(null); }} className="p-2 text-[#8a6a50] hover:bg-[#f4ecdf] rounded-full transition">
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-[#d9c5b0] gap-4 pb-2">
                {[
                  ['info', 'Basic Info & Parent Details'],
                  ['attendance', 'Attendance & Overrides'],
                  ['fees', 'Fees Installments & Pending Balance'],
                  ['marks', 'Exam Scores & Report Card']
                ].map(([tabId, label]) => (
                  <button
                    key={tabId}
                    onClick={() => {
                      setAdminStudentModalTab(tabId);
                      setShowAddAttendanceOverride(false);
                    }}
                    className={`px-4 py-2 text-xs font-black tracking-wide transition-all border-b-2 ${
                      adminStudentModalTab === tabId
                        ? 'text-[#7a4e2d] border-[#7a4e2d]'
                        : 'text-[#8a6a50] border-transparent hover:text-[#7a4e2d]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {adminLoadingDetails ? (
                <div className="text-center py-20">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-[#7a4e2d]"></div>
                  <p className="text-xs text-[#8a6a50] mt-2">Loading details...</p>
                </div>
              ) : (
                <>
                  {/* TAB 1: BASIC INFORMATION */}
                  {adminStudentModalTab === 'info' && (
                    <div className="grid gap-6 md:grid-cols-2 text-[#6d4c35]">
                      {/* Basic Info */}
                      <div className="p-5 bg-[#faf4ea]/50 border border-[#d9c5b0] rounded-2xl space-y-3">
                        <h3 className="font-bold text-[#7a4e2d] border-b border-[#d9c5b0]/50 pb-1">Basic Student Information</h3>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                          <p className="font-bold">Admission Number:</p><p>{selectedStudentForDetails.admissionNumber || 'N/A'}</p>
                          <p className="font-bold">Roll Number:</p><p>{selectedStudentForDetails.rollNumber || 'N/A'}</p>
                          <p className="font-bold">First Name:</p><p>{selectedStudentForDetails.firstName || 'N/A'}</p>
                          <p className="font-bold">Middle Name:</p><p>{selectedStudentForDetails.middleName || 'N/A'}</p>
                          <p className="font-bold">Last Name:</p><p>{selectedStudentForDetails.lastName || 'N/A'}</p>
                          <p className="font-bold">Gender:</p><p>{selectedStudentForDetails.gender || 'N/A'}</p>
                          <p className="font-bold">Date of Birth:</p><p>{selectedStudentForDetails.dateOfBirth ? new Date(selectedStudentForDetails.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
                          <p className="font-bold">Blood Group:</p><p>{selectedStudentForDetails.bloodGroup || 'N/A'}</p>
                          <p className="font-bold">Aadhaar Number:</p><p>{selectedStudentForDetails.aadhaarNumber || 'N/A'}</p>
                          <p className="font-bold">Nationality:</p><p>{selectedStudentForDetails.nationality || 'Indian'}</p>
                          <p className="font-bold">Religion:</p><p>{selectedStudentForDetails.religion || 'N/A'}</p>
                          <p className="font-bold">Caste/Category:</p><p>{selectedStudentForDetails.casteCategory || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="p-5 bg-[#faf4ea]/50 border border-[#d9c5b0] rounded-2xl space-y-3">
                        <h3 className="font-bold text-[#7a4e2d] border-b border-[#d9c5b0]/50 pb-1">Contact Information</h3>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                          <p className="font-bold">Mobile Number:</p><p>{selectedStudentForDetails.mobileNumber || 'N/A'}</p>
                          <p className="font-bold">Alternate Mobile:</p><p>{selectedStudentForDetails.alternateMobileNumber || 'N/A'}</p>
                          <p className="font-bold">Email Address:</p><p>{selectedStudentForDetails.emailAddress || selectedStudentForDetails.email || 'N/A'}</p>
                          <p className="font-bold">City:</p><p>{selectedStudentForDetails.city || 'N/A'}</p>
                          <p className="font-bold">State:</p><p>{selectedStudentForDetails.state || 'N/A'}</p>
                          <p className="font-bold">Country:</p><p>{selectedStudentForDetails.country || 'India'}</p>
                          <p className="font-bold">PIN Code:</p><p>{selectedStudentForDetails.pinCode || 'N/A'}</p>
                          <p className="col-span-2 font-bold mt-1">Current Address:</p>
                          <p className="col-span-2 bg-[#fffaf3] p-2 rounded-lg border border-[#d9c5b0]/40">{selectedStudentForDetails.currentAddress || 'N/A'}</p>
                          <p className="col-span-2 font-bold mt-1">Permanent Address:</p>
                          <p className="col-span-2 bg-[#fffaf3] p-2 rounded-lg border border-[#d9c5b0]/40">{selectedStudentForDetails.permanentAddress || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Academic & Transport Details */}
                      <div className="p-5 bg-[#faf4ea]/50 border border-[#d9c5b0] rounded-2xl space-y-3">
                        <h3 className="font-bold text-[#7a4e2d] border-b border-[#d9c5b0]/50 pb-1">Academic & Transport</h3>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                          <p className="font-bold">House Color:</p><p>{selectedStudentForDetails.house || 'N/A'}</p>
                          <p className="font-bold">Academic Year:</p><p>{selectedStudentForDetails.academicYear || 'N/A'}</p>
                          <p className="font-bold">Admission Date:</p><p>{selectedStudentForDetails.admissionDate ? new Date(selectedStudentForDetails.admissionDate).toLocaleDateString() : 'N/A'}</p>
                          <p className="font-bold">Previous School:</p><p>{selectedStudentForDetails.previousSchool || 'Fresh'}</p>
                          <p className="font-bold">Status:</p><p>{selectedStudentForDetails.studentStatus || 'Active'}</p>
                          <p className="font-bold">Medium:</p><p>{selectedStudentForDetails.medium || 'English'}</p>
                          <p className="font-bold">Uses School Bus:</p><p>{selectedStudentForDetails.usesSchoolBus || 'No'}</p>
                          {selectedStudentForDetails.usesSchoolBus === 'Yes' && (
                            <>
                              <p className="font-bold">Bus Route / Stop:</p><p>{selectedStudentForDetails.busRoute || 'N/A'} / {selectedStudentForDetails.busStop || 'N/A'}</p>
                              <p className="font-bold">Bus No / Driver:</p><p>{selectedStudentForDetails.busNumber || 'N/A'} ({selectedStudentForDetails.driverName || 'N/A'})</p>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Parent Details */}
                      <div className="p-5 bg-[#faf4ea]/50 border border-[#d9c5b0] rounded-2xl space-y-3">
                        <h3 className="font-bold text-[#7a4e2d] border-b border-[#d9c5b0]/50 pb-1">Parent & Guardian Details</h3>
                        <div className="space-y-2 text-xs">
                          <div>
                            <p className="font-bold text-[#7a4e2d]/90">Father:</p>
                            <p className="pl-2">{selectedStudentForDetails.father?.name || 'N/A'} ({selectedStudentForDetails.father?.occupation || 'N/A'}) | {selectedStudentForDetails.father?.mobileNumber || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="font-bold text-[#7a4e2d]/90">Mother:</p>
                            <p className="pl-2">{selectedStudentForDetails.mother?.name || 'N/A'} ({selectedStudentForDetails.mother?.occupation || 'N/A'}) | {selectedStudentForDetails.mother?.mobileNumber || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="font-bold text-[#7a4e2d]/90">Guardian:</p>
                            <p className="pl-2">{selectedStudentForDetails.guardian?.name || 'N/A'} ({selectedStudentForDetails.guardian?.relationship || 'N/A'}) | {selectedStudentForDetails.guardian?.mobileNumber || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Library details */}
                      <div className="p-5 bg-[#faf4ea]/50 border border-[#d9c5b0] rounded-2xl space-y-3">
                        <h3 className="font-bold text-[#7a4e2d] border-b border-[#d9c5b0]/50 pb-1">Library Information</h3>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                          <p className="font-bold">Library Card Number:</p><p>{selectedStudentForDetails.libraryCardNumber || 'N/A'}</p>
                          <p className="font-bold">Books Issued:</p><p>{selectedStudentForDetails.booksIssued || 0}</p>
                          <p className="font-bold">Issue / Return Date:</p><p>{selectedStudentForDetails.issueDate ? new Date(selectedStudentForDetails.issueDate).toLocaleDateString() : 'N/A'} / {selectedStudentForDetails.returnDate ? new Date(selectedStudentForDetails.returnDate).toLocaleDateString() : 'N/A'}</p>
                          <p className="font-bold">Fine Outstanding:</p><p>${selectedStudentForDetails.fine || 0}</p>
                          <p className="font-bold">Book Status:</p><p>{selectedStudentForDetails.bookStatus || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Documents list */}
                      <div className="p-5 bg-[#faf4ea]/50 border border-[#d9c5b0] rounded-2xl space-y-3 md:col-span-2">
                        <h3 className="font-bold text-[#7a4e2d] border-b border-[#d9c5b0]/50 pb-1">Uploaded Documents</h3>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-xs">
                          {selectedStudentForDetails.documents ? (
                            Object.entries(selectedStudentForDetails.documents).map(([key, value]) => {
                              const niceLabel = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                              return (
                                <div key={key} className="p-2 border border-[#d9c5b0]/40 rounded-lg bg-[#fffaf3]">
                                  <p className="font-bold text-[#7a4e2d]">{niceLabel}</p>
                                  {value ? (
                                    <a href={value} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 font-bold text-green-700 underline hover:text-green-800">
                                      Download File
                                    </a>
                                  ) : (
                                    <p className="text-gray-400 mt-1">Not Uploaded</p>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="italic text-gray-400">No documents uploaded.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: ATTENDANCE LOG & OVERRIDES */}
                  {adminStudentModalTab === 'attendance' && (
                    <div className="space-y-6 text-[#6d4c35]">
                      {/* Date Filter & Add Action Header */}
                      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#faf4ea]/50 border border-[#d9c5b0] p-4 rounded-2xl">
                        <div className="flex gap-2 items-center flex-wrap">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-[#8a6a50] mb-0.5">Start Date</label>
                            <input
                              type="date"
                              value={adminFilterStartDate}
                              onChange={(e) => setAdminFilterStartDate(e.target.value)}
                              className="rounded-xl border border-[#d9c5b0] bg-white px-3 py-1.5 text-xs outline-none font-bold text-[#7a4e2d]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-[#8a6a50] mb-0.5">End Date</label>
                            <input
                              type="date"
                              value={adminFilterEndDate}
                              onChange={(e) => setAdminFilterEndDate(e.target.value)}
                              className="rounded-xl border border-[#d9c5b0] bg-white px-3 py-1.5 text-xs outline-none font-bold text-[#7a4e2d]"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setAdminNewAtt({
                              date: new Date().toISOString().split('T')[0],
                              status: 'Present',
                              subjectId: subjects[0]?._id || '',
                              remarks: ''
                            });
                            setShowAddAttendanceOverride(!showAddAttendanceOverride);
                          }}
                          className="px-4 py-2 bg-[#7a4e2d] text-white hover:bg-[#624021] text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                        >
                          {showAddAttendanceOverride ? 'Close Form' : '⚡ Add Attendance Override'}
                        </button>
                      </div>

                      {/* Quick Attendance Override Form */}
                      {showAddAttendanceOverride && (
                        <form onSubmit={handleAdminCreateAttendance} className="p-5 bg-white border border-[#d9c5b0] rounded-2xl grid gap-4 sm:grid-cols-2 md:grid-cols-4 items-end">
                          <div>
                            <label className="block text-xs font-bold text-[#6d4c35] mb-1">Select Date *</label>
                            <input
                              type="date"
                              required
                              value={adminNewAtt.date}
                              onChange={(e) => setAdminNewAtt(prev => ({ ...prev, date: e.target.value }))}
                              className="w-full rounded-xl border border-[#d9c5b0] bg-[#fffaf3] px-3 py-2 text-xs outline-none font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#6d4c35] mb-1">Subject (None = General)</label>
                            <select
                              value={adminNewAtt.subjectId}
                              onChange={(e) => setAdminNewAtt(prev => ({ ...prev, subjectId: e.target.value }))}
                              className="w-full rounded-xl border border-[#d9c5b0] bg-[#fffaf3] px-3 py-2 text-xs outline-none font-bold text-[#7a4e2d]"
                            >
                              <option value="">General (No Subject)</option>
                              {subjects.map(s => (
                                <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#6d4c35] mb-1">Status *</label>
                            <select
                              required
                              value={adminNewAtt.status}
                              onChange={(e) => setAdminNewAtt(prev => ({ ...prev, status: e.target.value }))}
                              className="w-full rounded-xl border border-[#d9c5b0] bg-[#fffaf3] px-3 py-2 text-xs outline-none font-bold text-[#7a4e2d]"
                            >
                              <option value="Present">Present</option>
                              <option value="Absent">Absent</option>
                              <option value="Leave">Leave</option>
                              <option value="Late">Late</option>
                            </select>
                          </div>
                          <div>
                            <button
                              type="submit"
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black tracking-wider rounded-xl transition shadow-xs"
                            >
                              Save Override
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Daily List */}
                      <div className="overflow-x-auto rounded-2xl border border-[#d9c5b0]">
                        <table className="w-full text-left border-collapse bg-white">
                          <thead>
                            <tr className="bg-[#f4ecdf] text-xs font-bold text-[#6d4c35] uppercase">
                              <th className="p-3">Date</th>
                              <th className="p-3">Subject / Period</th>
                              <th className="p-3">Marked By</th>
                              <th className="p-3 text-center">Status override</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#f4ecdf] text-xs text-[#6d4c35]">
                            {adminStudentProfile?.attendance?.records?.length > 0 ? (
                              adminStudentProfile.attendance.records.map((rec) => {
                                const isPresent = rec.status === 'Present';
                                return (
                                  <tr key={rec._id} className="hover:bg-[#fffaf3]/50">
                                    <td className="p-3 font-semibold">
                                      {new Date(rec.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="p-3">
                                      <div className="font-bold text-[#3f2a1d]">
                                        {rec.subjectId?.name || 'General (Class-level)'}
                                      </div>
                                      {rec.periodStartTime && (
                                        <div className="text-[10px] text-[#8a6a50]">
                                          ⏰ {rec.periodStartTime} - {rec.periodEndTime}
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-3">
                                      <span className="capitalize">{rec.markedByModel || 'System'}</span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <div className="inline-flex gap-1 bg-[#faf4ea] p-1 rounded-xl border border-[#d9c5b0]/60">
                                        <button
                                          type="button"
                                          onClick={() => handleAdminUpdateAttendance(rec._id, 'Present')}
                                          className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition ${
                                            isPresent
                                              ? 'bg-emerald-600 text-white shadow-xs'
                                              : 'text-[#8a6a50] hover:bg-[#f4ecdf]'
                                          }`}
                                        >
                                          Present
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleAdminUpdateAttendance(rec._id, 'Absent')}
                                          className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition ${
                                            rec.status === 'Absent'
                                              ? 'bg-rose-600 text-white shadow-xs'
                                              : 'text-[#8a6a50] hover:bg-[#f4ecdf]'
                                          }`}
                                        >
                                          Absent
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan="4" className="p-6 text-center italic text-[#8a6a50]">
                                  No attendance logs found in the selected date range.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: PENDING FEES */}
                  {adminStudentModalTab === 'fees' && (() => {
                    const struct = adminStudentProfile?.fees?.structure;
                    const feeRec = adminStudentProfile?.fees?.record;

                    if (!struct) {
                      return (
                        <p className="text-center py-10 text-[#8a6a50] italic border border-dashed border-[#d9c5b0] rounded-2xl">
                          No annual fees configured for Grade {selectedStudentForDetails.classId?.standard || 'N/A'} yet.
                        </p>
                      );
                    }

                    const totalAmount = struct.totalAmount || 0;
                    const installmentsCount = struct.totalInstallments || 4;
                    const costPerInstallment = Math.round(totalAmount / installmentsCount);

                    const paidInstallments = feeRec?.paidInstallments || [];
                    const paidCount = paidInstallments.length;
                    const totalPaid = paidCount * costPerInstallment;
                    const pendingAmount = Math.max(0, totalAmount - totalPaid);

                    return (
                      <div className="space-y-6 text-[#6d4c35]">
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="p-5 border border-[#d9c5b0] bg-white rounded-2xl space-y-1 text-center">
                            <p className="text-[10px] uppercase font-bold text-[#8a6a50]">Total Annual Fee</p>
                            <p className="text-2xl font-black text-[#7a4e2d]">${totalAmount}</p>
                            <p className="text-xs text-gray-400">Grade {struct.standard}</p>
                          </div>
                          <div className="p-5 border border-[#d9c5b0] bg-white rounded-2xl space-y-1 text-center">
                            <p className="text-[10px] uppercase font-bold text-[#8a6a50]">Total Paid</p>
                            <p className="text-2xl font-black text-emerald-700">${totalPaid}</p>
                            <p className="text-xs text-gray-400">{paidCount} of {installmentsCount} installments</p>
                          </div>
                          <div className="p-5 border border-[#d9c5b0] bg-white rounded-2xl space-y-1 text-center">
                            <p className="text-[10px] uppercase font-bold text-[#8a6a50]">Pending Balance</p>
                            <p className="text-2xl font-black text-rose-700">${pendingAmount}</p>
                            <p className="text-xs text-gray-400">{installmentsCount - paidCount} installments pending</p>
                          </div>
                        </div>

                        {/* Installment Cards */}
                        <div className="bg-white border border-[#d9c5b0] rounded-2xl p-5 space-y-4">
                          <h3 className="font-bold text-base text-[#3f2a1d]">Fee Installment Status Overview</h3>
                          <div className="grid gap-4 sm:grid-cols-4">
                            {Array.from({ length: installmentsCount }).map((_, idx) => {
                              const label = `Q${idx + 1}`;
                              const isPaid = paidInstallments.includes(label);

                              return (
                                <div key={label} className={`p-4 rounded-xl border text-center space-y-2 ${
                                  isPaid ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-200'
                                }`}>
                                  <span className="text-xs font-extrabold text-[#3f2a1d]">{label} Installment</span>
                                  <p className="font-black text-sm">${costPerInstallment}</p>
                                  <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                    isPaid ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                                  }`}>
                                    {isPaid ? 'Paid' : 'Pending'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* TAB 4: EXAM SCORES */}
                  {adminStudentModalTab === 'marks' && (
                    <div className="space-y-4 text-[#6d4c35]">
                      <div className="overflow-x-auto rounded-2xl border border-[#d9c5b0]">
                        <table className="w-full text-left border-collapse bg-white">
                          <thead>
                            <tr className="bg-[#f4ecdf] text-xs font-bold text-[#6d4c35] uppercase">
                              <th className="p-3">Exam / Assessment</th>
                              <th className="p-3">Subject</th>
                              <th className="p-3">Marks Obtained</th>
                              <th className="p-3 text-center">Passing Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#f4ecdf] text-xs text-[#6d4c35]">
                            {adminStudentProfile?.marks?.length > 0 ? (
                              adminStudentProfile.marks.map((record) => {
                                const isPass = record.passStatus === 'Pass';
                                return (
                                  <tr key={record._id} className="hover:bg-[#fffaf3]/50">
                                    <td className="p-3">
                                      <div className="font-bold text-[#3f2a1d]">
                                        {record.examId?.name || 'Assessment'}
                                      </div>
                                      <div className="text-[10px] text-[#8a6a50]">
                                        {record.examId?.date ? new Date(record.examId.date).toLocaleDateString() : 'N/A'}
                                      </div>
                                    </td>
                                    <td className="p-3 font-semibold">
                                      {record.subjectId?.name || 'N/A'}
                                    </td>
                                    <td className="p-3 font-black text-[#7a4e2d] text-sm">
                                      {record.marks} <span className="text-[10px] font-bold text-[#8a6a50] font-normal">/ {record.outOfMarks || 100}</span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className={`inline-block px-2.5 py-0.5 rounded-full font-black uppercase text-[9px] ${
                                        isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                      }`}>
                                        {record.passStatus}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan="4" className="p-6 text-center italic text-[#8a6a50]">
                                  No exam marks recorded for this student yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end border-t border-[#d9c5b0] pt-4">
                <button onClick={() => { setShowStudentDetailsModal(false); setSelectedStudentForDetails(null); setAdminStudentProfile(null); }} className="rounded-xl bg-[#7a4e2d] px-6 py-2.5 text-sm font-bold text-[#f7efe4] hover:bg-[#624021] transition">
                  Close Window
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Class Setup Modal */}
        {showClassSetupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-[2rem] border border-[#d9c5b0] bg-[#fffaf3] p-6 text-[#3f2a1d] shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#d9c5b0]/50 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-[#7a4e2d]">School Class Setup</h2>
                  <p className="text-xs text-[#8a6a50]">Configure grades, pre-primary stages, and section counts.</p>
                </div>
                <button
                  onClick={() => setShowClassSetupModal(false)}
                  className="rounded-full p-1.5 hover:bg-[#7a4e2d]/10 text-[#7a4e2d] transition"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSaveClassSetup} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-[#6d4c35] mb-2">Total Numeric Grades</label>
                    <input
                      type="number"
                      min={0}
                      max={12}
                      value={totalNumericStandards}
                      onChange={(e) => setTotalNumericStandards(parseInt(e.target.value || 0, 10))}
                      className="w-full rounded-xl border border-[#d9c5b0] bg-[#faf4ea] px-4 py-2.5 text-sm outline-none focus:border-[#7a4e2d] focus:bg-white transition"
                    />
                    <p className="text-[10px] text-[#8a6a50] mt-1">E.g., 10 creates Grades 1 to 10 automatically.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#6d4c35] mb-2">Pre-Primary Checklist</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Playgroup', 'Nursery', 'Junior KG', 'Senior KG'].map((stage) => (
                        <label key={stage} className="flex items-center gap-2 cursor-pointer text-sm text-[#6d4c35] font-medium">
                          <input
                            type="checkbox"
                            checked={!!prePrimaryChecklist[stage]}
                            onChange={(e) => {
                              setPrePrimaryChecklist(prev => ({
                                ...prev,
                                [stage]: e.target.checked
                              }));
                            }}
                            className="h-4 w-4 rounded border-[#d9c5b0] text-[#7a4e2d] focus:ring-[#7a4e2d]"
                          />
                          {stage}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#d9c5b0]/50 pt-4">
                  <div className="flex justify-between items-center flex-wrap gap-2 mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-[#3f2a1d]">Section Configuration (Per Grade)</h4>
                      <p className="text-xs text-[#8a6a50]">Set the number of sections for each grade (e.g., 4 creates sections A-D).</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-[#d9c5b0]/50 p-2 rounded-xl">
                      <span className="text-xs font-bold text-[#6d4c35]">Apply to all:</span>
                      <input
                        type="number"
                        id="bulkDivisionsInput"
                        min={1}
                        max={10}
                        defaultValue={1}
                        className="w-12 text-center rounded-lg border border-[#d9c5b0] px-1 py-0.5 text-xs outline-none focus:border-[#7a4e2d]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = Math.max(1, parseInt(document.getElementById('bulkDivisionsInput')?.value || 1, 10));
                          const nextMap = {};
                          for (const std of getActiveStandards()) {
                            nextMap[std] = val;
                          }
                          setDivisionsCountMap(nextMap);
                          toast.success(`Applied ${val} sections to all active grades!`);
                        }}
                        className="bg-[#7a4e2d] hover:bg-[#624021] text-[#f7efe4] text-xs font-bold px-3 py-1 rounded-lg transition"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 max-h-48 overflow-y-auto p-3 bg-[#faf4ea] border border-[#d9c5b0]/50 rounded-2xl">
                    {getActiveStandards().map((std) => (
                      <div key={std} className="flex items-center justify-between p-3 rounded-xl border border-[#d9c5b0]/30 bg-white shadow-sm">
                        <span className="text-xs font-bold text-[#7a4e2d]">{std}</span>
                        <div className="flex items-center gap-1.5">
                          <label className="text-[9px] text-[#8a6a50] font-semibold uppercase">Sections:</label>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={divisionsCountMap[std] || 1}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value || 1, 10));
                              setDivisionsCountMap(prev => ({
                                ...prev,
                                [std]: val
                              }));
                            }}
                            className="w-12 text-center rounded-lg border border-[#d9c5b0] px-1 py-0.5 text-xs outline-none focus:border-[#7a4e2d]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>



                <div className="flex justify-end gap-3 border-t border-[#d9c5b0]/50 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowClassSetupModal(false)}
                    className="rounded-xl border border-[#d9c5b0] bg-white px-5 py-2.5 text-sm font-bold text-[#7a4e2d] hover:bg-[#7a4e2d]/10 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-[#7a4e2d] px-6 py-2.5 text-sm font-bold text-[#f7efe4] hover:bg-[#624021] transition disabled:opacity-50"
                  >
                    {loading ? 'Setting up...' : 'Save Configuration'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- ASSIGN SUBJECTS & STANDARDS MODAL --- */}
        {showAssignModal && assigningTeacher && (() => {
          const t = assigningTeacher;
          const uniqueStandards = [...new Set(classes.map(c => c.standard))].sort(sortStandards);

          const handleSaveAssignments = async () => {
            try {
              setSavingAssignments(true);
              const payload = {
                assignedSubjectStandards: Object.keys(tempAssignments).map(subId => ({
                  subjectId: subId,
                  standards: tempAssignments[subId]
                })).filter(ass => ass.standards && ass.standards.length > 0)
              };

              await apiClient.put(`/teachers/${t._id}`, payload);
              toast.success(`Assignments updated for ${t.name}!`);
              setShowAssignModal(false);
              setAssigningTeacher(null);
              fetchData();
            } catch (err) {
              toast.error(err.response?.data?.message || 'Failed to save assignments');
            } finally {
              setSavingAssignments(false);
            }
          };

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
              <div className="w-full max-w-3xl bg-[#fffaf3] rounded-[2rem] border border-[#d9c5b0] p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-[#d9c5b0] pb-4">
                  <div>
                      <h2 className="text-xl font-black text-[#3f2a1d]">📚 Assign Subjects & Grades</h2>
                    <p className="text-sm text-[#7f634e]">Assign subjects and classes for {t.name}. Sections will be auto-allocated.</p>
                  </div>
                  <button onClick={() => { setShowAssignModal(false); setAssigningTeacher(null); }} className="p-2 text-[#8a6a50] hover:bg-[#f4ecdf] rounded-full transition">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
                  {subjects.length === 0 ? (
                    <p className="text-sm text-[#8a6a50] italic text-center py-6">No subjects configured. Add subjects first.</p>
                  ) : (
                    subjects.map(sub => {
                      const isSubjectChecked = !!tempAssignments[sub._id];
                      const activeStds = tempAssignments[sub._id] || [];

                      const allowedStds = sub.standard && sub.standard !== 'All' && sub.standard !== 'all'
                        ? sub.standard.split(',').map(s => s.trim())
                        : null;
                      const subjectStandards = allowedStds 
                        ? uniqueStandards.filter(std => allowedStds.includes(std))
                        : uniqueStandards;

                      return (
                        <div key={sub._id} className={`p-4 rounded-2xl border transition ${isSubjectChecked ? 'border-[#7a4e2d] bg-[#7a4e2d]/5' : 'border-[#d9c5b0]/60 bg-white'}`}>
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id={`assign-sub-${sub._id}`}
                              checked={isSubjectChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTempAssignments({ ...tempAssignments, [sub._id]: [] });
                                } else {
                                  const updated = { ...tempAssignments };
                                  delete updated[sub._id];
                                  setTempAssignments(updated);
                                }
                              }}
                              className="h-4 w-4 accent-[#7a4e2d] cursor-pointer rounded border-[#d9c5b0]"
                            />
                            <label htmlFor={`assign-sub-${sub._id}`} className="font-bold text-[#3f2a1d] text-sm cursor-pointer">
                              {sub.name} <span className="text-xs font-normal text-[#8a6a50]">({sub.code})</span>
                            </label>
                          </div>

                          {isSubjectChecked && (
                            <div className="mt-3 pl-7 border-t border-[#d9c5b0]/30 pt-3 space-y-2">
                              <p className="text-[10px] font-bold text-[#8a6a50] uppercase tracking-wider">Select Grades</p>
                              <div className="flex flex-wrap gap-2">
                                {subjectStandards.map(std => {
                                  const isStdChecked = activeStds.includes(std);
                                  return (
                                    <label
                                      key={std}
                                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition select-none ${isStdChecked ? 'border-[#7a4e2d] bg-[#7a4e2d] text-white' : 'border-[#d9c5b0] bg-white text-[#6d4c35] hover:bg-[#faf4ea]'}`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isStdChecked}
                                        onChange={() => {
                                          if (isStdChecked) {
                                            setTempAssignments({
                                              ...tempAssignments,
                                              [sub._id]: activeStds.filter(s => s !== std)
                                            });
                                          } else {
                                            setTempAssignments({
                                              ...tempAssignments,
                                              [sub._id]: [...activeStds, std]
                                            });
                                          }
                                        }}
                                        className="hidden"
                                      />
                                      {std.match(/^\d+$/) ? `Grade ${std}` : std}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-end gap-2 border-t border-[#d9c5b0] pt-4">
                  <button
                    onClick={() => { setShowAssignModal(false); setAssigningTeacher(null); }}
                    className="rounded-xl border border-[#d9c5b0] bg-white px-4 py-2 text-xs font-semibold text-[#8a6a50]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAssignments}
                    disabled={savingAssignments}
                    className="rounded-xl bg-[#7a4e2d] px-4 py-2 text-xs font-semibold text-[#f7efe4] hover:bg-[#624021] transition shadow-sm disabled:opacity-50"
                  >
                    {savingAssignments ? 'Saving...' : 'Save Assignments'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;