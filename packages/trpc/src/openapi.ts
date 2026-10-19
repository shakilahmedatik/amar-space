import type { AnyRouter } from "@trpc/server";
import { appRouter } from "./routers/app";

export interface OpenApiInfo {
  title: string;
  version: string;
  description?: string;
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
}

export interface OpenApiServer {
  url: string;
  description?: string;
}

export interface GenerateOpenApiDocumentOptions {
  router?: AnyRouter;
  info?: OpenApiInfo;
  servers?: OpenApiServer[];
}

interface ProcedureWithMeta {
  _def: {
    inputs?: Array<{
      toJSONSchema?: (options?: { unrepresentable?: string }) => Record<string, unknown>;
    }>;
    meta?: {
      openapi?: {
        method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
        path: string;
        tags?: string[];
        summary?: string;
        description?: string;
        deprecated?: boolean;
      };
    };
  };
}

/**
 * Generates an OpenAPI 3.1.0 specification document from the tRPC router procedures.
 */
export function generateOpenApiDocument(options?: GenerateOpenApiDocumentOptions) {
  const router = options?.router ?? appRouter;
  const procedures = (router._def as { procedures: Record<string, ProcedureWithMeta> }).procedures;

  const doc: Record<string, unknown> = {
    openapi: "3.1.0",
    info: options?.info ?? {
      title: "omniHeaven API",
      version: "1.0.0",
      description:
        "High-performance API Gateway for omniHeaven PMS & Commercial Real Estate SaaS platform.",
      contact: {
        name: "omniHeaven API Engineering",
        email: "support@omniheaven.com",
      },
    },
    servers: options?.servers ?? [
      {
        url: "/",
        description: "Current Host API Gateway",
      },
    ],
    paths: {} as Record<string, Record<string, unknown>>,
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "better-auth.session_token",
          description: "Better Auth session cookie",
        },
        organizationHeader: {
          type: "apiKey",
          in: "header",
          name: "x-organization-id",
          description: "Active tenant organization UUID",
        },
      },
    },
  };

  const paths = doc.paths as Record<string, Record<string, unknown>>;

  for (const [procKey, proc] of Object.entries(procedures)) {
    const meta = proc._def.meta?.openapi;
    if (!meta) continue;

    const method = meta.method.toLowerCase();
    const path = meta.path;

    if (!paths[path]) {
      paths[path] = {};
    }

    const pathItem = paths[path];

    // Extract path parameters from route template: /path/{paramId}
    const pathParams: Array<{
      name: string;
      in: string;
      required: boolean;
      schema: { type: string };
    }> = [];

    const pathMatches = path.match(/\{([^}]+)\}/g);
    if (pathMatches) {
      for (const m of pathMatches) {
        const paramName = m.slice(1, -1);
        pathParams.push({
          name: paramName,
          in: "path",
          required: true,
          schema: { type: "string" },
        });
      }
    }

    let inputSchemaObj: Record<string, unknown> | null = null;
    if (proc._def.inputs && proc._def.inputs.length > 0 && proc._def.inputs[0]?.toJSONSchema) {
      try {
        inputSchemaObj = proc._def.inputs[0].toJSONSchema({ unrepresentable: "any" });
      } catch {
        inputSchemaObj = null;
      }
    }

    const queryParams: Array<Record<string, unknown>> = [];
    let requestBody: Record<string, unknown> | undefined;

    if (method === "get" || method === "delete") {
      if (inputSchemaObj && typeof inputSchemaObj === "object") {
        const properties =
          (inputSchemaObj.properties as Record<string, Record<string, unknown>>) || {};
        const requiredFields = (inputSchemaObj.required as string[]) || [];

        for (const [propName, propDef] of Object.entries(properties)) {
          // If already in path, skip query param
          if (pathParams.some((p) => p.name === propName)) continue;

          queryParams.push({
            name: propName,
            in: "query",
            required: requiredFields.includes(propName),
            schema: propDef,
          });
        }
      }
    } else {
      if (inputSchemaObj) {
        requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: inputSchemaObj,
            },
          },
        };
      }
    }

    const operation: Record<string, unknown> = {
      operationId: procKey.replace(".", "_"),
      summary: meta.summary ?? procKey,
      description: meta.description,
      tags: meta.tags ?? ["General"],
      parameters: [...pathParams, ...queryParams],
      responses: {
        "200": {
          description: "Successful response",
          content: {
            "application/json": {
              schema: {
                type: "object",
              },
            },
          },
        },
        "400": { description: "Validation error or domain invariant violation" },
        "401": { description: "Unauthenticated" },
        "403": { description: "Forbidden or quota exceeded" },
        "404": { description: "Resource not found" },
        "429": { description: "Rate limit exceeded" },
        "500": { description: "Internal server error" },
      },
    };

    if (requestBody) {
      operation.requestBody = requestBody;
    }

    if (meta.deprecated) {
      operation.deprecated = true;
    }

    // Require auth headers/cookies for non-public routes
    if (!meta.tags?.includes("Public") && !meta.tags?.includes("System")) {
      operation.security = [{ cookieAuth: [] }, { organizationHeader: [] }];
    }

    pathItem[method] = operation;
  }

  return doc;
}
