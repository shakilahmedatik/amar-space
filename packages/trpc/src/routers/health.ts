import { publicProcedure, router } from "../trpc";

export const healthRouter = router({
  check: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/health",
        tags: ["System"],
        summary: "API health and liveness probe",
      },
    })
    .query(async ({ ctx }) => {
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
      };
    }),
});
