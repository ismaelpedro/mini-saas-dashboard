"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";
import type { Project, TeamMember } from "./types";
import type { ProjectPayload } from "./validations";

export type ProjectFilters = { status?: string; q?: string; sort?: string };

export function useProjects(filters: ProjectFilters) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.q) params.set("q", filters.q);
  if (filters.sort) params.set("sort", filters.sort);
  const qs = params.toString();

  return useQuery({
    queryKey: ["projects", filters],
    queryFn: () =>
      apiFetch<{ projects: Project[] }>(`/api/projects${qs ? `?${qs}` : ""}`).then(
        (r) => r.projects,
      ),
  });
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: () =>
      apiFetch<{ teamMembers: TeamMember[] }>("/api/team-members").then(
        (r) => r.teamMembers,
      ),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProjectPayload) =>
      apiFetch<{ project: Project }>("/api/projects", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProjectPayload }) =>
      apiFetch<{ project: Project }>(`/api/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: true }>(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}
