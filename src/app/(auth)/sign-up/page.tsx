import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { AuthForm } from "@/components/auth/auth-form";

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return <AuthForm mode="sign-up" />;
}
