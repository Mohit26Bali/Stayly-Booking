"use client";

import Link from "next/link";
import { LayoutDashboard, LifeBuoy, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/features/auth/store";
import { useLogout } from "@/features/auth/hooks/use-auth";
import { toast } from "sonner";

const DASHBOARD_PATH: Record<string, string> = {
  ADMIN: "/dashboard/admin",
  HOTEL_OWNER: "/dashboard/owner",
  CUSTOMER: "/dashboard/customer",
  GUEST: "/dashboard/customer",
};

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  if (!user) {
    return (
      <>
        <Button variant="ghost" render={<Link href="/login" />}>
          Log in
        </Button>
        <Button render={<Link href="/register" />}>Sign up</Button>
      </>
    );
  }

  const initials = user.profile?.firstName
    ? `${user.profile.firstName[0]}${user.profile.lastName?.[0] ?? ""}`.toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-border p-1 pr-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Avatar className="size-7">
              <AvatarImage src={user.profile?.avatarUrl ?? undefined} alt={user.email} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            {user.email}
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem render={<Link href={DASHBOARD_PATH[user.role]} />}>
          <LayoutDashboard className="size-4" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/account/profile" />}>
          <UserIcon className="size-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/support" />}>
          <LifeBuoy className="size-4" />
          Support
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={async () => {
            await logout.mutateAsync();
            toast.success("Logged out");
          }}
        >
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
