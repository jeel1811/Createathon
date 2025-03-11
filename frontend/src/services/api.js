import axios from '../utils/axios'

const api = {
  // Auth endpoints
  register: (data) => axios.post('/api/users/register/', data),
  login: (data) => axios.post('/api/users/login/', data),
  refreshToken: (data) => axios.post('/api/users/refresh/', data),
  
  // User endpoints
  getProfile: () => axios.get('/api/users/me/'),
  updateProfile: (data) => axios.patch('/api/users/me/', data),
  
  // Challenge endpoints
  getChallenges: (params) => axios.get('/api/challenges/', { params }),
  getChallenge: (id) => axios.get(`/api/challenges/${id}/`),
  submitChallenge: (id, data) => axios.post(`/api/challenges/${id}/submit/`, data),
  
  // User progress endpoints
  getUserProgress: () => axios.get('/api/progress/'),
  getUserStatistics: () => axios.get('/api/progress/statistics/'),
  
  // Achievement endpoints
  getAchievements: () => axios.get('/api/achievements/'),
  getUserAchievements: () => axios.get('/api/user-achievements/'),
  
  // User endpoints
  getLeaderboard: () => axios.get('/api/users/leaderboard/'),
  
  // Category endpoints
  getCategories: () => axios.get('/api/challenges/categories/'),
}

// Remove duplicate interceptor since it's handled in axios.js
export default api
