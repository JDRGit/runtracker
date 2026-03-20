import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/react";

function getClientAuthBaseUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL("/api/auth", window.location.origin).toString();
  }

  const publicAuthUrl = process.env.NEXT_PUBLIC_AUTH_URL;

  if (typeof publicAuthUrl === "string" && publicAuthUrl.trim() !== "") {
    return publicAuthUrl.trim();
  }

  return undefined;
}

export const authClient = createAuthClient({
  baseURL: getClientAuthBaseUrl(),
  basePath: "/api/auth",
  plugins: [passkeyClient()],
});
