import type { ProjectStatusValue } from "./validations";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
};

// Budget is a Prisma Decimal, serialized to a string over the wire.
export type Project = {
  id: string;
  name: string;
  status: ProjectStatusValue;
  deadline: string;
  budget: string;
  teamMemberId: string;
  teamMember: TeamMember;
  createdAt: string;
  updatedAt: string;
};
