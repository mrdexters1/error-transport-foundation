import { describe, expect, it } from "vitest";
import { requestContext } from "./request-context";

describe("Isomorphic RequestContext", () => {
  it("should be a no-op when window is defined (client-side simulation)", () => {
    // Save original window if it exists (for test runners that might provide it)
    const originalWindow = global.window;

    try {
      // Simulate browser environment
      (global as any).window = {};

      const context = { requestId: "test-id" };
      const result = requestContext.run(context, () => {
        return requestContext.getRequestId();
      });

      // On the client, run() should just execute the function and getRequestId() should be undefined
      expect(result).toBeUndefined();
    } finally {
      (global as any).window = originalWindow;
    }
  });

  it("should return undefined for getRequestId() outside of a provider", () => {
    expect(requestContext.getRequestId()).toBeUndefined();
  });
});
