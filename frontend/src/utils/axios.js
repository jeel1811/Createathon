import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the auth token
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    console.log(`%c${config.method.toUpperCase()} ${config.url}`, 
         
        {
            data: config.data,
            params: config.params,
            headers: config.headers
        }
    );
    return config;
  },
  (error) => {
    console.error('[Request Error]:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
instance.interceptors.response.use(
  (response) => {
    // Log token and user information if present in response
    if (response.data?.token) {
      console.log('Token:', response.data.token);
      console.log('User:', response.data.user);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refresh_token = localStorage.getItem('refresh_token');
        if (refresh_token) {
          const response = await instance.post('/api/users/refresh/', {
            refresh_token: refresh_token
          });

          const { token } = response.data;
          localStorage.setItem('token', token);
          instance.defaults.headers.common['Authorization'] = `Token ${token}`;

          return instance(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, logout user
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
