"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

import NavBar from "@/components/public/sections/NavBar";
import { useAuth } from "@/hooks";
import { apiPost } from "@/lib/api";
import { useAuthStore } from "@/store";
import { FormField } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/ui/password-input";
import { Input } from "@/components/ui/input";

type Step = "login" | "forgot" | "verify";
type FormErrors = {
  email?: string;
  password?: string;
};
type VerifyIdentityResponse = {
  identity_token?: string;
  needs_questions?: boolean;
};

function emailIsValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function LoginPage() {
  const router = useRouter();
  const orbRef = useRef<HTMLDivElement | null>(null);
  const { login, isLoading, error, user, accessToken } = useAuth();

  const [authHydrated, setAuthHydrated] = useState(false);
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Forgot flow state
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Security answer state (Step 2)
  const [recoveryCode, setRecoveryCode] = useState("");
  const [favAnimal, setFavAnimal] = useState("");
  const [favPerson, setFavPerson] = useState("");

  useEffect(() => {
    setAuthHydrated(useAuthStore.persist.hasHydrated());
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setAuthHydrated(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authHydrated) return;
    if (!user || !accessToken) return;
    router.replace("/threads");
  }, [accessToken, authHydrated, router, user]);

  useEffect(() => {
    const nav = document.getElementById("nav");
    nav?.classList.add("scrolled");

    const handleMouseMove = (event: MouseEvent) => {
      if (!orbRef.current) return;
      const x = (event.clientX / window.innerWidth) * 15 - 7.5;
      const y = (event.clientY / window.innerHeight) * 15 - 7.5;
      orbRef.current.style.transform = `translate(${x}px, ${y}px)`;
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      nav?.classList.remove("scrolled");
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: FormErrors = {};

    if (!email.trim()) {
      nextErrors.email = "Please enter your email";
    } else if (!emailIsValid(email)) {
      nextErrors.email = "Please enter a valid email";
    }

    if (!password.trim()) {
      nextErrors.password = "Please enter your password";
    } else if (password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await login(email.trim().toLowerCase(), password, rememberMe);
      router.push("/threads");
    } catch {
      // Error is already set in the auth store
    }
  };

  const handleForgotIdentifierSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!forgotIdentifier.trim()) { setForgotError("Please enter your email or username"); return; }
    setForgotLoading(true);
    setForgotError(null);
    try {
      const res = await apiPost<VerifyIdentityResponse>("auth/verify-identity", {
        identifier: forgotIdentifier.trim().toLowerCase(),
      });
      if (res.identity_token) {
        router.push(`/reset-password?token=${res.identity_token}`);
      } else {
        setStep("verify");
      }
    } catch {
      setForgotError("No account found with that email or username.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recoveryCode.trim() && !favAnimal.trim() && !favPerson.trim()) {
      setForgotError("Please fill in at least one security answer");
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      const res = await apiPost<VerifyIdentityResponse>("auth/verify-identity", {
        identifier: forgotIdentifier.trim().toLowerCase(),
        recovery_code: recoveryCode.trim() || undefined,
        fav_animal: favAnimal.trim() || undefined,
        fav_person: favPerson.trim() || undefined,
      });
      router.push(`/reset-password?token=${res.identity_token}`);
    } catch {
      setForgotError("Security answer incorrect. Please try again.");
      setForgotLoading(false);
    }
  };

  if (!authHydrated || (user && accessToken)) {
    return null;
  }

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
        {step === "login" ? (
          <div className="w-full max-w-[420px] animate-[fadeSlideUp_0.6s_ease]">
            <h1 className="mb-2 font-serif text-[32px] leading-[1.1] sm:text-[36px]">Welcome back</h1>
            <p className="mb-6 text-sm font-light text-text-secondary">
              Continue your conversations and pick up where you left off.
            </p>

            <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
              <FormField label="Email" htmlFor="login-email" error={errors.email}>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  className="bg-app-input border-app-border focus-visible:border-accent"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                />
              </FormField>

              <FormField label="Password" htmlFor="login-password" error={errors.password}>
                <PasswordInput
                  id="login-password"
                  placeholder="Enter your password"
                  className="bg-app-input border-app-border focus-visible:border-accent"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                />
              </FormField>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label htmlFor="remember-me" className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded accent-accent"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  className="text-xs text-text-secondary underline transition-colors hover:text-foreground"
                  onClick={() => {
                    setForgotIdentifier(email);
                    setStep("forgot");
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-white shadow-[0_4px_20px_rgba(14,165,233,0.30)] transition-all hover:-translate-y-px hover:shadow-[0_6px_28px_rgba(14,165,233,0.40)] disabled:cursor-not-allowed disabled:opacity-80"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Continue"}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>

              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </form>

            <p className="mt-6 text-center text-xs text-text-secondary">
              New here?{" "}
              <Link href="/register" className="font-semibold text-accent underline-offset-4 hover:underline">
                Create account
              </Link>
            </p>

            <div className="mt-5 rounded-xl border border-accent2/15 bg-accent2/8 p-3 text-xs text-text-secondary">
              <strong className="mb-1.5 block text-accent2">Demo account:</strong>
              <span className="font-mono text-[10px]">user1@demo.com / user1demo</span>
            </div>
          </div>
        ) : null}

        {step === "forgot" ? (
          <div className="w-full max-w-[420px] animate-[fadeSlideUp_0.6s_ease]">
            <button
              type="button"
              className="mb-6 text-xs text-text-secondary underline transition-colors hover:text-foreground"
              onClick={() => setStep("login")}
            >
              &larr; Back to login
            </button>
            <h2 className="mb-2 font-serif text-[28px] leading-[1.1]">Recover account</h2>
            <p className="mb-6 text-sm font-light text-text-secondary">Enter your email or username to continue.</p>

            <form onSubmit={handleForgotIdentifierSubmit} noValidate className="space-y-4">
              <FormField label="Email or username" htmlFor="forgot-id">
                <Input
                  id="forgot-id"
                  type="text"
                  placeholder="you@example.com or your_username"
                  className="bg-app-input border-app-border focus-visible:border-accent"
                  value={forgotIdentifier}
                  onChange={(e) => { setForgotIdentifier(e.target.value); setForgotError(null); }}
                  autoComplete="username"
                />
              </FormField>

              {forgotError ? <p className="text-xs text-destructive">{forgotError}</p> : null}

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-white shadow-[0_4px_20px_rgba(14,165,233,0.30)] transition-all hover:-translate-y-px hover:shadow-[0_6px_28px_rgba(14,165,233,0.40)] disabled:cursor-not-allowed disabled:opacity-80"
                disabled={forgotLoading}
              >
                {forgotLoading ? "Checking…" : "Continue"}
                {!forgotLoading && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                )}
              </button>
            </form>
          </div>
        ) : null}

        {step === "verify" ? (
          <div className="w-full max-w-[420px] animate-[fadeSlideUp_0.6s_ease]">
            <button
              type="button"
              className="mb-6 text-xs text-text-secondary underline transition-colors hover:text-foreground"
              onClick={() => { setStep("forgot"); setForgotError(null); }}
            >
              &larr; Back
            </button>
            <h2 className="mb-2 font-serif text-[28px] leading-[1.1]">Verify your identity</h2>
            <p className="mb-6 text-sm font-light text-text-secondary">
              Answer <strong>any one</strong> of the questions below to prove it&apos;s you.
            </p>

            <form onSubmit={handleVerifySubmit} noValidate className="space-y-3">
              <FormField label="Recovery code" htmlFor="v-code">
                <Input
                  id="v-code"
                  type="text"
                  placeholder="khosh-xxxx-xxxx"
                  className="bg-app-input border-app-border focus-visible:border-accent"
                  value={recoveryCode}
                  onChange={(e) => { setRecoveryCode(e.target.value); setForgotError(null); }}
                  autoComplete="off"
                />
              </FormField>

              <div className="flex items-center gap-2.5">
                <div className="h-px flex-1 bg-app-border" />
                <span className="text-[11px] text-text-secondary">or</span>
                <div className="h-px flex-1 bg-app-border" />
              </div>

              <FormField label="Favourite animal" htmlFor="v-animal">
                <Input
                  id="v-animal"
                  type="text"
                  placeholder="e.g. elephant"
                  className="bg-app-input border-app-border focus-visible:border-accent"
                  value={favAnimal}
                  onChange={(e) => { setFavAnimal(e.target.value); setForgotError(null); }}
                  autoComplete="off"
                />
              </FormField>

              <div className="flex items-center gap-2.5">
                <div className="h-px flex-1 bg-app-border" />
                <span className="text-[11px] text-text-secondary">or</span>
                <div className="h-px flex-1 bg-app-border" />
              </div>

              <FormField label="Favourite person's name" htmlFor="v-person">
                <Input
                  id="v-person"
                  type="text"
                  placeholder="e.g. grandmother"
                  className="bg-app-input border-app-border focus-visible:border-accent"
                  value={favPerson}
                  onChange={(e) => { setFavPerson(e.target.value); setForgotError(null); }}
                  autoComplete="off"
                />
              </FormField>

              {forgotError ? <p className="mb-3 text-xs text-destructive">{forgotError}</p> : null}

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-white shadow-[0_4px_20px_rgba(14,165,233,0.30)] transition-all hover:-translate-y-px hover:shadow-[0_6px_28px_rgba(14,165,233,0.40)] disabled:cursor-not-allowed disabled:opacity-80"
                disabled={forgotLoading}
              >
                {forgotLoading ? "Verifying…" : "Verify & reset password"}
                {!forgotLoading && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                )}
              </button>
            </form>
          </div>
        ) : null}
      </section>
    </main>
  );
}
