import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE}/auth/refresh-token`, {
            refresh_token: refreshToken,
          });
          localStorage.setItem('access_token', response.data.access_token);
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  createInvitation: (data) => api.post('/auth/invite', data),
  getInvitation: (token) => api.get(`/auth/invite/${token}`),
  acceptInvitation: (data) => api.post('/auth/invite/accept', data),
};

// School APIs
export const schoolAPI = {
  getCurrentSchool: () => api.get('/schools/current'),
  updateSchool: (data) => api.put('/schools/current', data),
  completeSetup: () => api.post('/schools/current/complete-setup'),
  createAcademicYear: (data) => api.post('/schools/academic-years', data),
  getAcademicYears: () => api.get('/schools/academic-years'),
  getCurrentAcademicYear: () => api.get('/schools/academic-years/current'),
  createTerm: (data) => api.post('/schools/terms', data),
  getTerms: (academicYearId) => api.get('/schools/terms', { params: { academic_year_id: academicYearId } }),
  createHoliday: (data) => api.post('/schools/holidays', data),
  getHolidays: () => api.get('/schools/holidays'),
  deleteHoliday: (id) => api.delete(`/schools/holidays/${id}`),
};

// User APIs
export const userAPI = {
  getUsers: (params) => api.get('/users', { params }),
  createUser: (data) => api.post('/users', data),
  getUser: (id) => api.get(`/users/${id}`),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deactivateUser: (id) => api.delete(`/users/${id}`),
  getTeachers: () => api.get('/users/teachers'),
  getParents: () => api.get('/users/parents'),
  getRoles: () => api.get('/users/roles/list'),
  createRole: (data) => api.post('/users/roles', data),
  bulkImportUsers: (file, userType) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/users/bulk-import?user_type=${userType}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Student APIs
export const studentAPI = {
  getStudents: (params) => api.get('/students', { params }),
  createStudent: (data) => api.post('/students', data),
  getStudent: (id) => api.get(`/students/${id}`),
  updateStudent: (id, data) => api.put(`/students/${id}`, data),
  deactivateStudent: (id) => api.delete(`/students/${id}`),
  linkParent: (studentId, data) => api.post(`/students/${studentId}/link-parent`, data),
  getStudentParents: (studentId) => api.get(`/students/${studentId}/parents`),
  getMyChildren: () => api.get('/students/my-children'),
  bulkImportStudents: (file, classId, sectionId) => {
    const formData = new FormData();
    formData.append('file', file);
    const params = new URLSearchParams();
    if (classId) params.append('class_id', classId);
    if (sectionId) params.append('section_id', sectionId);
    return api.post(`/students/bulk-import?${params.toString()}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Academic APIs
export const academicAPI = {
  getClasses: (params) => api.get('/academic/classes', { params }),
  createClass: (data) => api.post('/academic/classes', data),
  getClass: (id) => api.get(`/academic/classes/${id}`),
  updateClass: (id, data) => api.put(`/academic/classes/${id}`, data),
  archiveClass: (id) => api.delete(`/academic/classes/${id}`),
  getSections: (classId) => api.get('/academic/sections', { params: { class_id: classId } }),
  createSection: (data) => api.post('/academic/sections', data),
  updateSection: (id, data) => api.put(`/academic/sections/${id}`, data),
  getSubjects: () => api.get('/academic/subjects'),
  createSubject: (data) => api.post('/academic/subjects', data),
  updateSubject: (id, data) => api.put(`/academic/subjects/${id}`, data),
  assignSubjectToClass: (data) => api.post('/academic/class-subjects', data),
  getClassSubjects: (classId, sectionId) => api.get(`/academic/class-subjects/${classId}`, { params: { section_id: sectionId } }),
  getTimetable: (classId, sectionId) => api.get(`/academic/timetable/${classId}`, { params: { section_id: sectionId } }),
  createTimetableSlot: (data) => api.post('/academic/timetable', data),
  deleteTimetableSlot: (id) => api.delete(`/academic/timetable/${id}`),
  getMyClasses: () => api.get('/academic/my-classes'),
  enrollStudent: (data) => api.post('/academic/enroll-student', data),
  getClassStudents: (classId, sectionId) => api.get(`/academic/class-students/${classId}`, { params: { section_id: sectionId } }),
};

// Attendance APIs
export const attendanceAPI = {
  markAttendance: (data) => api.post('/attendance', data),
  bulkMarkAttendance: (data) => api.post('/attendance/bulk', data),
  getClassAttendance: (classId, date, sectionId, subjectId) => 
    api.get(`/attendance/class/${classId}`, { params: { date, section_id: sectionId, subject_id: subjectId } }),
  getStudentAttendance: (studentId, startDate, endDate) => 
    api.get(`/attendance/student/${studentId}`, { params: { start_date: startDate, end_date: endDate } }),
  getAttendanceSummary: (classId, startDate, endDate, sectionId) =>
    api.get(`/attendance/summary/${classId}`, { params: { start_date: startDate, end_date: endDate, section_id: sectionId } }),
  updateAttendance: (id, data) => api.put(`/attendance/${id}`, data),
  createLeaveRequest: (data) => api.post('/attendance/leave-request', data),
  getLeaveRequests: (params) => api.get('/attendance/leave-requests', { params }),
  updateLeaveRequest: (id, data) => api.put(`/attendance/leave-request/${id}`, data),
};

// Grades APIs
export const gradesAPI = {
  createAssignment: (data) => api.post('/grades/assignments', data),
  getAssignments: (params) => api.get('/grades/assignments', { params }),
  getAssignment: (id) => api.get(`/grades/assignments/${id}`),
  updateAssignment: (id, data) => api.put(`/grades/assignments/${id}`, data),
  deleteAssignment: (id) => api.delete(`/grades/assignments/${id}`),
  getMyAssignments: () => api.get('/grades/my-assignments'),
  submitAssignment: (data) => api.post('/grades/submissions', data),
  createGrade: (data) => api.post('/grades', data),
  bulkCreateGrades: (data) => api.post('/grades/bulk', data),
  getStudentGrades: (studentId, subjectId) => api.get(`/grades/student/${studentId}`, { params: { subject_id: subjectId } }),
  getMyGrades: (studentId) => api.get('/grades/my-grades', { params: { student_id: studentId } }),
  updateGrade: (id, data) => api.put(`/grades/${id}`, data),
  createCategory: (data) => api.post('/grades/categories', data),
  getCategories: (classId, subjectId) => api.get(`/grades/categories/${classId}/${subjectId}`),
};

// Dashboard APIs
export const dashboardAPI = {
  getAdminDashboard: () => api.get('/dashboard/admin'),
  getTeacherDashboard: () => api.get('/dashboard/teacher'),
  getParentDashboard: () => api.get('/dashboard/parent'),
  getStudentDashboard: () => api.get('/dashboard/student'),
};

// Communication APIs
export const communicationAPI = {
  // Announcements
  createAnnouncement: (data) => api.post('/communication/announcements', data),
  getAnnouncements: (params) => api.get('/communication/announcements', { params }),
  getAnnouncement: (id) => api.get(`/communication/announcements/${id}`),
  updateAnnouncement: (id, data) => api.put(`/communication/announcements/${id}`, data),
  deleteAnnouncement: (id) => api.delete(`/communication/announcements/${id}`),
  
  // Messages
  sendMessage: (data) => api.post('/communication/messages', data),
  getMessages: (params) => api.get('/communication/messages', { params }),
  getConversations: () => api.get('/communication/conversations'),
  markMessageRead: (id) => api.put(`/communication/messages/${id}/read`),
  markConversationRead: (userId) => api.put(`/communication/conversations/${userId}/read-all`),
  
  // Events
  createEvent: (data) => api.post('/communication/events', data),
  getEvents: (params) => api.get('/communication/events', { params }),
  deleteEvent: (id) => api.delete(`/communication/events/${id}`),
};

export default api;
