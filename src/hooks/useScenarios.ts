import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../lib/api-client.js";
import { PROJECT_KEYS } from "./useProjects.js";
import type { UncertainScenarioInputs } from "../domain/monteCarlo.js";

export const SCENARIO_KEYS = {
  all: ["scenarios"] as const,
  list: (projectId: string) => [...SCENARIO_KEYS.all, "list", projectId] as const,
  detail: (id: string) => [...SCENARIO_KEYS.all, "detail", id] as const,
  search: (params: { q?: string; tags?: string[]; favoritesOnly?: boolean }) =>
    [...SCENARIO_KEYS.all, "search", params] as const,
};

export function useScenarios(projectId: string | null | undefined) {
  return useQuery({
    queryKey: SCENARIO_KEYS.list(projectId ?? ""),
    queryFn: () => api.getScenarios(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useScenario(id: string | null | undefined) {
  return useQuery({
    queryKey: SCENARIO_KEYS.detail(id ?? ""),
    queryFn: () => api.getScenario(id!),
    enabled: Boolean(id),
  });
}

export function useCreateScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      projectId: string;
      parentScenarioId?: string | null;
      name: string;
      description?: string | null;
      tags?: string[];
      inputs: UncertainScenarioInputs;
      runMonteCarlo?: boolean;
      monteCarloOptions?: { iterations?: number; seed?: number };
    }) => api.createScenario(data),
    onSuccess: (scenario) => {
      queryClient.invalidateQueries({ queryKey: SCENARIO_KEYS.list(scenario.project_id) });
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
    },
  });
}

export function useUpdateScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; description?: string | null; tags?: string[] };
    }) => api.updateScenario(id, data),
    onSuccess: (scenario) => {
      queryClient.invalidateQueries({ queryKey: SCENARIO_KEYS.detail(scenario.id) });
      queryClient.invalidateQueries({ queryKey: SCENARIO_KEYS.list(scenario.project_id) });
    },
  });
}

export function useDeleteScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      api.deleteScenario(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SCENARIO_KEYS.list(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.toggleFavorite(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: SCENARIO_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: SCENARIO_KEYS.all });
    },
  });
}

export function useSetArchived() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      api.setArchived(id, archived),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SCENARIO_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: SCENARIO_KEYS.all });
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
    },
  });
}

export function useSearchScenarios(params: {
  q?: string;
  tags?: string[];
  favoritesOnly?: boolean;
}) {
  return useQuery({
    queryKey: SCENARIO_KEYS.search(params),
    queryFn: () => api.searchScenarios(params),
  });
}
