import { useState, useEffect, useRef } from "react";
import type { ScenarioInputs, SimulationResult } from "../domain/types.js";
import * as api from "../lib/api-client.js";

/**
 * Debounced live simulation preview hook.
 *
 * Calls POST /api/simulate as slider values shift, debounced by `delayMs`
 * to prevent network flooding while maintaining a real-time reactive feel.
 */
export function useScenarioSimulatePreview(
  inputs: ScenarioInputs,
  delayMs: number = 200
) {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const preview = await api.simulatePreview(inputsRef.current);
        if (active) {
          setResult(preview);
          setError(null);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err);
          setIsLoading(false);
        }
      }
    }, delayMs);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [JSON.stringify(inputs.constraints), delayMs]);

  return { result, isLoading, error };
}
