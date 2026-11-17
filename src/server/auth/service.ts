import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db/client";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/server/auth/jwt";
import { generateRawToken, hashToken } from "@/server/auth/tokens";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/server/email/resend";
import type { RegisterInput, LoginInput } from "@/features/auth/schemas/auth.schema";
import type { User } from "@/generated/prisma/client";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30d

// A real bcrypt hash (made once, on first use) that is compared against when the account does not exist.
let dummyHash: Promise<string> | undefined;
const getDummyPasswordHash = () => (dummyHash ??= hashPassword(randomUUID()));

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number = 400,
  ) {
    super(message);
  }
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PublicUserProfile {
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export type PublicUser = Omit<User, "passwordHash"> & { profile: PublicUserProfile | null };

const profileSelect = { select: { firstName: true, lastName: true, avatarUrl: true } } as const;

function toPublicUser(user: User & { profile?: PublicUserProfile | null }): PublicUser {
  const { passwordHash: _passwordHash, profile, ...rest } = user;
  return { ...rest, profile: profile ?? null };
}

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  const existing = await prisma.user.findFirst({
    where: { email: { equals: input.email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    throw new AuthError("An account with this email already exists", 409);
  }

  const passwordHash = await hashPassword(input.password);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        profile: {
          create: {
            firstName: input.firstName,
            lastName: input.lastName,
          },
        },
      },
      include: { profile: profileSelect },
    });
  } catch (error) {
    // Two sign-ups with the same address at the same moment: the unique constraint decides, politely.
    if ((error as { code?: string }).code === "P2002") {
      throw new AuthError("An account with this email already exists", 409);
    }
    throw error;
  }

  await issueEmailVerification(user.id, user.email);

  return toPublicUser(user);
}

export async function issueEmailVerification(userId: string, email: string) {
  const rawToken = generateRawToken();
  await prisma.verificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    },
  });
  await sendVerificationEmail(email, rawToken);
}

export async function verifyEmailToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AuthError("This verification link is invalid or has expired", 400);
  }

  await prisma.$transaction(async (tx) => {
    // Claiming the token inside the UPDATE makes a link usable exactly once even if opened twice at once.
    const claimed = await tx.verificationToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) throw new AuthError("This verification link is invalid or has expired", 400);
    await tx.user.update({ where: { id: record.userId }, data: { emailVerified: true } });
  });
}

export async function authenticateUser(input: LoginInput): Promise<PublicUser> {
  const user = await prisma.user.findFirst({
    where: { email: { equals: input.email, mode: "insensitive" } },
    include: { profile: profileSelect },
  });

  if (!user || !user.passwordHash) {
    // Still spend the time of a password check, so response time doesn't reveal which e-mails are registered.
    await verifyPassword(input.password, await getDummyPasswordHash());
    throw new AuthError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new AuthError("This account has been suspended", 403);
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new AuthError("Invalid email or password", 401);
  }

  return toPublicUser(user);
}

export async function issueAuthTokens(user: PublicUser): Promise<AuthTokens> {
  const jti = randomUUID();
  const refreshToken = signRefreshToken({ sub: user.id, jti });

  await prisma.refreshToken.create({
    data: {
      id: jti,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });

  return { accessToken, refreshToken };
}

export async function rotateRefreshToken(rawRefreshToken: string): Promise<AuthTokens> {
  const payload = verifyRefreshToken(rawRefreshToken);
  if (!payload) {
    throw new AuthError("Invalid or expired session", 401);
  }

  const record = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });

  if (
    !record ||
    record.revoked ||
    record.expiresAt < new Date() ||
    record.tokenHash !== hashToken(rawRefreshToken)
  ) {
    throw new AuthError("Invalid or expired session", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: record.userId },
    include: { profile: profileSelect },
  });
  if (!user || !user.isActive) {
    throw new AuthError("Invalid or expired session", 401);
  }

  // Claim the old token inside the UPDATE: of two simultaneous refreshes with the same token only one wins.
  const claimed = await prisma.refreshToken.updateMany({
    where: { id: record.id, revoked: false },
    data: { revoked: true },
  });
  if (claimed.count !== 1) throw new AuthError("Invalid or expired session", 401);

  return issueAuthTokens(toPublicUser(user));
}

export async function revokeRefreshToken(rawRefreshToken: string): Promise<void> {
  const payload = verifyRefreshToken(rawRefreshToken);
  if (!payload) return;

  await prisma.refreshToken
    .update({ where: { id: payload.jti }, data: { revoked: true } })
    .catch(() => undefined);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  // Always resolve without leaking whether the account exists.
  if (!user || !user.passwordHash) return;

  const rawToken = generateRawToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  await sendPasswordResetEmail(user.email, rawToken);
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AuthError("This reset link is invalid or has expired", 400);
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) throw new AuthError("This reset link is invalid or has expired", 400);
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    // Signing everyone out of the account is the point of a reset after a suspected break-in.
    await tx.refreshToken.updateMany({ where: { userId: record.userId, revoked: false }, data: { revoked: true } });
  });
}

export async function getPublicUserById(userId: string): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: profileSelect },
  });
  return user ? toPublicUser(user) : null;
}
