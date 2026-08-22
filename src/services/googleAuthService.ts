import { UserProfile } from '../types';
import { isAuthorizedAdminEmail } from '../data/initialVaultData';

// OAuth Client ID from Google Cloud Console configuration
export const GOOGLE_CLIENT_ID =
  '358396878568-2hhcmud9das4mm5ncpussn143clu7r8q.apps.googleusercontent.com';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              error_description?: string;
            }) => void;
            error_callback?: (err: any) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email_verified?: boolean;
}

export const googleAuthService = {
  /**
   * Initializes and triggers the official Google OAuth 2.0 popup via Google Identity Services (GSI)
   */
  async triggerGoogleLogin(): Promise<UserProfile> {
    return new Promise((resolve, reject) => {
      // Check if GSI is loaded
      if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
        try {
          const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid',
            callback: async (response) => {
              if (response.error) {
                console.error('Google OAuth error:', response.error, response.error_description);
                reject(new Error(response.error_description || response.error || 'Error al autenticar con Google'));
                return;
              }

              if (response.access_token) {
                try {
                  // Fetch live user info directly from Google's API
                  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: {
                      Authorization: `Bearer ${response.access_token}`,
                    },
                  });

                  if (!userInfoResponse.ok) {
                    throw new Error('No se pudo obtener el perfil de Google');
                  }

                  const googleUser: GoogleUserInfo = await userInfoResponse.json();
                  const profile = this.mapGoogleUserToProfile(googleUser);
                  resolve(profile);
                } catch (fetchErr: any) {
                  console.error('Error fetching Google userinfo:', fetchErr);
                  reject(fetchErr);
                }
              } else {
                reject(new Error('No se recibió token de acceso de Google'));
              }
            },
            error_callback: (err: any) => {
              console.error('Google OAuth client error:', err);
              reject(new Error('Error en el cliente de autenticación de Google'));
            },
          });

          // Open official Google Account Picker
          tokenClient.requestAccessToken({ prompt: 'select_account' });
          return;
        } catch (e: any) {
          console.warn('Error launching GSI tokenClient, falling back to popup flow:', e);
        }
      }

      // Fallback: Direct OAuth URL in a popup window
      this.openDirectGoogleOAuthPopup()
        .then(resolve)
        .catch(reject);
    });
  },

  /**
   * Fallback: Opens Google's OAuth 2.0 endpoint directly in a popup window
   */
  async openDirectGoogleOAuthPopup(): Promise<UserProfile> {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const redirectUri = `${origin}/`;
    
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'token',
      scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid',
      prompt: 'select_account',
      include_granted_scopes: 'true',
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    // Open Google Login in a clean popup
    const popup = window.open(
      googleAuthUrl,
      'GoogleSignIn',
      'width=500,height=650,left=100,top=100,menubar=no,status=no'
    );

    if (!popup) {
      throw new Error('La ventana emergente de Google fue bloqueada. Por favor habilita los popups.');
    }

    return new Promise((resolve, reject) => {
      let resolved = false;

      // Listen for message or token in hash
      const checkPopupInterval = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(checkPopupInterval);
            if (!resolved) {
              reject(new Error('Inicio de sesión cancelado o ventana cerrada.'));
            }
            return;
          }

          // Check if popup returned to our origin with hash token
          if (popup.location.href.includes(origin)) {
            const hash = popup.location.hash;
            if (hash && hash.includes('access_token=')) {
              const hashParams = new URLSearchParams(hash.substring(1));
              const accessToken = hashParams.get('access_token');
              popup.close();
              clearInterval(checkPopupInterval);
              resolved = true;

              if (accessToken) {
                fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${accessToken}` },
                })
                  .then((res) => res.json())
                  .then((googleUser: GoogleUserInfo) => {
                    resolve(this.mapGoogleUserToProfile(googleUser));
                  })
                  .catch(reject);
              }
            }
          }
        } catch (_) {
          // Cross-origin restriction while on accounts.google.com (expected)
        }
      }, 500);

      // Timeout after 3 minutes
      setTimeout(() => {
        if (!resolved) {
          clearInterval(checkPopupInterval);
          reject(new Error('Tiempo de espera agotado al conectar con Google.'));
        }
      }, 180000);
    });
  },

  /**
   * Transforms real Google user info into the App 66 UserProfile model with Role detection
   */
  mapGoogleUserToProfile(googleUser: GoogleUserInfo): UserProfile {
    const email = googleUser.email.toLowerCase().trim();

    return {
      uid: googleUser.sub || `google_${Date.now()}`,
      email: googleUser.email,
      displayName: googleUser.name || 'Miembro VIP',
      role: 'vip_member',
      tier: 'Acceso VIP',
      avatarUrl:
        googleUser.picture ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}&backgroundColor=0066fe,0052ff`,
      joinedAt: new Date().toISOString().split('T')[0],
    };
  },
};
