"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Mail, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVerifyEmail } from "@/features/auth/hooks/use-auth";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const verifyEmail = useVerifyEmail();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (!token) return;
    verifyEmail.mutate(token, {
      onSuccess: () => setStatus("success"),
      onError: () => setStatus("error"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <Mail className="size-12 text-primary" />
        <h1 className="mt-4 text-xl font-bold">Verify your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ve sent a verification link to your inbox. Click it to activate your
          account.
        </p>
        <Button variant="outline" className="mt-6" render={<Link href="/login" />}>
          Back to login
        </Button>
      </div>
    );
  }

  if (verifyEmail.isPending || status === "idle") {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Verifying your email...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <XCircle className="size-12 text-destructive" />
        <h1 className="mt-4 text-xl font-bold">Verification failed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This link is invalid or has expired.
        </p>
        <Button className="mt-6" render={<Link href="/login" />}>
          Back to login
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-6 text-center">
      <CheckCircle2 className="size-12 text-success" />
      <h1 className="mt-4 text-xl font-bold">Email verified</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your account is now active. You can log in.
      </p>
      <Button className="mt-6" render={<Link href="/login" />}>
        Continue to login
      </Button>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="glass rounded-2xl p-8 shadow-xl shadow-black/5"
    >
      <Suspense fallback={null}>
        <VerifyEmailContent />
      </Suspense>
    </motion.div>
  );
}
