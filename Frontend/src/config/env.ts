export const env = {
  apiUrl: import.meta.env.VITE_API_URL as string,
  googleAuthEnabled: import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true',
  googleAuthUrl: '/api/v1/oauth2/authorization/google',
  internalPilot: import.meta.env.VITE_INTERNAL_PILOT === 'true',
}
