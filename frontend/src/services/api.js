import axios from 'axios';

// Use Railway backend in production, localhost only for local development
const BASE =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://YOUR-BACKEND-NAME.up.railway.app/api');

// Create axios instance
const api = axios.create({
  baseURL: BASE,
  timeout: 30000,
});

// Add token automatically
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

// Handle unauthorized access
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ================= AUTH =================
export const authAPI = {
  sendOTP: (mobile) => api.post('/auth/send-otp', { mobile }),
  verifyOTP: (mobile, otp) =>
    api.post('/auth/verify-otp', { mobile, otp }),
  login: (mobile, password) =>
    api.post('/auth/login', { mobile, password }),
  getMe: () => api.get('/auth/me'),
  completeProfile: (data) =>
    api.post('/auth/complete-profile', data),
};

// ================= DEPARTMENT =================
export const deptAPI = {
  getAll: () => api.get('/departments'),
};

// ================= DOCTOR =================
export const doctorAPI = {
  getAll: (params) => api.get('/doctors', { params }),
  getById: (id) => api.get(`/doctors/${id}`),
  getMyProfile: () => api.get('/doctors/me'),
  getMySchedule: () => api.get('/doctors/me/schedule'),
  updateMySchedule: (scheds) =>
    api.put('/doctors/me/schedule', { schedules: scheds }),
  getSchedule: (id) =>
    api.get(`/doctors/${id}/schedule`),
  create: (data) => api.post('/doctors', data),
};

// ================= APPOINTMENTS =================
export const appointmentAPI = {
  getSlots: (doctorId, date) =>
    api.get('/appointments/slots', {
      params: { doctorId, date },
    }),

  lockSlot: (slotId) =>
    api.post('/appointments/lock-slot', { slotId }),

  book: (data) =>
    api.post('/appointments', data),

  getAll: (params) =>
    api.get('/appointments', { params }),

  getQueue: (params) =>
    api.get('/appointments/queue', { params }),

  getById: (id) =>
    api.get(`/appointments/${id}`),

  updateStatus: (id, status, reason) =>
    api.patch(`/appointments/${id}/status`, {
      status,
      cancelReason: reason,
    }),

  downloadPDF: (id) =>
    api.get(`/appointments/${id}/pdf`, {
      responseType: 'blob',
    }),
};

// ================= CONSULTATION =================
export const consultationAPI = {
  get: (aptId) =>
    api.get(`/consultations/${aptId}`),

  save: (aptId, data) =>
    api.post(`/consultations/${aptId}`, data),

  processAI: (text, patientId) =>
    api.post('/consultations/ai/process', {
      text,
      patientId,
    }),

  getPatientHistory: (patientId) =>
    api.get(`/patients/${patientId}/history`),

  downloadPrescription: (aptId) =>
    api.get(`/consultations/${aptId}/prescription`, {
      responseType: 'blob',
    }),
};

// ================= PATIENT =================
export const patientAPI = {
  getMe: () => api.get('/patients/me'),
  update: (data) => api.put('/patients/me', data),
  search: (params) =>
    api.get('/patients/search', { params }),
  getById: (id) => api.get(`/patients/${id}`),
  getFollowUps: () =>
    api.get('/patients/follow-ups'),
  respondFollowUp: (id, data) =>
    api.patch(`/patients/follow-ups/${id}`, data),
};

// ================= ADMIN =================
export const adminAPI = {
  getAnalytics: () =>
    api.get('/admin/analytics'),
};

// ================= PDF DOWNLOAD =================
export function downloadBlob(res, filename) {
  const url = window.URL.createObjectURL(
    new Blob([res.data], {
      type: 'application/pdf',
    })
  );

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(url);
}

export default api;