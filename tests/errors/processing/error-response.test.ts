import { describe, expect, it } from "vitest";
import {
  toApiErrorResponse,
  isApiErrorResponse,
} from "../../../errors/processing/error-response";
import { HttpError } from "../../../errors/processing/http-error";
import { HttpStatus } from "../../../errors/transport/http-status";

describe("toApiErrorResponse", () => {
  describe("ApiErrorResponse shape", () => {
    it("returns all required fields", () => {
      const httpError = new HttpError({
        code: "NOT_FOUND",
        status: HttpStatus.NOT_FOUND,
        message: "User not found",
        expose: true,
        layer: "domain",
        retryable: false,
      });

      const response = toApiErrorResponse(httpError, "req-123");

      expect(response.apiVersion).toBe("1.0");
      expect(response.code).toBe("NOT_FOUND");
      expect(response.message).toBe("User not found");
      expect(response.status).toBe(404);
      expect(response.layer).toBe("domain");
      expect(response.retryable).toBe(false);
    });

    it("timestamp is valid ISO date", () => {
      const httpError = new HttpError({
        code: "TEST",
        status: 400,
        message: "Test",
        expose: true,
        layer: "domain",
        retryable: false,
      });

      const response = toApiErrorResponse(httpError);

      expect(typeof response.timestamp).toBe("string");
      expect(new Date(response.timestamp).toString()).not.toBe("Invalid Date");
    });

    it("includes meta when present and exposed", () => {
      const fields = { email: "Invalid" };
      const httpError = new HttpError({
        code: "VALIDATION_ERROR",
        status: HttpStatus.UNPROCESSABLE_CONTENT,
        message: "Invalid input",
        expose: true,
        layer: "domain",
        retryable: false,
        meta: { type: "VALIDATION", fields },
      });

      const response = toApiErrorResponse(httpError);

      expect(response.meta).toEqual({ type: "VALIDATION", fields });
    });
  });

  describe("requestId attached", () => {
    it("attaches provided requestId", () => {
      const httpError = new HttpError({
        code: "TEST",
        status: 400,
        message: "Test",
        expose: true,
        layer: "domain",
        retryable: false,
      });

      const response = toApiErrorResponse(httpError, "unique-id-123");

      expect(response.requestId).toBe("unique-id-123");
    });

    it("allows undefined requestId", () => {
      const httpError = new HttpError({
        code: "TEST",
        status: 400,
        message: "Test",
        expose: true,
        layer: "domain",
        retryable: false,
      });

      const response = toApiErrorResponse(httpError);

      expect(response.requestId).toBeUndefined();
    });
  });

  describe("No internal fields leaked", () => {
    it("masks message when expose=false", () => {
      const httpError = new HttpError({
        code: "NETWORK_ERROR",
        status: HttpStatus.BAD_GATEWAY,
        message: "postgres://user:secret@host/db",
        expose: false,
        layer: "infrastructure",
        retryable: true,
      });

      const response = toApiErrorResponse(httpError);

      expect(response.message).toBe("Internal server error");
      expect(response.message).not.toContain("postgres");
      expect(response.message).not.toContain("secret");
    });

    it("excludes meta when expose=false", () => {
      const httpError = new HttpError({
        code: "UNEXPECTED_ERROR",
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Internal",
        expose: false,
        layer: "application",
        retryable: false,
        meta: { type: "VALIDATION", fields: { internal: "data" } },
      });

      const response = toApiErrorResponse(httpError);

      expect(response.meta).toBeUndefined();
    });

    it("preserves code for logging even when not exposed", () => {
      const httpError = new HttpError({
        code: "DB_CONNECTION_FAILED",
        status: 500,
        message: "Secret connection string",
        expose: false,
        layer: "infrastructure",
        retryable: false,
      });

      const response = toApiErrorResponse(httpError);

      expect(response.code).toBe("DB_CONNECTION_FAILED");
      expect(response.message).toBe("Internal server error");
    });

    it("preserves retryable when expose=false", () => {
      const httpError = new HttpError({
        code: "NETWORK_ERROR",
        status: HttpStatus.BAD_GATEWAY,
        message: "Internal connection error",
        expose: false,
        layer: "infrastructure",
        retryable: true,
      });

      const response = toApiErrorResponse(httpError);

      expect(response.retryable).toBe(true);
      expect(response.message).toBe("Internal server error");
    });
  });
});

describe("isApiErrorResponse", () => {
  it("returns true for valid response", () => {
    const valid = {
      apiVersion: "1.0",
      timestamp: new Date().toISOString(),
      code: "NOT_FOUND",
      message: "Not found",
      status: 404,
    };

    expect(isApiErrorResponse(valid)).toBe(true);
  });

  it("returns false for invalid objects", () => {
    expect(isApiErrorResponse(null)).toBe(false);
    expect(isApiErrorResponse(undefined)).toBe(false);
    expect(isApiErrorResponse({ code: "TEST" })).toBe(false);
    expect(isApiErrorResponse({ apiVersion: "2.0" })).toBe(false);
  });
});
