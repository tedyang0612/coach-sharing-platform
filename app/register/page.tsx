import Link from "next/link";
import { LogoBadge } from "@/components/brand/logo-badge";
import { RegisterForm } from "./register-form";

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const params = await searchParams;
  const redirectParam = params.redirect;
  const redirectTo = typeof redirectParam === "string" ? redirectParam : "/";
  const loginHref =
    redirectTo !== "/" ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login";

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <LogoBadge />
          <h1 className="text-xl font-bold text-neutral-900">加入夠練 GoLand</h1>
          <p className="text-sm text-neutral-500">開課、湊團、找教練？加入夠練立即開始！</p>
        </div>

        <RegisterForm redirectTo={redirectTo} />

        <p className="mt-6 text-center text-sm text-neutral-500">
          已經有帳號了？{" "}
          <Link href={loginHref} className="font-semibold text-brand hover:underline">
            直接登入
          </Link>
        </p>
      </div>
    </main>
  );
}
