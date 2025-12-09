import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${API_URL}/api/v1/auth/token/refresh/`,
            {
              refresh: refreshToken,
            }
          );
          const { access } = response.data;
          localStorage.setItem("access_token", access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } catch (err) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// Buying & Ship API methods
export const buyingAPI = {
  // Preview quotes without creating request
  previewQuotes: (data) => api.post("/buying/preview-quotes/", data),
  // Create buying request
  createRequest: (data) => api.post("/buying/requests/create/", data),

  // Get all buying requests (list)
  getRequests: (params) => api.get("/buying/requests/", { params }),

  // Get single buying request by ID
  getRequest: (requestId) => api.get(`/buying/requests/${requestId}/`),

  // Get user dashboard (all requests with quotes)
  getDashboard: () => api.get("/buying/dashboard/"),

  // Get quotes for a request
  getQuotes: (requestId) =>
    api.get(`/buying/requests/${requestId}/quotes/list/`),

  // Agent: Create quotes for a request
  createQuotes: (requestId, data) =>
    api.post(`/buying/requests/${requestId}/quotes/`, data),

  // Get all quotes for user
  getAllQuotes: (params) => api.get("/buying/quotes/", { params }),

  // Approve a quote (creates payment session)
  approveQuote: (quoteId) => api.post(`/buying/quotes/${quoteId}/approve/`),

  // Agent: Mark as purchased
  markPurchased: (requestId, data) =>
    api.post(`/buying/requests/${requestId}/mark-purchased/`, data),
};

// Logistics API methods
export const logisticsAPI = {
  // Validate address using EasyShip
  validateAddress: (address, replaceWithValidationResult = true) =>
    api.post("/logistics/validate-address/", {
      address,
      replace_with_validation_result: replaceWithValidationResult,
    }),
};
