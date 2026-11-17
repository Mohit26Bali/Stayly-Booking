"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { CheckCircle2, Eye, EyeOff, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import {
  resetPasswordSchema,
  passwordSchema,
} from "@/features/auth/schemas/auth.schema";
import { useResetPassword } from "@/features/auth/hooks/use-auth";
import { z } from "zod";

const formSchema = z.object({ password: passwordSchema });
type FormInput = z.infer<typeof formSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const resetPassword = useResetPassword();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput>({ resolver: zodResolver(formSchema) });

  const onSubmit = handleSubmit(async (values) => {
    if (!token) return;
    try {
      resetPasswordSchema.parse({ token, password: values.password });
      await resetPassword.mutateAsync({ token, password: values.password });
      toast.success("Password reset — log in with your new password.");
      router.push("/login");
    } catch {
      toast.error("This reset link is invalid or has expired.");
    }
  });

  if (!token) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <XCircle className="size-12 text-destructive" />
        <h1 className="mt-4 text-xl font-bold">Invalid link</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This password reset link is missing or malformed.
        </p>
        <Link href="/forgot-password" className="mt-6 text-sm font-medium text-primary hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Choose a strong password you haven&apos;t used before.
      </p>

      <form onSubmit={onSubmit} className="mt-8">
        <FieldGroup>
          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">New password</FieldLabel>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <FieldError errors={[errors.password]} />
          </Field>

          <Button type="submit" size="lg" disabled={resetPassword.isPending} className="mt-2">
            {resetPassword.isPending && <Loader2 className="size-4 animate-spin" />}
            <CheckCircle2 className="size-4" />
            Reset password
          </Button>
        </FieldGroup>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="glass rounded-2xl p-8 shadow-xl shadow-black/5"
    >
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </motion.div>
  );
}
