import { describe, expect, it, vi } from "vitest";
import { applyFormErrors, type UiError } from "../../client/ui-error";

const createMockForm = () => ({
  setError: vi.fn(),
  clearErrors: vi.fn(),
  formState: { errors: {} },
});

const createUiError = (overrides: Partial<UiError> = {}): UiError => ({
  code: "TEST_ERROR",
  status: 400,
  message: "Test error",
  kind: "DOMAIN",
  retryable: false,
  validationFields: null,
  rateLimitInfo: null,
  ...overrides,
});

describe("applyFormErrors", () => {
  describe("VALIDATION with fields → setError on fields", () => {
    it("applies each field error", () => {
      const form = createMockForm();
      const ui = createUiError({
        kind: "VALIDATION",
        validationFields: { email: "Invalid email", name: "Required" },
      });

      applyFormErrors(ui, form as any);

      expect(form.setError).toHaveBeenCalledWith("email", { message: "Invalid email" });
      expect(form.setError).toHaveBeenCalledWith("name", { message: "Required" });
      expect(form.setError).toHaveBeenCalledTimes(2);
    });
  });

  describe("VALIDATION without fields → root", () => {
    it("applies to root when no field errors", () => {
      const form = createMockForm();
      const ui = createUiError({
        kind: "VALIDATION",
        message: "Form is invalid",
        validationFields: null,
      });

      applyFormErrors(ui, form as any);

      expect(form.setError).toHaveBeenCalledWith("root", { message: "Form is invalid" });
    });

    it("treats empty validationFields object as root", () => {
      const form = createMockForm();
      const ui = createUiError({
        kind: "VALIDATION",
        validationFields: {},
        message: "Invalid",
      });

      applyFormErrors(ui, form as any);

      expect(form.setError).toHaveBeenCalledWith("root", { message: "Invalid" });
    });
  });

  describe("AUTH → root", () => {
    it("applies AUTH to root by default", () => {
      const form = createMockForm();
      const ui = createUiError({
        kind: "AUTH",
        message: "Session expired",
      });

      applyFormErrors(ui, form as any);

      expect(form.setError).toHaveBeenCalledWith("root", { message: "Session expired" });
    });
  });

  describe("applyAuthErrors === false → AUTH skipped", () => {
    it("returns false and does not set error", () => {
      const form = createMockForm();
      const ui = createUiError({
        kind: "AUTH",
        message: "Session expired",
      });

      const result = applyFormErrors(ui, form as any, { applyAuthErrors: false });

      expect(result).toBe(false);
      expect(form.setError).not.toHaveBeenCalled();
    });
  });

  describe("ALWAYS_ROOT_KINDS behavior", () => {
    it("DEPENDENCY → root", () => {
      const form = createMockForm();
      const ui = createUiError({
        kind: "DEPENDENCY",
        message: "Service unavailable",
      });

      applyFormErrors(ui, form as any);

      expect(form.setError).toHaveBeenCalledWith("root", { message: "Service unavailable" });
    });

    it("RATE_LIMIT → root", () => {
      const form = createMockForm();
      const ui = createUiError({
        kind: "RATE_LIMIT",
        message: "Too many requests",
      });

      applyFormErrors(ui, form as any);

      expect(form.setError).toHaveBeenCalledWith("root", { message: "Too many requests" });
    });

    it("UNEXPECTED → root", () => {
      const form = createMockForm();
      const ui = createUiError({
        kind: "UNEXPECTED",
        message: "An error occurred",
      });

      applyFormErrors(ui, form as any);

      expect(form.setError).toHaveBeenCalledWith("root", { message: "An error occurred" });
    });
  });

  describe("fieldMap mapping", () => {
    it("maps server fields to form fields", () => {
      const form = createMockForm();
      const ui = createUiError({
        kind: "VALIDATION",
        validationFields: {
          email_address: "Invalid email",
          full_name: "Required",
        },
      });

      applyFormErrors(ui, form as any, {
        fieldMap: {
          email_address: "email",
          full_name: "name",
        } as any,
      });

      expect(form.setError).toHaveBeenCalledWith("email", { message: "Invalid email" });
      expect(form.setError).toHaveBeenCalledWith("name", { message: "Required" });
    });

    it("uses original field when no mapping", () => {
      const form = createMockForm();
      const ui = createUiError({
        kind: "VALIDATION",
        validationFields: { unmapped: "Error" },
      });

      applyFormErrors(ui, form as any, { fieldMap: {} });

      expect(form.setError).toHaveBeenCalledWith("unmapped", { message: "Error" });
    });
  });

  describe("DOMAIN/NOT_FOUND/FORBIDDEN use fallbackField", () => {
    it("uses fallbackField for DOMAIN", () => {
      const form = createMockForm();
      const ui = createUiError({
        kind: "DOMAIN",
        message: "Email already taken",
      });

      applyFormErrors(ui, form as any, { fallbackField: "email" as any });

      expect(form.setError).toHaveBeenCalledWith("email", { message: "Email already taken" });
    });

    it("uses root when no fallbackField", () => {
      const form = createMockForm();
      const ui = createUiError({
        kind: "NOT_FOUND",
        message: "Resource not found",
      });

      applyFormErrors(ui, form as any);

      expect(form.setError).toHaveBeenCalledWith("root", { message: "Resource not found" });
    });

    it("uses custom rootKey", () => {
      const form = createMockForm();
      const ui = createUiError({
        kind: "UNEXPECTED",
        message: "Error",
      });

      applyFormErrors(ui, form as any, { rootKey: "root.server" });

      expect(form.setError).toHaveBeenCalledWith("root.server", { message: "Error" });
    });
  });

  describe("return value contract", () => {
    it("returns true when error applied", () => {
      const form = createMockForm();
      const ui = createUiError({ kind: "DOMAIN" });

      const result = applyFormErrors(ui, form as any);

      expect(result).toBe(true);
    });

    it("returns true for VALIDATION with fields", () => {
      const form = createMockForm();
      const ui = createUiError({
        kind: "VALIDATION",
        validationFields: { email: "Invalid" },
      });

      const result = applyFormErrors(ui, form as any);

      expect(result).toBe(true);
    });
  });
});
