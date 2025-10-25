import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getUnresolvedAlerts, getAlertsByPartner, resolveAlert } from "./db";
import { dataRouter } from "./routers/data";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  data: dataRouter,

  alerts: router({
    getUnresolved: protectedProcedure.query(() => getUnresolvedAlerts(100)),
    getByPartner: protectedProcedure
      .input(z.object({ partnerId: z.string() }))
      .query(({ input }) => getAlertsByPartner(input.partnerId)),
    resolve: protectedProcedure
      .input(z.object({ alertId: z.number() }))
      .mutation(({ input }) => resolveAlert(input.alertId)),
  })
});

export type AppRouter = typeof appRouter;
