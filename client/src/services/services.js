import api from './api';

export const inventoryService = {
  getAll: (params) => api.get('/api/inventory', { params }),
  getById: (id) => api.get(`/api/inventory/${id}`),
  create: (data) => api.post('/api/inventory', data),
  update: (id, data) => api.put(`/api/inventory/${id}`, data),
  delete: (id) => api.delete(`/api/inventory/${id}`)
};

export const employeeService = {
  getAll: () => api.get('/api/employees'),
  getById: (id) => api.get(`/api/employees/${id}`),
  create: (data) => api.post('/api/employees', data),
  update: (id, data) => api.put(`/api/employees/${id}`, data),
  delete: (id) => api.delete(`/api/employees/${id}`)
};

export const attendanceService = {
  getByMonth: (year, month) => api.get(`/api/attendance/${year}/${month}`),
  create: (data) => api.post('/api/attendance', data),
  update: (id, data) => api.put(`/api/attendance/${id}`, data)
};

export const requestService = {
  getAll: () => api.get('/api/requests'),
  create: (data) => api.post('/api/requests', data),
  update: (id, data) => api.put(`/api/requests/${id}`, data),
  updateStatus: (id, data) => api.put(`/api/requests/${id}/status`, data),
  delete: (id) => api.delete(`/api/requests/${id}`)
};

export const technicalFormService = {
  getAll: () => api.get('/api/technical-forms'),
  create: (data) => api.post('/api/technical-forms', data),
  update: (id, data) => api.put(`/api/technical-forms/${id}`, data)
};

export const dependencyService = {
  getAll: () => api.get('/api/dependencies'),
  create: (data) => api.post('/api/dependencies', data),
  createCoordination: (data) => api.post('/api/dependencies/coordinaciones', data),
  createArea: (data) => api.post('/api/dependencies/areas', data)
};

export const userService = {
  getAll: () => api.get('/api/users'),
  getById: (id) => api.get(`/api/users/${id}`),
  update: (id, data) => api.put(`/api/users/${id}`, data),
  delete: (id) => api.delete(`/api/users/${id}`)
};

export const buildingService = {
  getAll: () => api.get('/api/buildings'),
  updateRoom: (id, data) => api.put(`/api/buildings/salones/${id}`, data)
};

export const classroomService = {
  getAll: (params) => api.get('/api/classrooms', { params }),
  create: (data) => api.post('/api/classrooms', data),
  delete: (id) => api.delete(`/api/classrooms/${id}`)
};

export const spacesService = {
  getAll: (params) => api.get('/api/spaces', { params }),
  getById: (id) => api.get(`/api/spaces/${id}`),
  create: (data) => api.post('/api/spaces', data),
  startAudit: (spaceId) => api.post(`/api/spaces/${spaceId}/audit/start`),
  scanBatch: (spaceId, body) => api.post(`/api/spaces/${spaceId}/audit/scan`, body),
  closeAudit: (spaceId, body) => api.post(`/api/spaces/${spaceId}/audit/close`, body),
  getInventory: (spaceId) => api.get(`/api/spaces/${spaceId}/inventory`)
};

// helper to assign quadrant
export const assignService = {
  assignQuadrant: (spaceId, quadrant) => api.post(`/api/spaces/${spaceId}/assign-quadrant`, { quadrant })
};

export const transferService = {
  create: (data) => api.post('/api/requests/transfer', data),
  getAll: () => api.get('/api/requests')
};

export const emailService = {
  send: (data) => api.post('/api/emails/send', data),
  sendBulk: (data) => api.post('/api/emails/send-bulk', data),
  getLogs: (params) => api.get('/api/emails/logs', { params })
};
