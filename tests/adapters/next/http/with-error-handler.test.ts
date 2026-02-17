import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("../../../../adapters/next/init", () => ({
  ensureFoundationInitialized: vi.fn(),
}));

vi.mock("../../../../core/logger/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../../../../core/runtime/request-context.server", () => ({
  requestContext: {
    run: vi.fn((_ctx, fn) => fn()),
  },
}));

import { withErrorHandler } from "../../../../adapters/next/http/with-error-handler";
import { logger } from "../../../../core/logger/logger";
import { NotFoundError, ForbiddenError } from "../../../../errors/domain/domain-errors";
import { ValidationError } from "../../../../errors/domain/validation-error";
import { NetworkError } from "../../../../errors/transport/network-error";
import { UnexpectedError } from "../../../../errors/unexpected/unexpected-error";
import { HttpStatus } from "../../../../errors/transport/http-status";

describe("withErrorHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (opts: { url?: string; method?: string; headers?: Record<string, string> } = {}) => {
    const headers = new Headers(opts.headers);
    return {
      url: opts.url ?? "https://test.com/api/test",
      method: opts.method ?? "GET",
      headers: { get: (name: string) => headers.get(name) },
    } as unknown as NextRequest;
  };

  describe("Success path", () => {
    it("returns handler result", async () => {
      const data = { success: true };
      const handler = vi.fn().mockResolvedValue(NextResponse.json(data));
      const wrapped = withErrorHandler(handler);

      const response = await wrapped(createRequest());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(data);
      expect(handler).toHaveBeenCalled();
    });

    it("does not log on success", async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
      await withErrorHandler(handler)(createRequest());

      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe("thrown ApplicationError → correct HttpError", () => {
    it("UnexpectedError → 500", async () => {
      const handler = vi.fn().mockRejectedValue(new UnexpectedError({ cause: new Error("bug") }));
      const response = await withErrorHandler(handler)(createRequest());
      const body = await response.json();

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(body.code).toBe("UNEXPECTED_ERROR");
    });
  });

  describe("thrown InfrastructureError → 5xx", () => {
    it("NetworkError → 502", async () => {
      const handler = vi.fn().mockRejectedValue(new NetworkError("Connection failed"));
      const response = await withErrorHandler(handler)(createRequest());
      const body = await response.json();

      expect(response.status).toBe(HttpStatus.BAD_GATEWAY);
      expect(body.code).toBe("NETWORK_ERROR");
      expect(body.retryable).toBe(true);
    });
  });

  describe("thrown unknown Error → ApplicationError → mapped", () => {
    it("plain Error → 500 UnexpectedError", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("Random"));
      const response = await withErrorHandler(handler)(createRequest());
      const body = await response.json();

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(body.code).toBe("UNEXPECTED_ERROR");
    });

    it("string throw → 500", async () => {
      const handler = vi.fn().mockRejectedValue("string error");
      const response = await withErrorHandler(handler)(createRequest());

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe("Domain errors mapped correctly", () => {
    it("NotFoundError → 404", async () => {
      const handler = vi.fn().mockRejectedValue(new NotFoundError("User not found"));
      const response = await withErrorHandler(handler)(createRequest());
      const body = await response.json();

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(body.code).toBe("NOT_FOUND");
      expect(body.message).toBe("User not found");
    });

    it("ForbiddenError → 403", async () => {
      const handler = vi.fn().mockRejectedValue(new ForbiddenError("Access denied"));
      const response = await withErrorHandler(handler)(createRequest());
      const body = await response.json();

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
      expect(body.code).toBe("FORBIDDEN");
    });

    it("ValidationError → 422", async () => {
      const handler = vi.fn().mockRejectedValue(new ValidationError({ email: "Invalid" }));
      const response = await withErrorHandler(handler)(createRequest());
      const body = await response.json();

      expect(response.status).toBe(HttpStatus.UNPROCESSABLE_CONTENT);
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(body.meta).toEqual({ type: "VALIDATION", fields: { email: "Invalid" } });
    });
  });

  describe("requestId generated", () => {
    it("uses x-request-id from header", async () => {
      const handler = vi.fn().mockRejectedValue(new NotFoundError("Not found"));
      const response = await withErrorHandler(handler)(
        createRequest({ headers: { "x-request-id": "provided-id" } })
      );
      const body = await response.json();

      expect(body.requestId).toBe("provided-id");
    });

    it("generates requestId when not provided", async () => {
      const handler = vi.fn().mockRejectedValue(new NotFoundError("Not found"));
      const response = await withErrorHandler(handler)(createRequest());
      const body = await response.json();

      expect(body.requestId).toBeDefined();
      expect(body.requestId).toMatch(/[0-9a-f-]{8,}/);
    });
  });

  describe("Logging invoked", () => {
    it("logs error for infrastructure", async () => {
      const error = new NetworkError("Failed");
      const handler = vi.fn().mockRejectedValue(error);
      await withErrorHandler(handler)(createRequest());

      expect(logger.error).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          code: "NETWORK_ERROR",
          layer: "infrastructure",
        })
      );
    });

    it("logs warn for domain", async () => {
      const error = new NotFoundError("Missing");
      const handler = vi.fn().mockRejectedValue(error);
      await withErrorHandler(handler)(createRequest());

      expect(logger.warn).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          code: "NOT_FOUND",
          layer: "domain",
        })
      );
    });

    it("logs info for validation", async () => {
      const error = new ValidationError({ field: "error" });
      const handler = vi.fn().mockRejectedValue(error);
      await withErrorHandler(handler)(createRequest());

      expect(logger.info).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          code: "VALIDATION_ERROR",
          layer: "domain",
        })
      );
    });
  });

  describe("policy.shouldExpose = false → message stripped", () => {
    it("infrastructure error message is masked", async () => {
      const handler = vi.fn().mockRejectedValue(new NetworkError("postgres://user:secret@host"));
      const response = await withErrorHandler(handler)(createRequest());
      const body = await response.json();

      expect(body.message).toBe("Internal server error");
      expect(body.message).not.toContain("postgres");
      expect(body.message).not.toContain("secret");
    });

    it("application error message is masked", async () => {
      const handler = vi.fn().mockRejectedValue(new UnexpectedError({ cause: new Error("DB secret") }));
      const response = await withErrorHandler(handler)(createRequest());
      const body = await response.json();

      expect(body.message).toBe("Internal server error");
    });

    it("domain error message is exposed", async () => {
      const handler = vi.fn().mockRejectedValue(new NotFoundError("User not found"));
      const response = await withErrorHandler(handler)(createRequest());
      const body = await response.json();

      expect(body.message).toBe("User not found");
    });
  });
});
