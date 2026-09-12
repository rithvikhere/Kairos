import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseScenarioIntent } from "../parseScenarioIntent.js";
import * as clientModule from "../client.js";
import { AiUnavailableError } from "../errors.js";
import type { ScenarioInputs } from "../../domain/types.js";

describe("parseScenarioIntent", () => {
  const baseline: ScenarioInputs = {
    budget: 100_000,
    headcount: 8,
    deadlineWeeks: 16,
    scope: 480,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses multi-field intent in one call from canned JSON", async () => {
    const mockOutput = JSON.stringify({
      budget: { type: "percent", value: -20 },
      headcount: { type: "delta", value: 2 },
      deadlineWeeks: { type: "delta", value: 4 },
      scope: null,
    });

    vi.spyOn(clientModule, "_aiConnectorComplete").mockResolvedValue(mockOutput);

    const delta = await parseScenarioIntent(
      "cut budget 20%, add 2 people, push deadline back 4 weeks",
      baseline
    );

    expect(delta).toEqual({
      budget: { type: "percent", value: -20 },
      headcount: { type: "delta", value: 2 },
      deadlineWeeks: { type: "delta", value: 4 },
    });
    // scope was null, so omitted from clean delta
    expect(delta.scope).toBeUndefined();
  });

  it("parses single field modifications (absolute)", async () => {
    const mockOutput = JSON.stringify({
      budget: { type: "absolute", value: 250_000 },
      headcount: null,
      deadlineWeeks: null,
      scope: null,
    });

    vi.spyOn(clientModule, "_aiConnectorComplete").mockResolvedValue(mockOutput);

    const delta = await parseScenarioIntent("increase budget to $250,000", baseline);

    expect(delta).toEqual({
      budget: { type: "absolute", value: 250_000 },
    });
  });

  it("throws a clear error on non-JSON response instead of silently returning an empty delta", async () => {
    vi.spyOn(clientModule, "_aiConnectorComplete").mockResolvedValue(
      "I couldn't quite understand your request, please try again."
    );

    await expect(
      parseScenarioIntent("do something to budget", baseline)
    ).rejects.toThrow(/Failed to parse model response as JSON/);
  });

  it("throws a clear error on invalid schema structure instead of silently returning empty", async () => {
    const invalidSchemaOutput = JSON.stringify({
      budget: { type: "unsupported_delta_type", value: 10 },
    });

    vi.spyOn(clientModule, "_aiConnectorComplete").mockResolvedValue(invalidSchemaOutput);

    await expect(
      parseScenarioIntent("change budget", baseline)
    ).rejects.toThrow(/AI response does not match expected ScenarioIntentDelta shape/);
  });

  it("throws a clear error when unexpected extra properties are present", async () => {
    const extraPropertyOutput = JSON.stringify({
      budget: { type: "percent", value: 10 },
      unknownLever: { type: "absolute", value: 50 },
    });

    vi.spyOn(clientModule, "_aiConnectorComplete").mockResolvedValue(extraPropertyOutput);

    await expect(
      parseScenarioIntent("change budget and unknown lever", baseline)
    ).rejects.toThrow(/AI response does not match expected ScenarioIntentDelta shape/);
  });

  it("propagates AiUnavailableError when client reports no available AI providers", async () => {
    vi.spyOn(clientModule, "_aiConnectorComplete").mockRejectedValue(
      new AiUnavailableError("No configured provider is ready.")
    );

    await expect(
      parseScenarioIntent("cut budget 10%", baseline)
    ).rejects.toThrow(AiUnavailableError);
  });
});
