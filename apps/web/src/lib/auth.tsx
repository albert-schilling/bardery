import { createAuthClient } from "better-auth/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createContext, type ReactNode, useContext } from "react";

import { missingApiUrl, resolveApiUrl } from "~/lib/trpc";

/** Signing in with an email code, and out. Each call rejects with a message to show. */
export interface Auth {
  sendCode(email: string): Promise<void>;
  signIn(email: string, code: string): Promise<void>;
  signOut(): Promise<void>;
}

/** The message to show when a call fails, by the api's error code or HTTP status. */
function messageFor(error: { code?: string | undefined; status: number }): string {
  if (error.status === 429) return "Too many tries. Wait a while, then try again.";
  switch (error.code) {
    case "INVALID_OTP":
      return "That code isn't right. Check it and try again.";
    case "OTP_EXPIRED":
    case "TOO_MANY_ATTEMPTS":
      return "That code no longer works. Send a new one.";
    default:
      return "Something went wrong. Try again.";
  }
}

/** Better Auth's client for the api's `/api/auth` endpoints; the session cookie goes along. */
export function createAuth(fetchImpl: typeof fetch = fetch): Auth {
  const url = resolveApiUrl();
  // Better Auth's client would fall back to the web app's own host; fail as the tRPC client does.
  if (url === undefined) {
    const fail = () => Promise.reject(new Error(missingApiUrl));
    return { sendCode: fail, signIn: fail, signOut: fail };
  }
  const client = createAuthClient({
    baseURL: url,
    plugins: [emailOTPClient()],
    fetchOptions: { customFetchImpl: fetchImpl },
  });
  async function call(
    request: Promise<{ error: { code?: string | undefined; status: number } | null }>,
  ) {
    const { error } = await request;
    if (error !== null) throw new Error(messageFor(error));
  }
  return {
    sendCode: (email) => call(client.emailOtp.sendVerificationOtp({ email, type: "sign-in" })),
    signIn: (email, code) => call(client.signIn.emailOtp({ email, otp: code })),
    signOut: () => call(client.signOut()),
  };
}

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ auth, children }: { auth: Auth; children: ReactNode }) {
  return <AuthContext value={auth}>{children}</AuthContext>;
}

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (auth === null) throw new Error("useAuth needs an AuthProvider");
  return auth;
}
