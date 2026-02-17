import { describe, expect, it } from "vitest";
import { classifyError } from "../../../errors/processing/classify-error";
import { InfrastructureError } from "../../../errors/core/base-error";
import { NetworkError } from "../../../errors/transport/network-error";
import { UnexpectedError } from "../../../errors/unexpected/unexpected-error";
import { ValidationError } from "../../../errors/domain/validation-error";
import { NotFoundError } from "../../../errors/domain/domain-errors";
import { ErrorCodes } from "../../../errors/core/error-codes";

describe("classifyError", () => {
  describe("BaseError passed in → returns same instance", () => {
    it("returns ValidationError unchanged", () => {
      const error = new ValidationError({ email: "Invalid" });
      const result = classifyError(error);
      expect(result).toBe(error);
    });

    it("returns NotFoundError unchanged", () => {
      const error = new NotFoundError("Not found");
      const result = classifyError(error);
      expect(result).toBe(error);
    });

    it("returns NetworkError unchanged", () => {
      const error = new NetworkError("Connection failed");
      const result = classifyError(error);
      expect(result).toBe(error);
    });

    it("returns UnexpectedError unchanged", () => {
      const error = new UnexpectedError({ cause: new Error("bug") });
      const result = classifyError(error);
      expect(result).toBe(error);
    });
  });

  describe("Idempotency", () => {
    it("double classify returns same instance", () => {
      const error = new ValidationError({ email: "Invalid" });
      const once = classifyError(error);
      const twice = classifyError(once);
      expect(twice).toBe(error);
    });

    it("triple classify returns same instance", () => {
      const error = new NetworkError("Timeout");
      const result = classifyError(classifyError(classifyError(error)));
      expect(result).toBe(error);
    });
  });

  describe("Unknown Error → ApplicationError", () => {
    it("converts plain object to UnexpectedError", () => {
      const result = classifyError({ foo: "bar" });
      expect(result).toBeInstanceOf(UnexpectedError);
      expect(result.layer).toBe("application");
      expect(result.code).toBe(ErrorCodes.UNEXPECTED_ERROR);
    });

    it("converts string to UnexpectedError", () => {
      const result = classifyError("string error");
      expect(result).toBeInstanceOf(UnexpectedError);
      expect(result.layer).toBe("application");
      expect(result.code).toBe(ErrorCodes.UNEXPECTED_ERROR);
    });

    it("converts null to UnexpectedError", () => {
      const result = classifyError(null);
      expect(result).toBeInstanceOf(UnexpectedError);
      expect(result.code).toBe(ErrorCodes.UNEXPECTED_ERROR);
    });

    it("converts generic Error to UnexpectedError", () => {
      const result = classifyError(new Error("generic"));
      expect(result).toBeInstanceOf(UnexpectedError);
      expect(result.layer).toBe("application");
      expect(result.code).toBe(ErrorCodes.UNEXPECTED_ERROR);
    });
  });

  describe("InfrastructureError stays infrastructure", () => {
    it("preserves NetworkError layer and code", () => {
      const error = new NetworkError("Timeout");
      const result = classifyError(error);
      expect(result).toBeInstanceOf(InfrastructureError);
      expect(result.layer).toBe("infrastructure");
      expect(result.code).toBe(ErrorCodes.NETWORK_ERROR);
    });

    it("converts TypeError with fetch message to NetworkError", () => {
      const error = new TypeError("Failed to fetch");
      const result = classifyError(error);
      expect(result).toBeInstanceOf(NetworkError);
      expect(result.layer).toBe("infrastructure");
      expect(result.code).toBe(ErrorCodes.NETWORK_ERROR);
    });

    it("converts AbortError to NetworkError", () => {
      const error = Object.assign(new Error("Aborted"), { name: "AbortError" });
      const result = classifyError(error);
      expect(result).toBeInstanceOf(NetworkError);
      expect(result.code).toBe(ErrorCodes.NETWORK_ERROR);
    });

    it("converts ECONNREFUSED to NetworkError", () => {
      const error = Object.assign(new Error("Connection refused"), {
        code: "ECONNREFUSED",
      });
      const result = classifyError(error);
      expect(result).toBeInstanceOf(NetworkError);
      expect(result.code).toBe(ErrorCodes.NETWORK_ERROR);
    });
  });

  describe("ValidationError preserved", () => {
    it("preserves ValidationError with fields and code", () => {
      const error = new ValidationError({ email: "Invalid", name: "Required" });
      const result = classifyError(error);
      expect(result).toBe(error);
      expect(result.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect((result as ValidationError).fields).toEqual({
        email: "Invalid",
        name: "Required",
      });
    });
  });

  describe("cause preserved", () => {
    it("preserves cause in UnexpectedError", () => {
      const original = new Error("boom");
      const result = classifyError(original);
      expect(result.cause).toBe(original);
    });

    it("preserves cause in NetworkError from TypeError", () => {
      const original = new TypeError("Failed to fetch");
      const result = classifyError(original);
      expect(result.cause).toBe(original);
    });

    it("preserves cause in NetworkError from AbortError", () => {
      const original = Object.assign(new Error("Aborted"), { name: "AbortError" });
      const result = classifyError(original);
      expect(result.cause).toBe(original);
    });

    it("preserves cause in BaseError subclasses", () => {
      const cause = new Error("original");
      const error = new ValidationError({ field: "error" }, "msg", { cause });
      const result = classifyError(error);
      expect(result.cause).toBe(cause);
    });
  });

  describe("retryable flag preserved", () => {
    it("NetworkError is retryable", () => {
      const error = new NetworkError("Timeout");
      const result = classifyError(error);
      expect(result.retryable).toBe(true);
    });

    it("ValidationError is not retryable", () => {
      const error = new ValidationError({ field: "error" });
      const result = classifyError(error);
      expect(result.retryable).toBe(false);
    });

    it("UnexpectedError is not retryable", () => {
      const result = classifyError(new Error("unknown"));
      expect(result.retryable).toBe(false);
    });
  });
});
