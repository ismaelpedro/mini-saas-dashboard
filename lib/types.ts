import type { ProjectStatusValue } from "./validations";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
};

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
