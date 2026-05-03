/**
 * SeaVerse Authentication Service
 * Handles user authentication via iframe PostMessage
 * Also supports standalone mode for Vercel deployment
 */

import { config } from '../config';
 

export interface AuthUserProfile {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  username?: string; // Chess-specific username
}

/**
 * Get login token from parent page
 */
export async function getToken(): Promise<string | null> {
  // Check if running in iframe
  try {
    if (window.self === window.top) {
      return null; // Not in iframe
    }
  } catch {
    // In iframe
  }

  return new Promise((resolve) => {
    let resolved = false;

    // Listen for parent response
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'seaverse:token') {
        cleanup();
        const token = event.data.payload?.accessToken;
        resolve(token || null);
      } else if (event.data?.type === 'seaverse:error') {
        cleanup();
        resolve(null);
      }
    };

    // 5 second timeout
    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 5000);

    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      window.removeEventListener('message', handleMessage);
    };

    window.addEventListener('message', handleMessage);

    // Request token from parent
    window.parent.postMessage({ type: 'seaverse:get_token' }, '*');
  });
}

/**
 * Decode JWT token to get user info
 */
export function decodeToken(token: string): AuthUserProfile | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));

    return {
      userId: payload.sub || payload.user_id || 'unknown',
      name: payload.name || payload.username || 'Usuario',
      email: payload.email || '',
      avatar: payload.picture || payload.avatar || ''
    };
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * Create a new local guest user without SeaVerse authentication
 * This allows offline/standalone usage
 */
export function createLocalGuestUser(): { token: string; user: AuthUserProfile } {
  // Generate unique user ID
  const userId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const email = `${userId}@local.guest`;

  const authUser: AuthUserProfile = {
    userId,
    name: 'Usuario', // Default name, will be updated in profile setup
    email,
    avatar: '',
    username: undefined
  };

  // Generate token
  const mockToken = generateMockJWT(authUser.userId, authUser.name, authUser.email);

  // Save to auth storage
  saveAuth(mockToken, authUser);

  console.log('✅ Created local guest user:', authUser.userId);
  return { token: mockToken, user: authUser };
}

/**
 * Helper function to generate a mock JWT token for development/testing
 * This creates a valid JWT structure that can be parsed by the SDK
 */
function generateMockJWT(userId: string, name: string, email: string): string {
  // Helper function to safely encode to Base64URL
  function base64UrlEncode(str: string): string {
    // Convert string to UTF-8 bytes, then to base64
    const utf8Bytes = new TextEncoder().encode(str);
    let binary = '';
    utf8Bytes.forEach(byte => {
      binary += String.fromCharCode(byte);
    });
    const base64 = btoa(binary);

    // Convert to Base64URL (replace +/= with -_)
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const payload = {
    sub: userId,
    user_id: userId,
    name: name,
    email: email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year
  };

  // Base64URL encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  // Create a mock signature (Base64URL encoded)
  const signature = base64UrlEncode('mock-signature-for-development-only');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Initialize authentication and return user profile
 * Supports both iframe (SeaVerse) and standalone (Demo) modes
 */
export async function initAuth(): Promise<{ token: string; user: AuthUserProfile } | null> {
  console.log('🔐 Initializing authentication...');

  // Check if we're in demo mode (standalone Vercel deployment)
  if (config.isDemoMode) {
    console.log('🎮 Demo mode enabled - checking for existing local user...');

    // Try to load existing auth
    const existingAuth = loadAuth();
    if (existingAuth) {
      console.log('✅ Found existing local user:', existingAuth.user.name);
      return existingAuth;
    }

    // No existing user - create guest user automatically
    console.log('🆕 No local user found - creating guest user...');
    const { token, user } = createLocalGuestUser();
    return { token, user };
  }

  // Original iframe auth flow
  const token = await getToken();

  if (!token) {
    console.warn('⚠️ No token received - returning null to force user creation flow');
    // No creamos usuario automático, dejamos que el flujo de creación lo maneje
    return null;
  }

  const user = decodeToken(token);

  if (!user) {
    console.error('❌ Failed to decode user info from token');
    return null;
  }

  console.log('✅ Authentication successful:', user.name);
  return { token, user };
}
/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = localStorage.getItem('chess_auth_token');
  return !!token;
}

/**
 * Save authentication data
 */
export function saveAuth(token: string, user: AuthUserProfile): void {
  // Save for Chess Clash
  localStorage.setItem('chess_auth_token', token);
  localStorage.setItem('chess_user_profile', JSON.stringify(user));

  // Save for @seaverse/data-sdk (uses 'seaverse_token' key)
  localStorage.setItem('seaverse_token', token);

  console.log('💾 Token saved to localStorage:', {
    chess_auth_token: token.substring(0, 20) + '...',
    seaverse_token: token.substring(0, 20) + '...'
  });
}

/**
 * Load saved authentication data
 */
export function loadAuth(): { token: string; user: AuthUserProfile } | null {
  const token = localStorage.getItem('chess_auth_token');
  const userStr = localStorage.getItem('chess_user_profile');

  if (!token || !userStr) return null;

  try {
    const user = JSON.parse(userStr);
    return { token, user };
  } catch {
    return null;
  }
}

/**
 * Clear authentication data (logout current user but keep profiles)
 */
export function clearAuth(): void {
  localStorage.removeItem('chess_auth_token');
  localStorage.removeItem('chess_user_profile');
  localStorage.removeItem('seaverse_token');
  // Note: We do NOT clear chess_local_profiles to preserve all user data
}

/**
 * Login with existing user profile
 */
export function loginWithProfile(userId: string): { token: string; user: AuthUserProfile } | null {
  // Load the user profile from localStorage
  const profilesStr = localStorage.getItem('chess_local_profiles');
  if (!profilesStr) return null;

  try {
    const profiles = JSON.parse(profilesStr);
    const profile = profiles.find((p: any) => p.userId === userId);

    if (!profile) {
      console.error('❌ Profile not found for userId:', userId);
      return null;
    }

    // Create auth user from profile
    const authUser: AuthUserProfile = {
      userId: profile.userId,
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar || '',
      username: profile.name
    };

    // Generate token for this user
    const mockToken = generateMockJWT(authUser.userId, authUser.name, authUser.email);

    // Save to auth storage
    saveAuth(mockToken, authUser);

    console.log('✅ Logged in with existing profile:', authUser.name);
    return { token: mockToken, user: authUser };
  } catch (error) {
    console.error('❌ Error loading profile:', error);
    return null;
  }
}

/**
 * Update user profile with chess username
 */
export function updateUsername(username: string): void {
  const authData = loadAuth();
  if (!authData) return;

  // 🔑 CRITICAL: Update BOTH name and username fields
  // name is used by createUserProfile, username is for storage
  authData.user.name = username;
  authData.user.username = username;
  saveAuth(authData.token, authData.user);
  console.log('✅ Username updated:', username);
}

/**
 * Check if user has set their chess username
 */
export function hasUsername(): boolean {
  const authData = loadAuth();
  return !!(authData?.user.username);
}

/**
 * Get current username
 */
export function getUsername(): string | null {
  const authData = loadAuth();
  return authData?.user.username || null;
}

