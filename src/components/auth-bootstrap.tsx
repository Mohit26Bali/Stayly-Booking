"use client";

import { useCurrentUser } from "@/features/auth/hooks/use-auth";

/** Silently hydrates the auth store from the session cookie on app load. */
export function AuthBootstrap() {
  useCurrentUser();
  return null;
}
