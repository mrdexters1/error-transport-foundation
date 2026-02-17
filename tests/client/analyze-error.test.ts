import { describe, expect, it } from "vitest";
import { analyzeError, hasFieldErrors } from "../../client/ui-error";
import { ErrorCodes } from "../../errors/core/error-codes";
import type { ApiErrorResponse } from "../../errors/processing/api-error.types";

const createApiError = (
  overrides: Partial<ApiErrorResponse> = {}
): ApiErrorResponse => ({
  apiVersion: "1.0",
  timestamp: new Date().toISOString(),
  code: "TEST_ERROR",
  message: "Test error",
  status: 400,
  ...overrides,
});

describe("analyzeError", () => {
  describe("ErrorKind mapping", () => {
    it("maps 401 to AUTH", () => {
      const error = createApiError({ status: 401, code: ErrorCodes.UNAUTHORIZED });
      expect(analyzeError(error).kind).toBe("AUTH");
    });

    it("maps UNAUTHORIZED code to AUTH", () => {
      const error = createApiError({ code: ErrorCodes.UNAUTHORIZED });
      expect(analyzeError(error).kind).toBe("AUTH");
    });

    it("maps 403 to FORBIDDEN", () => {
      const error = createApiError({ status: 403, code: ErrorCodes.FORBIDDEN });
      expect(analyzeError(error).kind).toBe("FORBIDDEN");
    });

    it("maps 404 to NOT_FOUND", () => {
      const error = createApiError({ status: 404, code: ErrorCodes.NOT_FOUND });
      expect(analyzeError(error).kind).toBe("NOT_FOUND");
    });

    it("maps VALIDATION_ERROR to VALIDATION", () => {
      const error = createApiError({ code: ErrorCodes.VALIDATION_ERROR });
      expect(analyzeError(error).kind).toBe("VALIDATION");
    });

    it("maps 429 to RATE_LIMIT", () => {
      const error = createApiError({ status: 429 });
      expect(analyzeError(error).kind).toBe("RATE_LIMIT");
    });

    it("maps 502/503/504 to DEPENDENCY", () => {
      expect(analyzeError(createApiError({ status: 502 })).kind).toBe("DEPENDENCY");
      expect(analyzeError(createApiError({ status: 503 })).kind).toBe("DEPENDENCY");
      expect(analyzeError(createApiError({ status: 504 })).kind).toBe("DEPENDENCY");
    });

    it("maps infrastructure layer to DEPENDENCY", () => {
      const error = createApiError({ layer: "infrastructure", status: 500 });
      expect(analyzeError(error).kind).toBe("DEPENDENCY");
    });

    it("maps application layer to UNEXPECTED", () => {
      const error = createApiError({ layer: "application", status: 500 });
      expect(analyzeError(error).kind).toBe("UNEXPECTED");
    });

    it("maps other 4xx to DOMAIN", () => {
      const error = createApiError({ status: 409, code: "CONFLICT" });
      expect(analyzeError(error).kind).toBe("DOMAIN");
    });
  });

  describe("VALIDATION produces validationFields", () => {
    it("extracts fields from meta", () => {
      const error = createApiError({
        code: ErrorCodes.VALIDATION_ERROR,
        meta: {
          type: "VALIDATION",
          fields: { email: "Invalid", password: "Too short" },
        },
      });

      const ui = analyzeError(error);

      expect(ui.validationFields).toEqual({
        email: "Invalid",
        password: "Too short",
      });
    });

    it("returns null when no fields in meta", () => {
      const error = createApiError({ code: ErrorCodes.VALIDATION_ERROR });
      expect(analyzeError(error).validationFields).toBeNull();
    });

    it("hasFieldErrors returns true only when fields exist", () => {
      const withFields = analyzeError(
        createApiError({
          code: ErrorCodes.VALIDATION_ERROR,
          meta: { type: "VALIDATION", fields: { name: "Required" } },
        })
      );
      const withoutFields = analyzeError(
        createApiError({ code: ErrorCodes.VALIDATION_ERROR })
      );

      expect(hasFieldErrors(withFields)).toBe(true);
      expect(hasFieldErrors(withoutFields)).toBe(false);
    });
  });

  describe("RATE_LIMIT extracts retryAfter", () => {
    it("extracts rate limit info from meta", () => {
      const error = createApiError({
        status: 429,
        meta: { type: "RATE_LIMIT", retryAfter: 60, used: 100, limit: 100 },
      });

      const ui = analyzeError(error);

      expect(ui.kind).toBe("RATE_LIMIT");
      expect(ui.rateLimitInfo).toEqual({
        retryAfter: 60,
        used: 100,
        limit: 100,
      });
    });

    it("returns empty info for bare 429", () => {
      const error = createApiError({ status: 429 });
      const ui = analyzeError(error);

      expect(ui.kind).toBe("RATE_LIMIT");
      expect(ui.rateLimitInfo).toEqual({});
    });

    it("rate limit takes priority over other layers", () => {
      const error = createApiError({ status: 429, layer: "infrastructure" });
      expect(analyzeError(error).kind).toBe("RATE_LIMIT");
    });
  });

  describe("Unknown → UNEXPECTED", () => {
    it("maps 500 to UNEXPECTED", () => {
      const error = createApiError({ status: 500, code: ErrorCodes.UNEXPECTED_ERROR });
      expect(analyzeError(error).kind).toBe("UNEXPECTED");
    });

    it("maps unknown input to UNEXPECTED", () => {
      const ui = analyzeError(null, "Something went wrong");

      expect(ui.kind).toBe("UNEXPECTED");
      expect(ui.message).toBe("Something went wrong");
      expect(ui.status).toBe(500);
    });

    it("preserves retryable flag", () => {
      const error = createApiError({ retryable: true });
      expect(analyzeError(error).retryable).toBe(true);
    });

    it("defaults retryable to false", () => {
      const error = createApiError({});
      expect(analyzeError(error).retryable).toBe(false);
    });

    it("preserves requestId", () => {
      const error = createApiError({ requestId: "req-123" });
      expect(analyzeError(error).requestId).toBe("req-123");
    });
  });

  describe("includeRaw option", () => {
    it("excludes raw by default", () => {
      const error = createApiError({});
      const ui = analyzeError(error);

      expect(ui.raw).toBeUndefined();
    });

    it("includes raw when includeRaw is true", () => {
      const error = createApiError({ code: "TEST", message: "Test" });
      const ui = analyzeError(error, undefined, { includeRaw: true });

      expect(ui.raw).toBeDefined();
      expect(ui.raw?.code).toBe("TEST");
      expect(ui.raw?.message).toBe("Test");
    });
  });
});
