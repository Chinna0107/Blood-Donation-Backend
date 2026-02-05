// API utility for making authenticated requests
const API_BASE_URL = 'http://localhost:5000/api';

// Get token from localStorage (check both token types)
const getToken = () => localStorage.getItem('admintoken') || localStorage.getItem('token');

// Make authenticated API call
const apiCall = async (endpoint, options = {}) => {
  const token = getToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  return response.json();
};

// Auth API calls
export const authAPI = {
  login: (credentials) => 
    apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  
  signup: (userData) => 
    apiCall('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  
  getProfile: () => apiCall('/auth/profile'),
  
  sendOTP: (email) => 
    apiCall('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  
  verifyOTP: (email, otp) => 
    apiCall('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),
};

// Donor API calls
export const donorAPI = {
  getAll: () => apiCall('/donors'),
  getByBloodType: (type) => apiCall(`/donors/blood-type/${type}`),
  register: (donorData) => 
    apiCall('/donors/register', {
      method: 'POST',
      body: JSON.stringify(donorData),
    }),
};

// Request API calls
export const requestAPI = {
  getAll: () => apiCall('/requests'),
  submit: (requestData) => 
    apiCall('/requests/submit', {
      method: 'POST',
      body: JSON.stringify(requestData),
    }),
};

// Check if user is authenticated
export const isAuthenticated = () => !!getToken();

// Logout function
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('admintoken');
  localStorage.removeItem('user');
};