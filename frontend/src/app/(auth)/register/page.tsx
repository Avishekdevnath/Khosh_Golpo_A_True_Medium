"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { MessageSquare, ShieldCheck, Copy, Check, ArrowRight, Loader2 } from "lucide-react";

import { useAuth } from "@/hooks";
import { FormField } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/ui/password-input";
import { Input } from "@/components/ui/input";

type FormErrors = {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

function emailIsValid(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"] as const;

/* ── Left branding panel ───────────────────────────────────────────────── */
function BrandPanel() {
  return (
    <div className="relative hidden lg:flex lg:w-[420px] xl:w-[460px] shrink-0 flex-col justify-between overflow-hidden bg-[#080a10] px-12 py-14">
      <div className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, rgba(14,165,233,0.35) 0%, transparent 65%)" }} />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-[400px] w-[400px] rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, rgba(124,115,240,0.45) 0%, transparent 65%)" }} />

      <div className="relative z-10 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
          <MessageSquare size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="font-serif text-[22px] font-bold text-white">KhoshGolpo</span>
      </div>

      <div className="relative z-10 my-auto">
        <h2 className="mb-4 font-serif text-[38px] font-bold leading-[1.1] text-white">
          Join a community<br />worth your time.
        </h2>
        <p className="mb-10 text-[15px] leading-relaxed text-white/55">
          Create your account in under a minute. Free forever.
        </p>

        <div className="flex flex-col gap-4">
          {[
            "No algorithmic feed — just conversations you chose",
            "Follow people and topics that matter to you",
            "AI moderation keeps quality high",
            "Your recovery code keeps your account safe",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <p className="text-[14px] text-white/60">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10">
        <p className="text-[13px] italic text-white/30">&ldquo;Ship less noise. Grow more signal.&rdquo;</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [favAnimal, setFavAnimal] = useState("");
  const [favPerson, setFavPerson] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: FormErrors = {};
    if (!firstName.trim()) next.firstName = "Required";
    if (!lastName.trim()) next.lastName = "Required";
    if (!username.trim()) next.username = "Please choose a username";
    if (!email.trim()) next.email = "Please enter your email";
    else if (!emailIsValid(email)) next.email = "Please enter a valid email";
    if (!password.trim()) next.password = "Please create a password";
    else if (password.length < 6) next.password = "At least 6 characters";
    if (!confirmPassword.trim()) next.confirmPassword = "Please confirm your password";
    else if (confirmPassword !== password) next.confirmPassword = "Passwords do not match";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      const code = await register(
        username.trim().toLowerCase(),
        email.trim().toLowerCase(),
        `${firstName.trim()} ${lastName.trim()}`.trim(),
        password,
        {
          fav_animal: favAnimal.trim() || undefined,
          fav_person: favPerson.trim() || undefined,
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
          gender: gender || undefined,
        }
      );
      setRecoveryCode(code);
    } catch {}
  }

  function copyCode() {
    if (!recoveryCode) return;
    void navigator.clipboard.writeText(recoveryCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="flex min-h-screen bg-background text-foreground">
      <BrandPanel />

      {/* ── Right: scrollable form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-start overflow-y-auto px-5 py-12 sm:px-10">

        {/* Mobile logo */}
        <div className="mb-8 flex w-full max-w-[440px] items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <MessageSquare size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-serif text-[20px] font-bold">KhoshGolpo</span>
        </div>

        <div className="w-full max-w-[440px]">

          {/* ── Recovery code screen ── */}
          {recoveryCode ? (
            <div className="animate-[fadeSlideUp_0.4s_ease]">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <ShieldCheck size={28} className="text-primary" />
              </div>
              <h1 className="mb-2 font-serif text-[32px] font-bold leading-tight">Save your recovery code</h1>
              <p className="mb-8 text-[15px] text-foreground/60">
                This is shown <strong className="text-foreground">only once</strong>. Store it somewhere safe — you&apos;ll need it if you ever forget your password.
              </p>

              <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
                <span className="font-mono text-[20px] font-bold tracking-[0.08em] text-primary">
                  {recoveryCode}
                </span>
                <button
                  type="button"
                  onClick={copyCode}
                  aria-label="Copy recovery code"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background transition-colors hover:bg-card-hover cursor-pointer"
                >
                  {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} className="text-foreground/60" />}
                </button>
              </div>

              <p className="mb-8 text-[13px] leading-relaxed text-foreground/50">
                Your favourite animal and person name also work as backups — any one of the three unlocks your account.
              </p>

              <button
                type="button"
                onClick={() => router.push("/threads")}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-primary/90"
              >
                I&apos;ve saved it — continue
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (

            /* ── Registration form ── */
            <div className="animate-[fadeSlideUp_0.4s_ease]">
              <h1 className="mb-1 font-serif text-[32px] font-bold leading-tight">Create account</h1>
              <p className="mb-8 text-[15px] text-foreground/60">
                Already have one?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
              </p>

              <form onSubmit={onSubmit} noValidate className="space-y-4">

                {/* Name row */}
                <div className="flex gap-3">
                  <FormField label="First name" htmlFor="reg-first" error={errors.firstName} className="flex-1">
                    <Input id="reg-first" type="text" placeholder="First" autoComplete="given-name"
                      value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </FormField>
                  <FormField label="Last name" htmlFor="reg-last" error={errors.lastName} className="flex-1">
                    <Input id="reg-last" type="text" placeholder="Last" autoComplete="family-name"
                      value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </FormField>
                </div>

                {/* Gender pills */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground/70">Gender</span>
                    <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-foreground/40 border border-border/50">optional</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {GENDER_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setGender((prev) => (prev === opt ? "" : opt))}
                        className={[
                          "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all cursor-pointer",
                          gender === opt
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 bg-card/50 text-foreground/60 hover:border-primary/50 hover:text-foreground",
                        ].join(" ")}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <FormField label="Username" htmlFor="reg-username" error={errors.username}>
                  <Input id="reg-username" type="text" placeholder="your_username" autoComplete="username"
                    value={username} onChange={(e) => setUsername(e.target.value)} />
                </FormField>

                <FormField label="Email" htmlFor="reg-email" error={errors.email}>
                  <Input id="reg-email" type="email" placeholder="you@example.com" autoComplete="email"
                    value={email} onChange={(e) => setEmail(e.target.value)} />
                </FormField>

                <FormField label="Password" htmlFor="reg-password" error={errors.password}>
                  <PasswordInput id="reg-password" placeholder="Create a password" autoComplete="new-password"
                    value={password} onChange={(e) => setPassword(e.target.value)} />
                </FormField>

                <FormField label="Confirm password" htmlFor="reg-confirm" error={errors.confirmPassword}>
                  <PasswordInput id="reg-confirm" placeholder="Repeat your password" autoComplete="new-password"
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </FormField>

                {/* Account recovery */}
                <div className="rounded-xl border border-border/50 bg-card/40 p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <ShieldCheck size={14} className="text-primary" />
                    <span className="text-[13px] font-semibold text-foreground">Account recovery</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">optional</span>
                  </div>
                  <p className="mb-3 text-[12px] leading-relaxed text-foreground/50">
                    Set at least one so you can recover your account without email.
                  </p>
                  <div className="space-y-3">
                    <FormField label="Favourite animal" htmlFor="reg-animal">
                      <Input id="reg-animal" type="text" placeholder="e.g. elephant" autoComplete="off"
                        value={favAnimal} onChange={(e) => setFavAnimal(e.target.value)} />
                    </FormField>
                    <FormField label="Favourite person's name" htmlFor="reg-person">
                      <Input id="reg-person" type="text" placeholder="e.g. grandmother" autoComplete="off"
                        value={favPerson} onChange={(e) => setFavPerson(e.target.value)} />
                    </FormField>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-primary/90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading && <Loader2 size={16} className="animate-spin" />}
                    {isLoading ? "Creating account…" : "Create account"}
                    {!isLoading && <ArrowRight size={16} />}
                  </button>
                </div>

                {error && <p className="text-[13px] text-destructive">{error}</p>}
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
