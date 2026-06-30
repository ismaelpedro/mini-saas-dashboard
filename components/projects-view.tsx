"use client";

import { useMemo, useState } from "react";
import { FolderOpen, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { useDebounce } from "@/lib/use-debounce";
import { useDeleteProject, useProjects } from "@/lib/queries";
import type { Project } from "@/lib/types";
import { SearchBar } from "./search-bar";
import { StatusFilter } from "./status-filter";
import { ProjectTable } from "./project-table";
import { ProjectModal } from "./project-modal";
import { DeleteDialog } from "./delete-dialog";

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-16 text-center">
      <FolderOpen className="size-8 text-muted-foreground" />
      <p className="mt-3 font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg border border-border bg-card" />
      ))}
    </div>
  );
}

export function ProjectsView() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const filters = useMemo(
    () => ({ status, q: debouncedSearch }),
    [status, debouncedSearch],
  );
  const { data: projects = [], isLoading, isError } = useProjects(filters);
  const deleteMutation = useDeleteProject();

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    setModalOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success("Project deleted");
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete");
    }
  }

  const hasFilters = Boolean(status || debouncedSearch);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <SearchBar value={search} onChange={setSearch} />
          <StatusFilter value={status} onChange={setStatus} />
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          New project
        </Button>
      </div>

      {isError ? (
        <EmptyState title="Couldn't load projects" subtitle="Please refresh and try again." />
      ) : isLoading ? (
        <TableSkeleton />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects found"
          subtitle={
            hasFilters
              ? "Try adjusting your search or filter."
              : "Create your first project to get started."
          }
        />
      ) : (
        <ProjectTable projects={projects} onEdit={openEdit} onDelete={setDeleting} />
      )}

      <ProjectModal open={modalOpen} onOpenChange={setModalOpen} project={editing} />
      <DeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        projectName={deleting?.name ?? ""}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
