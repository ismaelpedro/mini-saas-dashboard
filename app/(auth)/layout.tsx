export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 text-center">
        <h2 className="text-lg font-semibold tracking-tight">Mini SaaS Dashboard</h2>
        <p className="text-sm text-muted-foreground">Project management, simplified.</p>
      </div>
      {children}
    </main>
  );
}
