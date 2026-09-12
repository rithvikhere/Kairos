import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  _providerConnectors,
  _aiConnectorComplete,
  isAiConfigured,
  type AiCallParams,
} from "../client.js";
import { AiUnavailableError } from "../errors.js";

describe("AI client fallback chain", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const testParams: AiCallParams = {
    task: "intentParsing",
    systemPrompt: "You are a test assistant.",
    userPrompt: "Test request",
  };

  it("returns result from primary provider when primary succeeds", async () => {
    const openaiSpy = vi
      .spyOn(_providerConnectors, "openai")
      .mockResolvedValue('{"budget":{"type":"percent","value":-10}}');
    const anthropicSpy = vi.spyOn(_providerConnectors, "anthropic");

    const result = await _aiConnectorComplete(testParams);

    expect(result).toBe('{"budget":{"type":"percent","value":-10}}');
    expect(openaiSpy).toHaveBeenCalledTimes(1);
    expect(anthropicSpy).not.toHaveBeenCalled();
  });

  it("falls back to secondary provider when primary throws, returning secondary result", async () => {
    const openaiSpy = vi
      .spyOn(_providerConnectors, "openai")
      .mockRejectedValue(new Error("OpenAI API rate limit exceeded"));
    const anthropicSpy = vi
      .spyOn(_providerConnectors, "anthropic")
      .mockResolvedValue('{"budget":{"type":"percent","value":-20}}');

    const result = await _aiConnectorComplete(testParams);

    expect(result).toBe('{"budget":{"type":"percent","value":-20}}');
    expect(openaiSpy).toHaveBeenCalledTimes(1);
    expect(anthropicSpy).toHaveBeenCalledTimes(1);
  });

  it("throws AiUnavailableError specifically when all providers in the chain fail", async () => {
    vi.spyOn(_providerConnectors, "openai").mockRejectedValue(
      new Error("OpenAI 500 Internal Server Error")
    );
    vi.spyOn(_providerConnectors, "anthropic").mockRejectedValue(
      new Error("Anthropic 503 Overloaded")
    );

    await expect(_aiConnectorComplete(testParams)).rejects.toThrow(AiUnavailableError);
  });

  describe("isAiConfigured", () => {
    it("returns true if OPENAI_API_KEY is present", () => {
      process.env.OPENAI_API_KEY = "test-openai-key";
      delete process.env.ANTHROPIC_API_KEY;

      expect(isAiConfigured("intentParsing")).toBe(true);
      expect(isAiConfigured("diffExplanation")).toBe(true);
    });

    it("returns true if ANTHROPIC_API_KEY is present", () => {
      delete process.env.OPENAI_API_KEY;
      process.env.ANTHROPIC_API_KEY = "test-anthropic-key";

      expect(isAiConfigured("intentParsing")).toBe(true);
      expect(isAiConfigured("diffExplanation")).toBe(true);
    });

    it("returns false when neither key is present", () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      expect(isAiConfigured("intentParsing")).toBe(false);
      expect(isAiConfigured("diffExplanation")).toBe(false);
    });
  });
});
