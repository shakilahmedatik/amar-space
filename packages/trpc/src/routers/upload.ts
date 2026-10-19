import { deleteFile, getPresignedReadUrl, getPresignedUploadUrl } from "@omniheaven/storage";
import { z } from "zod";
import { protectedProcedure, requireRole, router } from "../trpc";

export const uploadRouter = router({
  // 1. Generate Presigned S3/SeaweedFS Upload URL
  getPresignedUrl: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/upload/presigned-url",
        tags: ["Storage"],
        summary: "Generate presigned PUT URL for direct client-to-storage upload",
      },
    })
    .input(
      z.object({
        fileName: z.string().min(1),
        fileType: z.string().min(1),
        folder: z.enum([
          "nid",
          "signatures",
          "contracts",
          "receipts",
          "photos",
          "maintenance",
          "hotel",
          "logos",
        ]),
      }),
    )
    .mutation(async ({ input }) => {
      const res = await getPresignedUploadUrl(input.folder, input.fileName, input.fileType);
      return {
        uploadUrl: res.uploadUrl,
        publicUrl: res.publicUrl,
        fileKey: res.fileKey,
      };
    }),

  // 2. Generate Presigned Read URL for sensitive/private files
  getReadUrl: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/upload/read-url",
        tags: ["Storage"],
        summary: "Generate signed GET URL for time-limited read access",
      },
    })
    .input(
      z.object({
        fileKey: z.string().min(1),
        expiresInSeconds: z.number().int().min(60).max(86400).default(3600),
      }),
    )
    .query(async ({ input }) => {
      const readUrl = await getPresignedReadUrl(input.fileKey, input.expiresInSeconds);
      return { readUrl };
    }),

  // 3. Delete file from storage
  deleteFile: requireRole(["owner", "admin", "manager"])
    .meta({
      openapi: {
        method: "DELETE",
        path: "/v1/upload/file",
        tags: ["Storage"],
        summary: "Delete file from storage bucket",
      },
    })
    .input(z.object({ fileKey: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await deleteFile(input.fileKey);
      return { success: true };
    }),
});
