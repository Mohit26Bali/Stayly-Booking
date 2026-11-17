/** Prisma `select` fragment for exposing a user publicly — never includes passwordHash. */
export const publicUserSelect = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  profile: {
    select: {
      firstName: true,
      lastName: true,
      avatarUrl: true,
      phone: true,
    },
  },
} as const;
