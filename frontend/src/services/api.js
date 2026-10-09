import apiClient from '../utils/apiClient';

// Auth Services
export const authService = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
  logout: () => apiClient.post('/auth/logout'),
  refreshToken: (refreshToken) => apiClient.post('/auth/refresh-token', { refreshToken }),
  getProfile: () => apiClient.get('/auth/profile'),
  updateProfile: (data) => apiClient.put('/auth/profile', data),
  changePassword: (data) => apiClient.put('/auth/change-password', data),
};

// Student Services
export const studentService = {
  getAll: (params) => apiClient.get('/students', { params }),
  getById: (id) => apiClient.get(`/students/${id}`),
  create: (data) => apiClient.post('/students', data),
  update: (id, data) => apiClient.put(`/students/${id}`, data),
  delete: (id) => apiClient.delete(`/students/${id}`),
  promote: (id, data) => apiClient.post(`/students/${id}/promote`, data),
  getAttendance: (id, params) => apiClient.get(`/students/${id}/attendance`, { params }),
};

// Teacher Services
export const teacherService = {
  getAll: (params) => apiClient.get('/teachers', { params }),
  getById: (id) => apiClient.get(`/teachers/${id}`),
  create: (data) => apiClient.post('/teachers', data),
  update: (id, data) => apiClient.put(`/teachers/${id}`, data),
  delete: (id) => apiClient.delete(`/teachers/${id}`),
  assignSubject: (id, data) => apiClient.post(`/teachers/${id}/assign-subject`, data),
  assignClass: (id, data) => apiClient.post(`/teachers/${id}/assign-class`, data),
};

// Class Services
export const classService = {
  getAll: (params) => apiClient.get('/classes', { params }),
  getById: (id) => apiClient.get(`/classes/${id}`),
  create: (data) => apiClient.post('/classes', data),
  update: (id, data) => apiClient.put(`/classes/${id}`, data),
  delete: (id) => apiClient.delete(`/classes/${id}`),
  getStudents: (id) => apiClient.get(`/classes/${id}/students`),
};

// Subject Services
export const subjectService = {
  getAll: (params) => apiClient.get('/subjects', { params }),
  getById: (id) => apiClient.get(`/subjects/${id}`),
  create: (data) => apiClient.post('/subjects', data),
  update: (id, data) => apiClient.put(`/subjects/${id}`, data),
  delete: (id) => apiClient.delete(`/subjects/${id}`),
};

// Attendance Services
export const attendanceService = {
  mark: (data) => apiClient.post('/attendance/mark', data),
  markClass: (data) => apiClient.post('/attendance/mark-class', data),
  getUserAttendance: (userId, params) => apiClient.get(`/attendance/user/${userId}`, { params }),
  getClassReport: (params) => apiClient.get('/attendance/class/report', { params }),
};

// Marks Services
export const marksService = {
  createExam: (data) => apiClient.post('/marks/exams', data),
  getAllExams: (params) => apiClient.get('/marks/exams', { params }),
  enterMarks: (data) => apiClient.post('/marks/enter', data),
  bulkEnter: (data) => apiClient.post('/marks/bulk', data),
  getStudentMarks: (studentId) => apiClient.get(`/marks/student/${studentId}`),
  getExamResult: (examId) => apiClient.get(`/marks/exam/${examId}`),
  getToppers: (params) => apiClient.get('/marks/toppers', { params }),
};

// Notice Services
export const noticeService = {
  create: (data) => apiClient.post('/notices', data),
  getAll: (params) => apiClient.get('/notices', { params }),
  getForUser: (params) => apiClient.get('/notices/user/notices', { params }),
  update: (id, data) => apiClient.put(`/notices/${id}`, data),
  delete: (id) => apiClient.delete(`/notices/${id}`),
  markAsRead: (id) => apiClient.post(`/notices/${id}/read`),
};

// Homework Services
export const homeworkService = {
  create: (data) => apiClient.post('/homework', data),
  getAll: (params) => apiClient.get('/homework', { params }),
  getForStudent: (params) => apiClient.get('/homework/student', { params }),
  submit: (id, data) => apiClient.post(`/homework/${id}/submit`, data),
  grade: (id, data) => apiClient.post(`/homework/${id}/grade`, data),
  update: (id, data) => apiClient.put(`/homework/${id}`, data),
  delete: (id) => apiClient.delete(`/homework/${id}`),
};

// Complaint Services
export const complaintService = {
  create: (data) => apiClient.post('/complaints', data),
  getAll: (params) => apiClient.get('/complaints', { params }),
  getMy: (params) => apiClient.get('/complaints/my', { params }),
  assign: (id, data) => apiClient.post(`/complaints/${id}/assign`, data),
  resolve: (id, data) => apiClient.post(`/complaints/${id}/resolve`, data),
  addComment: (id, data) => apiClient.post(`/complaints/${id}/comment`, data),
};

// Event Services
export const eventService = {
  create: (data) => apiClient.post('/events', data),
  getAll: (params) => apiClient.get('/events', { params }),
  getById: (id) => apiClient.get(`/events/${id}`),
  update: (id, data) => apiClient.put(`/events/${id}`, data),
  delete: (id) => apiClient.delete(`/events/${id}`),
  getCalendarEvents: (params) => apiClient.get('/events/calendar', { params }),
};

// Message Services
export const messageService = {
  getContacts: () => apiClient.get('/messages/contacts'),
  send: (data) => apiClient.post('/messages', data),
  getInbox: (params) => apiClient.get('/messages/inbox', { params }),
  getSent: (params) => apiClient.get('/messages/sent', { params }),
  getConversation: (userId, params) => apiClient.get(`/messages/conversation/${userId}`, { params }),
  markAsRead: (id) => apiClient.post(`/messages/${id}/read`),
  delete: (id) => apiClient.delete(`/messages/${id}`),
  getUnreadCount: () => apiClient.get('/messages/unread-count'),
};
