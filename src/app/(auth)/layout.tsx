import Link from "next/link";
import { Building2, ShieldCheck, Sparkles, Star } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-secondary lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/40 via-secondary to-secondary"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-accent/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-primary/30 blur-3xl"
        />

        <Link
          href="/"
          className="relative z-10 flex items-center gap-2 text-lg font-semibold text-secondary-foreground"
        >
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="size-4" />
          </span>
          Stayly
        </Link>

        <div className="relative z-10 max-w-md">
          <div className="mb-6 flex gap-1 text-accent">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-4 fill-current" />
            ))}
          </div>
          <p className="text-2xl font-medium leading-relaxed text-secondary-foreground text-balance">
            &ldquo;Booking my stay took less than two minutes, and the whole
            experience felt effortless.&rdquo;
          </p>
          <p className="mt-4 text-sm text-secondary-foreground/60">
            Trusted by thousands of travelers worldwide
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-sm text-secondary-foreground/70">
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-success" />
            Secure by design
          </span>
          <span className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent" />
            Premium stays
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
