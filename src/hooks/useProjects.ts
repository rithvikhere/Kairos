import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../lib/api-client.js";

export const PROJECT_KEYS = {
  all: ["projects"] as const,
  lists: () => [...PROJECT_KEYS.all, "list"] as const,
  detail: (id: string) => [...PROJECT_KEYS.all, "detail", id] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: PROJECT_KEYS.lists(),
    queryFn: () => api.getProjects(),
  });
}

export function useProject(id: string | null | undefined) {
  return useQuery({
    queryKey: PROJECT_KEYS.detail(id ?? ""),
    queryFn: () => api.getProject(id!),
    enabled: Boolean(id),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string | null; suggestedTags?: string[] }) =>
      api.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
    },
  });
}

export function useUpdateProjectTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, suggestedTags }: { id: string; suggestedTags: string[] }) =>
      api.updateProjectTags(id, suggestedTags),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
    },
  });
}
