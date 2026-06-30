"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  projectSchema,
  STATUS_LABELS,
  type ProjectFormValues,
  type ProjectPayload,
  type ProjectStatusValue,
} from "@/lib/validations";
import { ApiError } from "@/lib/api-client";
import { useCreateProject, useTeamMembers, useUpdateProject } from "@/lib/queries";
import type { Project } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = Object.keys(STATUS_LABELS) as ProjectStatusValue[];

function emptyDefaults(): ProjectFormValues {
  return { name: "", status: "ACTIVE", deadline: "", budget: "", teamMemberId: "" };
}

function projectToDefaults(p: Project): ProjectFormValues {
  return {
    name: p.name,
    status: p.status,
    deadline: p.deadline.slice(0, 10),
    budget: p.budget,
    teamMemberId: p.teamMemberId,
  };
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ProjectModal({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}) {
  const isEdit = Boolean(project);
  const { data: teamMembers = [], isLoading: loadingMembers } = useTeamMembers();
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues, unknown, ProjectPayload>({
    resolver: zodResolver(projectSchema),
    defaultValues: emptyDefaults(),
  });

  useEffect(() => {
    if (open) reset(project ? projectToDefaults(project) : emptyDefaults());
  }, [open, project, reset]);

  async function onSubmit(values: ProjectPayload) {
    try {
      if (project) {
        await updateMutation.mutateAsync({ id: project.id, data: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      toast.success(project ? "Project updated" : "Project created");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the project details below."
              : "Add a project to your dashboard."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="Project name" htmlFor="name" error={errors.name?.message}>
            <Input id="name" {...register("name")} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Status" error={errors.status?.message}>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-label="Status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field label="Deadline" htmlFor="deadline" error={errors.deadline?.message}>
              <Input id="deadline" type="date" {...register("deadline")} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Budget (USD)" htmlFor="budget" error={errors.budget?.message}>
              <Input id="budget" type="number" step="0.01" min="0" {...register("budget")} />
            </Field>

            <Field label="Team member" error={errors.teamMemberId?.message}>
              <Controller
                control={control}
                name="teamMemberId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={loadingMembers}
                  >
                    <SelectTrigger aria-label="Team member">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
