import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fetchJSON } from "../../client/fetch-json";
import { FetchError } from "../../errors/transport/fetch-error";

describe("fetchJSON", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("2xx + valid JSON → success", () => {
    it("returns parsed JSON", async () => {
      const mockData = { id: 1, name: "Test" };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve(mockData),
      });

      const result = await fetchJSON({
        url: "https://api.test.com/data",
        method: "GET",
      });

      expect(result).toEqual(mockData);
    });

    it("validates with type guard", async () => {
      const mockData = { id: 1, type: "user" };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve(mockData),
      });

      const isUser = (d: unknown): d is { id: number; type: string } =>
        typeof d === "object" && d !== null && "id" in d && "type" in d;

      const result = await fetchJSON({
        url: "https://api.test.com/user",
        method: "GET",
        response: isUser,
      });

      expect(result).toEqual(mockData);
    });

    it("returns undefined for 204", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        headers: new Headers(),
      });

      const result = await fetchJSON({
        url: "https://api.test.com/delete",
        method: "DELETE",
      });

      expect(result).toBeUndefined();
    });
  });

  describe("2xx + invalid JSON → throws", () => {
    it("throws FetchError for non-JSON content-type", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        url: "https://api.test.com/html",
        statusText: "OK",
        headers: new Headers({ "content-type": "text/html" }),
      });

      await expect(
        fetchJSON({ url: "https://api.test.com/html", method: "GET" })
      ).rejects.toThrow(FetchError);
    });

    it("throws FetchError when content-type missing", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        url: "https://api.test.com/no-type",
        statusText: "OK",
        headers: new Headers(),
      });

      await expect(
        fetchJSON({ url: "https://api.test.com/no-type", method: "GET" })
      ).rejects.toThrow(FetchError);
    });

    it("calls handleBadResponse when type guard fails", async () => {
      const mockData = { wrong: "shape" };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        url: "https://api.test.com/data",
        statusText: "OK",
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve(mockData),
        bodyUsed: true,
      });

      const handleBadResponse = vi.fn().mockReturnValue({ fallback: true });
      const isValid = (d: unknown): d is { expected: string } =>
        typeof d === "object" && d !== null && "expected" in d;

      const result = await fetchJSON({
        url: "https://api.test.com/data",
        method: "GET",
        response: isValid,
        handleBadResponse,
      });

      expect(handleBadResponse).toHaveBeenCalled();
      expect(result).toEqual({ fallback: true });
    });

    it("throws FetchError when type guard fails and no handleBadResponse", async () => {
      const mockData = { wrong: "shape" };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        url: "https://api.test.com/data",
        statusText: "OK",
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve(mockData),
        bodyUsed: false,
      });

      const isValid = (d: unknown): d is { expected: string } =>
        typeof d === "object" && d !== null && "expected" in d;

      await expect(
        fetchJSON({
          url: "https://api.test.com/data",
          method: "GET",
          response: isValid,
        })
      ).rejects.toThrow(FetchError);
    });
  });

  describe("!ok → handleBadResponse", () => {
    it("calls handleBadResponse on non-ok status", async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: "Bad Request",
        url: "https://api.test.com/data",
        bodyUsed: false,
        json: () => Promise.resolve({ error: "Invalid" }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const handleBadResponse = vi.fn().mockReturnValue({ handled: true });

      const result = await fetchJSON({
        url: "https://api.test.com/data",
        method: "POST",
        handleBadResponse,
      });

      expect(handleBadResponse).toHaveBeenCalledWith(
        mockResponse,
        expect.objectContaining({ method: "POST" })
      );
      expect(result).toEqual({ handled: true });
    });

    it("default handler throws FetchError", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        url: "https://api.test.com/missing",
        bodyUsed: false,
        json: () => Promise.resolve({ error: "Not found" }),
      });

      await expect(
        fetchJSON({ url: "https://api.test.com/missing", method: "GET" })
      ).rejects.toThrow(FetchError);
    });
  });

  describe("network error → InfrastructureError", () => {
    it("FetchError is InfrastructureError", () => {
      const error = new FetchError({
        method: "GET",
        url: "https://test.com",
        status: 500,
        statusText: "Internal Server Error",
      });

      expect(error.layer).toBe("infrastructure");
    });

    it("network failure throws Error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

      await expect(
        fetchJSON({ url: "https://api.test.com/data", method: "GET" })
      ).rejects.toBeInstanceOf(Error);
    });
  });

  describe("retryable flag preserved", () => {
    it("5xx is retryable", () => {
      const error = new FetchError({
        method: "GET",
        url: "https://test.com",
        status: 503,
        statusText: "Service Unavailable",
      });

      expect(error.retryable).toBe(true);
    });

    it("429 is retryable", () => {
      const error = new FetchError({
        method: "GET",
        url: "https://test.com",
        status: 429,
        statusText: "Too Many Requests",
      });

      expect(error.retryable).toBe(true);
    });

    it("4xx (not 429) is not retryable", () => {
      const error = new FetchError({
        method: "GET",
        url: "https://test.com",
        status: 400,
        statusText: "Bad Request",
      });

      expect(error.retryable).toBe(false);
    });
  });
});
