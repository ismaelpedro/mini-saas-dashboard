"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { loginSchema, registerSchema, type RegisterInput } from "@/lib/validations";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "register";

const COPY = {
  login: {
    title: "Sign in",
    subtitle: "Welcome back. Enter your credentials to continue.",
    submit: "Sign in",
    alt: "Need an account?",
    altLink: "/register",
    altLabel: "Create one",
  },
  register: {
    title: "Create account",
    subtitle: "Start managing your projects in minutes.",
    submit: "Create account",
    alt: "Already have an account?",
    altLink: "/login",
    altLabel: "Sign in",
  },
} as const;

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const from = useSearchParams().get("from") || "/";
  const isRegister = mode === "register";
  const copy = COPY[mode];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(
      isRegister ? registerSchema : loginSchema,
    ) as unknown as Resolver<RegisterInput>,
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: RegisterInput) {
    try {
      const payload = isRegister
        ? values
        : { email: values.email, password: values.password };
      await apiFetch(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success(isRegister ? "Account created" : "Signed in");
      router.replace(from);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        {isRegister && (
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" autoComplete="name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Please wait…" : copy.submit}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {copy.alt}{" "}
        <Link href={copy.altLink} className="font-medium text-accent hover:underline">
          {copy.altLabel}
        </Link>
      </p>
    </div>
  );
}
