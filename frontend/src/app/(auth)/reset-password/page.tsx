"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";

import NavBar from "@/components/public/sections/NavBar";
import { apiPost } from "@/lib/api";
import { FormField } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/ui/password-input";
import { Input } from "@/components/ui/input";

type PageState = "idle" | "loading" | "success" | "error";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("token") ?? "";

  const orbRef = useRef<HTMLDivElement | null>(null);

  const [token, setToken] = useState(urlToken);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pageState, setPageState] = useState<PageState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [errors, setErrors] = useState<{ token?: string; password?: string; confirm?: string }>({});

  useEffect(() => {
    const nav = document.getElementById("nav");
    nav?.classList.add("scrolled");
    const handleMouseMove = (e: MouseEvent) => {
      if (!orbRef.current) return;
      const x = (e.clientX / window.innerWidth) * 15 - 7.5;
      const y = (e.clientY / window.innerHeight) * 15 - 7.5;
      orbRef.current.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      nav?.classList.remove("scrolled");
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Countdown redirect after success
  useEffect(() => {
    if (pageState !== "success") return;
    if (countdown <= 0) { router.push("/login"); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [pageState, countdown, router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const next: typeof errors = {};
    if (!token.trim()) next.token = "Please enter the reset token";
    if (!newPassword) next.password = "Please enter a new password";
    else if (newPassword.length < 6) next.password = "Password must be at least 6 characters";
    if (!confirmPassword) next.confirm = "Please confirm your password";
    else if (newPassword !== confirmPassword) next.confirm = "Passwords do not match";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPageState("loading");
    setErrorMsg(null);
    try {
      await apiPost("auth/reset-password", { token: token.trim(), new_password: newPassword });
      setPageState("success");
    } catch {
      setErrorMsg("Verification token is invalid or expired. Please go back and verify your identity again.");
      setPageState("error");
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-app-bg text-foreground">
      <NavBar />

      {/* Background orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-35" aria-hidden="true" />
      <div
        ref={orbRef}
        className="pointer-events-none fixed z-0 h-[500px] w-[500px] -top-[150px] -right-[100px] rounded-full blur-[100px] transition-transform duration-[800ms] ease-[cubic-bezier(0.1,0.5,0.1,1)]"
        style={{ background: "radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed z-0 h-[400px] w-[400px] -bottom-[150px] -left-[100px] rounded-full blur-[100px] animate-[float_8s_ease-in-out_infinite]"
        style={{ background: "radial-gradient(circle, rgba(123,110,246,0.08) 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-5 pb-5 pt-24 sm:pt-28">
        {pageState === "success" ? (
          <div className="w-full max-w-[420px] animate-[fadeSlideUp_0.6s_ease] text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 animate-pulse items-center justify-center rounded-2xl bg-success/12">
              <CheckCircle className="h-9 w-9 text-success" />
            </div>
            <h2 className="mb-2 font-serif text-[28px] leading-[1.1]">Password updated</h2>
            <p className="mb-1 text-sm font-light text-text-secondary">
              Your password has been reset successfully.
            </p>
            <p className="mb-4 text-xs text-text-secondary">
              Redirecting to login in {countdown}s…
            </p>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-white shadow-[0_4px_20px_rgba(14,165,233,0.30)] transition-all hover:-translate-y-px hover:shadow-[0_6px_28px_rgba(14,165,233,0.40)]"
            >
              Go to login now
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
          </div>
        ) : (
          <div className="w-full max-w-[420px] animate-[fadeSlideUp_0.6s_ease]">
            <Link
              href="/login"
              className="mb-6 inline-block text-xs text-text-secondary underline transition-colors hover:text-foreground"
            >
              &larr; Back to login
            </Link>

            <h2 className="mb-2 font-serif text-[28px] leading-[1.1]">Set new password</h2>
            <p className="mb-6 text-sm font-light text-text-secondary">
              Identity verified. Choose a new password for your account.
            </p>

            {pageState === "error" && errorMsg ? (
              <div
                className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs leading-relaxed text-red-300"
                role="alert"
              >
                {errorMsg}{" "}
                <Link href="/login" className="font-semibold text-red-300 underline">
                  Go back &rarr;
                </Link>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {!urlToken ? (
                <FormField label="Verification token" htmlFor="rp-token" error={errors.token}>
                  <Input
                    id="rp-token"
                    type="text"
                    placeholder="Paste your verification token here"
                    className="bg-app-input border-app-border focus-visible:border-accent"
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value);
                      if (errors.token) setErrors((prev) => ({ ...prev, token: undefined }));
                    }}
                    disabled={pageState === "loading"}
                    autoComplete="off"
                  />
                </FormField>
              ) : null}

              <FormField label="New password" htmlFor="rp-password" error={errors.password}>
                <PasswordInput
                  id="rp-password"
                  placeholder="Min. 6 characters"
                  className="bg-app-input border-app-border focus-visible:border-accent"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  disabled={pageState === "loading"}
                  autoComplete="new-password"
                />
              </FormField>

              <FormField label="Confirm password" htmlFor="rp-confirm" error={errors.confirm}>
                <PasswordInput
                  id="rp-confirm"
                  placeholder="Repeat your new password"
                  className="bg-app-input border-app-border focus-visible:border-accent"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: undefined }));
                  }}
                  disabled={pageState === "loading"}
                  autoComplete="new-password"
                />
              </FormField>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-white shadow-[0_4px_20px_rgba(14,165,233,0.30)] transition-all hover:-translate-y-px hover:shadow-[0_6px_28px_rgba(14,165,233,0.40)] disabled:cursor-not-allowed disabled:opacity-80"
                disabled={pageState === "loading"}
              >
                {pageState === "loading" ? "Updating…" : "Reset password"}
                {pageState !== "loading" && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                )}
              </button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
