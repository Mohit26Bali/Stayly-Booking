export type Role = "GUEST" | "CUSTOMER" | "HOTEL_OWNER" | "ADMIN";

export interface AuthUserProfile {
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  profile: AuthUserProfile | null;
}
