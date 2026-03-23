"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { MessageSquare, Sparkles, Users, ArrowRight, Loader2 } from "lucide-react";

import { useAuth } from "@/hooks";
import { apiPost } from "@/lib/api";
import { useAuthStore } from "@/store";
import { FormField } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/ui/password-input";
import { Input } from "@/components/ui/input";

type Step = "login" | "forgot" | "verify";
type FormErrors = { email?: string; password?: string };
type VerifyIdentityResponse = { identity_token?: string; needs_questions?: boolean };

function emailIsValid(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

/* ── Shared: submit button ─────────────────────────────────────────────── */
function SubmitBtn({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-primary/90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : null}
      {loading ? loadingLabel : label}
      {!loading && <ArrowRight size={16} />}
    </button>
  );
}

/* ── Shared: divider ───────────────────────────────────────────────────── */
function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border/60" />
      <span className="text-[12px] text-foreground/40">{label}</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

/* ── Left branding panel ───────────────────────────────────────────────── */
function BrandPanel() {
  return (
    <div className="relative hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between overflow-hidden bg-[#080a10] px-12 py-14">
      {/* gradient blob */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, rgba(14,165,233,0.35) 0%, transparent 65%)" }} />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-[400px] w-[400px] rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, rgba(124,115,240,0.45) 0%, transparent 65%)" }} />

      {/* logo */}
      <div className="relative z-10">
        <div className="mb-2 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <MessageSquare size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-serif text-[22px] font-bold text-white">KhoshGolpo</span>
        </div>
      </div>

      {/* hero text */}
      <div className="relative z-10 my-auto">
        <h2 className="mb-4 font-serif text-[42px] font-bold leading-[1.1] text-white">
          Where ideas<br />spark conversations.
        </h2>
        <p className="mb-12 text-[16px] leading-relaxed text-white/60">
          A thoughtful community for developers, designers, and curious minds.
        </p>

        <div className="flex flex-col gap-5">
          {[
            { icon: <MessageSquare size={18} />, title: "Deep discussions", desc: "Threaded conversations that actually go somewhere." },
            { icon: <Users size={18} />, title: "Real community", desc: "Follow people, not just topics. Build your network." },
            { icon: <Sparkles size={18} />, title: "AI-assisted moderation", desc: "Quality content surfaced, noise filtered automatically." },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3.5">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/8 text-primary">
                {f.icon}
              </div>
              <div>
                <p className="text-[14px] font-semibold text-white">{f.title}</p>
                <p className="text-[13px] text-white/50">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* bottom quote */}
      <div className="relative z-10">
        <p className="text-[13px] italic text-white/35">&ldquo;The best communities are the ones that make you smarter.&rdquo;</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, error, user, accessToken } = useAuth();

  const [authHydrated, setAuthHydrated] = useState(false);
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const [recoveryCode, setRecoveryCode] = useState("");
  const [favAnimal, setFavAnimal] = useState("");
  const [favPerson, setFavPerson] = useState("");

  useEffect(() => {
    setAuthHydrated(useAuthStore.persist.hasHydrated());
    const unsub = useAuthStore.persist.onFinishHydration(() => setAuthHydrated(true));
    return unsub;
  }, []);

  useEffect(() => {
    if (!authHydrated || !user || !accessToken) return;
    router.replace(searchParams.get("next") ?? "/threads");
  }, [accessToken, authHydrated, router, user]);

  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: FormErrors = {};
    if (!email.trim()) next.email = "Please enter your email";
    else if (!emailIsValid(email)) next.email = "Please enter a valid email";
    if (!password.trim()) next.password = "Please enter your password";
    else if (password.length < 6) next.password = "Password must be at least 6 characters";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    try { await login(email.trim().toLowerCase(), password, rememberMe); router.push(searchParams.get("next") ?? "/threads"); } catch {}
  };

  const handleForgotSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) { setForgotError("Please enter your email or username"); return; }
    setForgotLoading(true); setForgotError(null);
    try {
      const res = await apiPost<VerifyIdentityResponse>("auth/verify-identity", { identifier: forgotIdentifier.trim().toLowerCase() });
      if (res.identity_token) router.push(`/reset-password?token=${res.identity_token}`);
      else setStep("verify");
    } catch { setForgotError("No account found with that email or username."); }
    finally { setForgotLoading(false); }
  };

  const handleVerifySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!recoveryCode.trim() && !favAnimal.trim() && !favPerson.trim()) { setForgotError("Please fill in at least one field"); return; }
    setForgotLoading(true); setForgotError(null);
    try {
      const res = await apiPost<VerifyIdentityResponse>("auth/verify-identity", {
        identifier: forgotIdentifier.trim().toLowerCase(),
        recovery_code: recoveryCode.trim() || undefined,
        fav_animal: favAnimal.trim() || undefined,
        fav_person: favPerson.trim() || undefined,
      });
      router.push(`/reset-password?token=${res.identity_token}`);
    } catch { setForgotError("Security answer incorrect. Please try again."); setForgotLoading(false); }
  };

  if (!authHydrated || (user && accessToken)) return null;

  return (
    <main className="flex min-h-screen bg-background text-foreground">
      <BrandPanel />

      {/* ── Right: form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-12 sm:px-10">

        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <MessageSquare size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-serif text-[20px] font-bold">KhoshGolpo</span>
        </div>

        <div className="w-full max-w-[400px]">

          {/* ── STEP: login ── */}
          {step === "login" && (
            <div className="animate-[fadeSlideUp_0.4s_ease]">
              <h1 className="mb-1 font-serif text-[32px] font-bold leading-tight">Welcome back</h1>
              <p className="mb-8 text-[15px] text-foreground/60">Sign in to continue your conversations.</p>

              <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
                <FormField label="Email" htmlFor="login-email" error={errors.email}>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: undefined })); }}
                  />
                </FormField>

                <FormField label="Password" htmlFor="login-password" error={errors.password}>
                  <PasswordInput
                    id="login-password"
                    placeholder="Your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: undefined })); }}
                  />
                </FormField>

                <div className="flex items-center justify-between">
                  <label htmlFor="remember-me" className="flex cursor-pointer items-center gap-2 text-[13px] text-foreground/60 select-none">
                    <input
                      id="remember-me"
                      type="checkbox"
                      className="h-4 w-4 rounded accent-primary cursor-pointer"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    className="text-[13px] text-primary hover:underline cursor-pointer"
                    onClick={() => { setForgotIdentifier(email); setStep("forgot"); }}
                  >
                    Forgot password?
                  </button>
                </div>

                <SubmitBtn loading={isLoading} label="Sign in" loadingLabel="Signing in…" />
                {error && <p className="text-[13px] text-destructive">{error}</p>}
              </form>

              <p className="mt-6 text-center text-[14px] text-foreground/60">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-semibold text-primary hover:underline">
                  Create one free
                </Link>
              </p>

              {/* Demo hint */}
              <div className="mt-8 rounded-xl border border-border/60 bg-card/50 p-4">
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-foreground/40">Demo accounts</p>
                <div className="space-y-1">
                  {[
                    ["user1@demo.com", "user1demo"],
                    ["admin@demo.com", "admin1234"],
                  ].map(([em, pw]) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => { setEmail(em); setPassword(pw); }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[12px] hover:bg-card-hover cursor-pointer transition-colors"
                    >
                      <span className="font-mono text-foreground/70">{em}</span>
                      <span className="font-mono text-foreground/40">{pw}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: forgot ── */}
          {step === "forgot" && (
            <div className="animate-[fadeSlideUp_0.4s_ease]">
              <button type="button" onClick={() => setStep("login")}
                className="mb-6 flex items-center gap-1.5 text-[13px] text-foreground/50 hover:text-foreground transition-colors cursor-pointer">
                <ArrowRight size={13} className="rotate-180" /> Back to sign in
              </button>
              <h1 className="mb-1 font-serif text-[30px] font-bold">Recover account</h1>
              <p className="mb-8 text-[15px] text-foreground/60">Enter your email or username to get started.</p>

              <form onSubmit={handleForgotSubmit} noValidate className="space-y-4">
                <FormField label="Email or username" htmlFor="forgot-id">
                  <Input
                    id="forgot-id"
                    type="text"
                    placeholder="you@example.com or username"
                    autoComplete="username"
                    value={forgotIdentifier}
                    onChange={(e) => { setForgotIdentifier(e.target.value); setForgotError(null); }}
                  />
                </FormField>
                {forgotError && <p className="text-[13px] text-destructive">{forgotError}</p>}
                <SubmitBtn loading={forgotLoading} label="Continue" loadingLabel="Checking…" />
              </form>
            </div>
          )}

          {/* ── STEP: verify ── */}
          {step === "verify" && (
            <div className="animate-[fadeSlideUp_0.4s_ease]">
              <button type="button" onClick={() => { setStep("forgot"); setForgotError(null); }}
                className="mb-6 flex items-center gap-1.5 text-[13px] text-foreground/50 hover:text-foreground transition-colors cursor-pointer">
                <ArrowRight size={13} className="rotate-180" /> Back
              </button>
              <h1 className="mb-1 font-serif text-[30px] font-bold">Verify your identity</h1>
              <p className="mb-8 text-[15px] text-foreground/60">
                Fill in <strong>any one</strong> of the fields below to prove it&apos;s you.
              </p>

              <form onSubmit={handleVerifySubmit} noValidate className="space-y-3">
                <FormField label="Recovery code" htmlFor="v-code">
                  <Input id="v-code" type="text" placeholder="khosh-xxxx-xxxx" autoComplete="off"
                    value={recoveryCode} onChange={(e) => { setRecoveryCode(e.target.value); setForgotError(null); }} />
                </FormField>
                <Divider label="or" />
                <FormField label="Favourite animal" htmlFor="v-animal">
                  <Input id="v-animal" type="text" placeholder="e.g. elephant" autoComplete="off"
                    value={favAnimal} onChange={(e) => { setFavAnimal(e.target.value); setForgotError(null); }} />
                </FormField>
                <Divider label="or" />
                <FormField label="Favourite person's name" htmlFor="v-person">
                  <Input id="v-person" type="text" placeholder="e.g. grandmother" autoComplete="off"
                    value={favPerson} onChange={(e) => { setFavPerson(e.target.value); setForgotError(null); }} />
                </FormField>
                {forgotError && <p className="text-[13px] text-destructive">{forgotError}</p>}
                <div className="pt-1">
                  <SubmitBtn loading={forgotLoading} label="Verify & reset password" loadingLabel="Verifying…" />
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
