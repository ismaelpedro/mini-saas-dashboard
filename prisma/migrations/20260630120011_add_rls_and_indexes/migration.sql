-- CreateIndex
CREATE INDEX "Project_teamMemberId_idx" ON "Project"("teamMemberId");

-- Enable Row Level Security (deny-by-default; owner role bypasses)
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeamMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
