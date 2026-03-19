import { envConfig } from "../config/env-config";
import { OAuthProfile } from "../types/auth";

// ─── Google OAuth ────────────────────────────────────────────
export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: envConfig.GOOGLE_CLIENT_ID,
    redirect_uri: envConfig.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/**
 * Exchanges the Google OAuth code for an access token and user profile.
 * @param code The Google OAuth code.
 * @returns An object containing the user profile, access token, refresh token, and expiration date.
 */
export async function exchangeGoogleCode(code: string): Promise<{
  profile: OAuthProfile;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: envConfig.GOOGLE_CLIENT_ID,
      client_secret: envConfig.GOOGLE_CLIENT_SECRET,
      redirect_uri: envConfig.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    throw new Error("Failed to exchange Google code");
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    id_token: string;
  };

  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userRes.ok) throw new Error("Failed to fetch Google user info");

  const googleUser = (await userRes.json()) as {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  };

  return {
    profile: {
      id: googleUser.id,
      email: googleUser.email,
      name: googleUser.name!,
      image: googleUser.picture,
      provider: "google",
    },
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined,
  };
}

