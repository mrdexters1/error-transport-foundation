import { describe, expect, it } from "vitest";
import { mapToHttpError } from "../../../errors/processing/http-mapper";
import { getErrorPolicy } from "../../../errors/processing/error-policy";
import { ValidationError } from "../../../errors/domain/validation-error";
import {
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
} from "../../../errors/domain/domain-errors";
import { NetworkError } from "../../../errors/transport/network-error";
import { UnexpectedError } from "../../../errors/unexpected/unexpected-error";
import { HttpStatus } from "../../../errors/transport/http-status";

describe("mapToHttpError", () => {
  describe("Domain → 4xx", () => {
    it("maps NotFoundError to 404", () => {
      const error = new NotFoundError("User not found");
      const policy = getErrorPolicy(error);
      const httpError = mapToHttpError(error, policy);

      expect(httpError.status).toBe(HttpStatus.NOT_FOUND);
      expect(httpError.code).toBe("NOT_FOUND");
    });

    it("maps ForbiddenError to 403", () => {
      const error = new ForbiddenError("Access denied");
      const policy = getErrorPolicy(error);
      const httpError = mapToHttpError(error, policy);

      expect(httpError.status).toBe(HttpStatus.FORBIDDEN);
      expect(httpError.code).toBe("FORBIDDEN");
    });

    it("maps UnauthorizedError to 401", () => {
      const error = new UnauthorizedError("Not logged in");
      const policy = getErrorPolicy(error);
      const httpError = mapToHttpError(error, policy);

      expect(httpError.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(httpError.code).toBe("UNAUTHORIZED");
    });

    it("exposes domain error message", () => {
      const error = new NotFoundError("Resource missing");
      const policy = getErrorPolicy(error);
      const httpError = mapToHttpError(error, policy);

      expect(httpError.expose).toBe(true);
      expect(httpError.message).toBe("Resource missing");
    });
  });

  describe("Infrastructure → 5xx", () => {
    it("maps NetworkError to 502", () => {
      const error = new NetworkError("Connection failed");
      const policy = getErrorPolicy(error);
      const httpError = mapToHttpError(error, policy);

      expect(httpError.status).toBe(HttpStatus.BAD_GATEWAY);
      expect(httpError.code).toBe("NETWORK_ERROR");
    });

    it("does not expose infrastructure message", () => {
      const error = new NetworkError("postgres://user:pass@host");
      const policy = getErrorPolicy(error);
      const httpError = mapToHttpError(error, policy);

      expect(httpError.expose).toBe(false);
      expect(httpError.message).toBe("Internal server error");
    });

    it("maps UnexpectedError to 500", () => {
      const error = new UnexpectedError({ cause: new Error("bug") });
      const policy = getErrorPolicy(error);
      const httpError = mapToHttpError(error, policy);

      expect(httpError.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(httpError.code).toBe("UNEXPECTED_ERROR");
    });
  });

  describe("Validation → 422", () => {
    it("maps ValidationError to 422", () => {
      const error = new ValidationError({ email: "Invalid" });
      const policy = getErrorPolicy(error);
      const httpError = mapToHttpError(error, policy);

      expect(httpError.status).toBe(HttpStatus.UNPROCESSABLE_CONTENT);
      expect(httpError.code).toBe("VALIDATION_ERROR");
    });

    it("includes fields in meta", () => {
      const fields = { email: "Invalid", password: "Too short" };
      const error = new ValidationError(fields);
      const policy = getErrorPolicy(error);
      const httpError = mapToHttpError(error, policy);

      expect(httpError.meta).toEqual({ type: "VALIDATION", fields });
    });

    it("exposes validation message", () => {
      const error = new ValidationError({ email: "Invalid" }, "Validation failed");
      const policy = getErrorPolicy(error);
      const httpError = mapToHttpError(error, policy);

      expect(httpError.expose).toBe(true);
      expect(httpError.message).toBe("Validation failed");
    });
  });

  describe("policy.shouldExpose controls message", () => {
    it("ValidationError policy allows exposure", () => {
      const error = new ValidationError({ email: "Invalid" });
      const policy = getErrorPolicy(error);

      expect(policy.shouldExpose).toBe(true);
    });

    it("NetworkError policy denies exposure", () => {
      const error = new NetworkError("secret connection string");
      const policy = getErrorPolicy(error);

      expect(policy.shouldExpose).toBe(false);

      const httpError = mapToHttpError(error, policy);
      expect(httpError.message).toBe("Internal server error");
      expect(httpError.message).not.toContain("secret");
    });

    it("UnexpectedError policy denies exposure", () => {
      const error = new UnexpectedError({ cause: new Error("internal bug") });
      const policy = getErrorPolicy(error);

      expect(policy.shouldExpose).toBe(false);

      const httpError = mapToHttpError(error, policy);
      expect(httpError.message).toBe("Internal server error");
    });

    it("domain error policy allows exposure", () => {
      const error = new NotFoundError("User not found");
      const policy = getErrorPolicy(error);

      expect(policy.shouldExpose).toBe(true);

      const httpError = mapToHttpError(error, policy);
      expect(httpError.message).toBe("User not found");
    });
  });

  describe("layer/retryable preserved", () => {
    it("preserves domain layer", () => {
      const error = new NotFoundError("Missing");
      const policy = getErrorPolicy(error);
      const httpError = mapToHttpError(error, policy);

      expect(httpError.layer).toBe("domain");
    });

    it("preserves infrastructure layer", () => {
      const error = new NetworkError("Timeout");
      const policy = getErrorPolicy(error);
      const httpError = mapToHttpError(error, policy);

      expect(httpError.layer).toBe("infrastructure");
    });

    it("preserves retryable=true", () => {
      const error = new NetworkError("Timeout");
      const policy = getErrorPolicy(error);
      const httpError = mapToHttpError(error, policy);

      expect(httpError.retryable).toBe(true);
    });

    it("preserves retryable=false", () => {
      const error = new NotFoundError("Missing");
      const policy = getErrorPolicy(error);
      const httpError = mapToHttpError(error, policy);

      expect(httpError.retryable).toBe(false);
    });
  });
});
