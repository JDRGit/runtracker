"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth/react/ui";
import { authClient } from "@/lib/auth-client";

export default function NeonAuthProvider({ children }) {
  return <NeonAuthUIProvider authClient={authClient}>{children}</NeonAuthUIProvider>;
}
