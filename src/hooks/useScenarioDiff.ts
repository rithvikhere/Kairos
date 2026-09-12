import { useMutation, useQuery } from "@tanstack/react-query";
import * as api from "../lib/api-client.js";

export const DIFF_KEYS = {
  all: ["diff"] as const,
  pair: (a: string, b: string) => [...DIFF_KEYS.all, a, b] as const,
};

export function useScenarioDiff(a: string | null | undefined, b: string | null | undefined) {
  return useQuery({
    queryKey: DIFF_KEYS.pair(a ?? "", b ?? ""),
    queryFn: () => api.getDiff(a!, b!),
    enabled: Boolean(a && b),
  });
}

export function useExplainDiff() {
  return useMutation({
    mutationFn: ({ scenarioAId, scenarioBId }: { scenarioAId: string; scenarioBId: string }) =>
      api.explainDiff(scenarioAId, scenarioBId),
  });
}
