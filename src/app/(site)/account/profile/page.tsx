"use client";

import { useAuthStore } from "@/features/auth/store";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <p className="mt-2 text-muted-foreground">
        {user?.email} · Role: {user?.role} · Email verified:{" "}
        {user?.emailVerified ? "yes" : "no"}
      </p>
    </div>
  );
}
