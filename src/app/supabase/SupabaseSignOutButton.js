"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function SupabaseSignOutButton() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await supabase.auth.signOut();
      router.replace("/supabase/sign-in");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <button className="ghost-button" disabled={isSigningOut} onClick={handleSignOut} type="button">
      {isSigningOut ? "Signing out..." : "Sign out"}
    </button>
  );
}
