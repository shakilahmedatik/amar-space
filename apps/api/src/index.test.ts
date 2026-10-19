import { describe, expect, it } from "bun:test";
import app from "./index";

describe("API Gateway HTTP Server", () => {
  it("serves health check endpoint with ok status", async () => {
    const res = await app.fetch(new Request("http://localhost:3001/health"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; service: string };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("omniheaven-api");
  });

  it("applies OWASP secure headers", async () => {
    const res = await app.fetch(new Request("http://localhost:3001/health"));
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("serves valid OpenAPI 3.1.0 specification document", async () => {
    const res = await app.fetch(new Request("http://localhost:3001/api/openapi.json"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");

    const spec = (await res.json()) as {
      openapi: string;
      info: { title: string; version: string };
      paths: Record<string, unknown>;
    };

    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toBe("omniHeaven API");
    expect(Object.keys(spec.paths).length).toBeGreaterThan(50);
  });

  it("serves interactive Scalar API reference documentation", async () => {
    const res = await app.fetch(new Request("http://localhost:3001/api/docs"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("Scalar");
  });

  it("enforces body limit on excessively large payloads", async () => {
    const hugeString = "a".repeat(6 * 1024 * 1024); // 6MB payload
    const res = await app.fetch(
      new Request("http://localhost:3001/trpc/health.ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ huge: hugeString }),
      }),
    );
    expect(res.status).toBe(413);
  });
});
