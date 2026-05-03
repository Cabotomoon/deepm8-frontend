/**
 * Application Configuration
 * Manages environment-specific settings
 */

export const config = {
  /**
   * Backend URL - defaults to Railway production
   */
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'https://deepm8-backend-production.up.railway.app',

  /**
   * Demo Mode - allows standalone usage without iframe auth
   * Set to true for Vercel deployment
   */
  isDemoMode: import.meta.env.VITE_DEMO_MODE === 'true',

  /**
   * Environment detection
   */
  isProduction: import.meta.env.PROD,
  isDevelopment: import.meta.env.DEV,

  /**
   * Check if running in iframe (SeaVerse context)
   */
  isIframe: (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true; // If we can't check, assume iframe for safety
    }
  })(),
};

console.log('🔧 App Configuration:', {
  backendUrl: config.backendUrl,
  isDemoMode: config.isDemoMode,
  isProduction: config.isProduction,
  isDevelopment: config.isDevelopment,
  isIframe: config.isIframe,
});