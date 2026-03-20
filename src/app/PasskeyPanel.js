"use client";

import { useEffect, useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";

function getPasskeyActionError(error, fallbackMessage) {
  const code = typeof error?.code === "string" ? error.code : "";

  if (code === "AUTH_CANCELLED" || code === "ERROR_CEREMONY_ABORTED") {
    return "The passkey prompt was cancelled.";
  }

  if (code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") {
    return "That passkey is already registered to this account.";
  }

  const message = typeof error?.message === "string" ? error.message.trim() : "";
  return message || fallbackMessage;
}

function formatRegisteredAt(value) {
  if (!value) {
    return "Saved recently";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Saved recently";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function PasskeyPanel() {
  const { data: passkeysData, error: passkeysError, isPending: isLoadingPasskeys } = authClient.useListPasskeys();
  const passkeys = useMemo(() => (Array.isArray(passkeysData) ? passkeysData : []), [passkeysData]);
  const [passkeyName, setPasskeyName] = useState("");
  const [actionError, setActionError] = useState("");
  const [isAddingPasskey, setIsAddingPasskey] = useState(false);
  const [activeDeleteId, setActiveDeleteId] = useState("");
  const [isPasskeySupported, setIsPasskeySupported] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsPasskeySupported(typeof window.PublicKeyCredential !== "undefined");
  }, []);

  const listErrorMessage = typeof passkeysError?.message === "string" ? passkeysError.message : "";

  const handleAddPasskey = async () => {
    setActionError("");
    setIsAddingPasskey(true);

    try {
      const trimmedName = passkeyName.trim();
      const result = await authClient.passkey.addPasskey({
        name: trimmedName || undefined,
      });

      if (result.error) {
        throw new Error(getPasskeyActionError(result.error, "Could not save a passkey for this account."));
      }

      setPasskeyName("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not save a passkey for this account.");
    } finally {
      setIsAddingPasskey(false);
    }
  };

  const handleDeletePasskey = async (id) => {
    setActionError("");
    setActiveDeleteId(id);

    try {
      const result = await authClient.passkey.deletePasskey({ id });

      if (result.error) {
        throw new Error(getPasskeyActionError(result.error, "Could not remove that passkey."));
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not remove that passkey.");
    } finally {
      setActiveDeleteId("");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">Passwordless access</p>
        <h3 className="section-title mt-3">Passkeys</h3>
        <p className="section-copy mt-2">
          Save a passkey once, then you can sign in later with Face ID, Touch ID, Windows Hello, or a security key.
        </p>
      </div>

      {isPasskeySupported === false ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This browser does not expose WebAuthn passkeys. Use a supported browser over HTTPS or on localhost.
        </p>
      ) : null}

      {actionError ? (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {actionError}
        </p>
      ) : null}

      {listErrorMessage ? (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {listErrorMessage}
        </p>
      ) : null}

      <label className="mt-6 block">
        <span className="block text-sm font-medium text-slate-700">Optional passkey name</span>
        <input
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          maxLength={60}
          onChange={(event) => setPasskeyName(event.target.value)}
          placeholder="MacBook Air, iPhone, YubiKey..."
          type="text"
          value={passkeyName}
        />
      </label>

      <button
        className="primary-button mt-4 w-full"
        disabled={isPasskeySupported === false || isAddingPasskey}
        onClick={handleAddPasskey}
        type="button"
      >
        {isAddingPasskey ? "Saving passkey..." : "Add passkey"}
      </button>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Registered passkeys</p>
          {isLoadingPasskeys ? <p className="text-xs text-slate-500">Refreshing...</p> : null}
        </div>

        {isLoadingPasskeys && passkeys.length === 0 && !listErrorMessage ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-4 text-sm text-slate-600">
            Loading your saved passkeys...
          </div>
        ) : passkeys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-4 text-sm text-slate-600">
            No passkeys saved yet. Use Google once, register a passkey here, and future sign-ins can stay passwordless.
          </div>
        ) : (
          passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {passkey.name || "Unnamed passkey"}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                    {passkey.deviceType === "singleDevice" ? "Device passkey" : "Synced passkey"}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Saved {formatRegisteredAt(passkey.createdAt)}
                    {passkey.backedUp ? " and backed up" : ""}
                  </p>
                </div>
                <button
                  className="ghost-button"
                  disabled={activeDeleteId === passkey.id}
                  onClick={() => handleDeletePasskey(passkey.id)}
                  type="button"
                >
                  {activeDeleteId === passkey.id ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
