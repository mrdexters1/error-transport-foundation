export type CircuitState = "closed" | "open" | "half-open";

export type CircuitData = {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: number;
};

export type CircuitStorage = {
  get: (name: string) => Promise<CircuitData | null>;
  set: (name: string, data: CircuitData) => Promise<void>;
};

export const DEFAULT_CIRCUIT: CircuitData = {
  state: "closed",
  failures: 0,
  successes: 0,
  lastFailure: 0,
};

// In-memory storage (single-node, sufficient for this project)
const circuits = new Map<string, CircuitData>();

export const inMemoryStorage: CircuitStorage = {
  get: async (name) => circuits.get(name) ?? null,
  set: async (name, data) => {
    circuits.set(name, data);
  },
};
