import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { DashboardHeader } from "@/components/dashboard-header";
import { ProjectsView } from "@/components/projects-view";

export default async function DashboardPage() {
  // The proxy already guards this route; this is a defensive fallback.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Manage your team&apos;s projects, deadlines and budgets.
          </p>
        </div>
        <ProjectsView />
      </main>
    </div>
  );
}
