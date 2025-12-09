/**
 * OAuth helper functions for Google and Facebook authentication
 */

// Load Google OAuth script
export const loadGoogleScript = () => {
  return new Promise((resolve, reject) => {
    if (window.google) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google OAuth script"));
    document.body.appendChild(script);
  });
};

// Load Facebook SDK
export const loadFacebookScript = () => {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
      if (appId && window.FB) {
        window.FB.init({
          appId: appId,
          cookie: true,
          xfbml: true,
          version: "v18.0",
        });
      }
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Facebook SDK"));
    document.body.appendChild(script);
  });
};

// Google OAuth Login
export const handleGoogleLogin = async () => {
  try {
    await loadGoogleScript();

    return new Promise((resolve, reject) => {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

      if (!clientId) {
        reject(new Error("Google Client ID not configured"));
        return;
      }

      window.google.accounts.oauth2
        .initTokenClient({
          client_id: clientId,
          scope: "email profile",
          callback: (response) => {
            if (response.access_token) {
              resolve(response.access_token);
            } else {
              reject(new Error("Failed to get access token"));
            }
          },
        })
        .requestAccessToken();
    });
  } catch (error) {
    throw new Error(`Google OAuth error: ${error.message}`);
  }
};

// Facebook OAuth Login
export const handleFacebookLogin = async () => {
  try {
    await loadFacebookScript();

    return new Promise((resolve, reject) => {
      window.FB.login(
        (response) => {
          if (response.authResponse) {
            resolve(response.authResponse.accessToken);
          } else {
            reject(new Error("Facebook login failed"));
          }
        },
        { scope: "email,public_profile" }
      );
    });
  } catch (error) {
    throw new Error(`Facebook OAuth error: ${error.message}`);
  }
};
