import { z } from "zod";

export const ProjectStatusEnum = z.enum(["ACTIVE", "ON_HOLD", "COMPLETED"]);
export type ProjectStatusValue = z.infer<typeof ProjectStatusEnum>;

export const STATUS_LABELS: Record<ProjectStatusValue, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
};

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const projectSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  status: ProjectStatusEnum,
  deadline: z
    .string()
    .min(1, "Deadline is required")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date"),
  budget: z.coerce.number().positive("Budget must be greater than 0"),
  teamMemberId: z.string().min(1, "Assign a team member"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
// z.input has a loose budget (pre-coercion) for the form; z.output is the
// validated payload (budget: number) sent to the API.
export type ProjectFormValues = z.input<typeof projectSchema>;
export type ProjectPayload = z.output<typeof projectSchema>;
