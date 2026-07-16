import { apiHandler, ok } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const GET = apiHandler(async () => {
  const auth = await requireUser();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: auth.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      currency: true,
      locale: true,
      decimalFormat: true,
      theme: true,
      initialBankroll: true,
      createdAt: true,
      subscription: {
        select: {
          status: true,
          plan: { select: { name: true, slug: true, maxEntries: true } },
        },
      },
    },
  });

  return ok({
    ...user,
    initialBankroll: Number(user.initialBankroll),
  });
});
