// API Configuration
export const apiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000/",
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/",
  
  // Authentication endpoints
  auth: {
    login: process.env.NEXT_PUBLIC_LOGIN_URL || "http://127.0.0.1:8000/api/auth/login/",
    signup: process.env.NEXT_PUBLIC_SIGNUP_URL || "http://127.0.0.1:8000/api/auth/signup/",
    passwordReset: process.env.NEXT_PUBLIC_PASSWORD_RESET_URL || "http://127.0.0.1:8000/api/password-reset/request/",
    passwordVerify: process.env.NEXT_PUBLIC_PASSWORD_VERIFY_URL || "http://127.0.0.1:8000/api/password-reset/verify/",
    passwordConfirm: process.env.NEXT_PUBLIC_PASSWORD_CONFIRM_URL || "http://127.0.0.1:8000/api/password-reset/confirm/",
  },
  
  // App URLs
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000/",
  },
  
  // Media URLs
  media: {
    url: process.env.NEXT_PUBLIC_MEDIA_URL || "http://127.0.0.1:8000/media/",
  },
};
