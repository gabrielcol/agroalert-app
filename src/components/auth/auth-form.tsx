"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n/provider";

type Mode = "sign-in" | "sign-up";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const isSignUp = mode === "sign-up";
  const f = useT().auth.form;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    const { error } = await authClient.signIn.email({ email, password });

    setPending(false);
    if (error) {
      // Generic message — never surface better-auth's specific error (e.g.
      // "user not found" vs "invalid password") to avoid account enumeration.
      toast.error(f.error);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  // Public self-service sign-up is disabled: accounts are
  // created by an administrator. The /sign-up route still resolves, but shows a
  // notice instead of a registration form.
  if (isSignUp) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{f.signUpDisabledTitle}</CardTitle>
          <CardDescription>{f.signUpDisabled}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center text-sm">
            {f.haveAccount}
            <Link
              href="/sign-in"
              className="text-foreground underline underline-offset-4"
            >
              {f.linkSignIn}
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{f.signInTitle}</CardTitle>
        <CardDescription>{f.signInDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">{f.email}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder={f.emailPlaceholder}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">{f.password}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? f.pending : f.signIn}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
