"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/features/auth/schemas/auth.schema";
import { useForgotPassword } from "@/features/auth/hooks/use-auth";

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await forgotPassword.mutateAsync(values);
      setSubmitted(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="glass rounded-2xl p-8 shadow-xl shadow-black/5"
    >
      <Link
        href="/login"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to login
      </Link>

      {submitted ? (
        <div className="flex flex-col items-center py-6 text-center">
          <CheckCircle2 className="size-12 text-success" />
          <h1 className="mt-4 text-xl font-bold">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            If an account exists for that email, we&apos;ve sent a link to reset your
            password.
          </p>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold tracking-tight">Forgot password?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a reset link.
          </p>

          <form onSubmit={onSubmit} className="mt-8">
            <FieldGroup>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                <FieldError errors={[errors.email]} />
              </Field>

              <Button
                type="submit"
                size="lg"
                disabled={forgotPassword.isPending}
                className="mt-2"
              >
                {forgotPassword.isPending && <Loader2 className="size-4 animate-spin" />}
                Send reset link
              </Button>
            </FieldGroup>
          </form>
        </>
      )}
    </motion.div>
  );
}
