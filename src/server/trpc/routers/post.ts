import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";

export const postRouter = createTRPCRouter({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.post.findMany({
      where: { authorId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ),

  create: protectedProcedure
    .input(z.object({ title: z.string().min(1).max(140) }))
    .mutation(({ ctx, input }) =>
      ctx.db.post.create({
        data: { title: input.title, authorId: ctx.session.user.id },
      }),
    ),
});
