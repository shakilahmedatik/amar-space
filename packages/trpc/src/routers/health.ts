import { publicProcedure, router } from "../trpc";

export const healthRouter = router({
  check: publicProcedure.query(async ({ ctx }) => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
    };
  }),
});
