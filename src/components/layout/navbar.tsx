"use client";

import Link from "next/link";
import { Building2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { useAuthStore } from "@/features/auth/store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV_LINKS = [
  { href: "/search", label: "Explore stays" },
  { href: "/offers", label: "Offers" },
];

export function Navbar() {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="size-4" />
          </span>
          Stayly
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href="/host" />}>
            List your property
          </Button>
          {user && (
            <Button variant="ghost" render={<Link href="/messages" />}>
              Messages
            </Button>
          )}
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>

        <div className="flex md:hidden items-center gap-1">
          <ThemeToggle />
          {user && <NotificationBell />}
          <Sheet>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" aria-label="Open menu" />}
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
                {user && (
                  <Link
                    href="/messages"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Messages
                  </Link>
                )}
                <div className="mt-4 flex flex-col gap-2">
                  <Button variant="outline" render={<Link href="/host" />}>
                    List your property
                  </Button>
                  {user ? (
                    <UserMenu />
                  ) : (
                    <>
                      <Button variant="outline" render={<Link href="/login" />}>
                        Log in
                      </Button>
                      <Button render={<Link href="/register" />}>Sign up</Button>
                    </>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
