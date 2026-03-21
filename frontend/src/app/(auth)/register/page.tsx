"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

import NavBar from "@/components/public/sections/NavBar";
import { useAuth } from "@/hooks";
import { FormField } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/ui/password-input";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Copy, Check } from "lucide-react";

type FormErrors = {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

function emailIsValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function RegisterPage() {
  const router = useRouter();
  const orbRef = useRef<HTMLDivElement | null>(null);
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};

    if (!firstName.trim()) nextErrors.firstName = "Please enter your first name";
    if (!lastName.trim()) nextErrors.lastName = "Please enter your last name";
    if (!username.trim()) nextErrors.username = "Please choose a username";
    if (!email.trim()) nextErrors.email = "Please enter your email";
    else if (!emailIsValid(email)) nextErrors.email = "Please enter a valid email";
    if (!password.trim()) nextErrors.password = "Please create a password";
    else if (password.length < 6) nextErrors.password = "Password must be at least 6 characters";
    if (!confirmPassword.trim()) nextErrors.confirmPassword = "Please confirm your password";
    else if (confirmPassword !== password) nextErrors.confirmPassword = "Passwords do not match";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();

    try {
      const code = await register(
        username.trim().toLowerCase(),
        email.trim().toLowerCase(),
        displayName,
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

  const genderOptions = ["Male", "Female", "Non-binary", "Prefer not to say"] as const;

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
        className="pointer-events-none fixed z-0 h-[400px] w-[400px] -bottom-[150px] -left-[100px] rounded-full blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(123,110,246,0.08) 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-5 pb-8 pt-24 sm:pt-28">
        {recoveryCode ? (
          <div className="w-full max-w-[420px] rounded-[18px] border border-app-border bg-app-panel/82 p-6 text-center backdrop-blur-[10px]">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[20px] bg-accent2/12">
              <ShieldCheck className="h-9 w-9 text-accent2" />
            </div>
            <h1 className="mb-2 font-serif text-[clamp(28px,5vw,40px)] leading-[1.1]">Save your recovery code</h1>
            <p className="mb-5 text-sm text-text-secondary">
              This is shown <strong>only once</strong>. Store it somewhere safe —
              you will need it to recover your account if you forget your password.
            </p>

            <div className="mb-3 flex items-center justify-between gap-2.5 rounded-xl border border-accent2/30 bg-app-bg p-4">
              <span className="font-mono text-xl font-bold tracking-[0.08em] text-[#c4bdff]">
                {recoveryCode}
              </span>
              <button
                type="button"
                className="flex rounded-md p-1.5 text-accent2 transition-colors hover:bg-accent2/15"
                onClick={copyCode}
                aria-label="Copy code"
              >
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <p className="mb-6 text-xs leading-relaxed text-text-secondary">
              Your favourite animal and person name also work as backup — any one of the three unlocks your account.
            </p>

            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-white shadow-[0_4px_20px_rgba(14,165,233,0.30)] transition-all hover:-translate-y-px hover:shadow-[0_6px_28px_rgba(14,165,233,0.40)]"
              onClick={() => router.push("/threads")}
            >
              I&apos;ve saved it — continue
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          </div>
        ) : (
          <div className="w-full max-w-[420px] rounded-[18px] border border-app-border bg-app-panel/82 p-5 backdrop-blur-[10px] sm:p-6">
            <h1 className="mb-2 font-serif text-[clamp(32px,5vw,46px)] leading-[1]">Create account</h1>
            <p className="mb-5 text-sm text-text-secondary">Join KhoshGolpo and start thoughtful conversations.</p>

            <form onSubmit={onSubmit} noValidate className="space-y-3">
              {/* Name row */}
              <div className="flex gap-2.5">
                <FormField label="First name" htmlFor="register-first-name" error={errors.firstName} className="flex-1">
                  <Input
                    id="register-first-name"
                    type="text"
                    placeholder="First"
                    className="bg-app-input border-app-border focus-visible:border-accent"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </FormField>
                <FormField label="Last name" htmlFor="register-last-name" error={errors.lastName} className="flex-1">
                  <Input
                    id="register-last-name"
                    type="text"
                    placeholder="Last"
                    className="bg-app-input border-app-border focus-visible:border-accent"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </FormField>
              </div>

              {/* Gender */}
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Gender
                  <span className="rounded px-1.5 py-px text-[10px] font-bold uppercase tracking-wider bg-accent2/15 text-accent2">
                    optional
                  </span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {genderOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={[
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                        gender === opt
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-app-border bg-app-input text-text-secondary hover:border-accent hover:text-foreground",
                      ].join(" ")}
                      onClick={() => setGender((prev) => (prev === opt ? "" : opt))}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <FormField label="Username" htmlFor="register-username" error={errors.username}>
                <Input
                  id="register-username"
                  type="text"
                  placeholder="your_username"
                  className="bg-app-input border-app-border focus-visible:border-accent"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </FormField>

              <FormField label="Email" htmlFor="register-email" error={errors.email}>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="you@example.com"
                  className="bg-app-input border-app-border focus-visible:border-accent"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormField>

              <FormField label="Password" htmlFor="register-password" error={errors.password}>
                <PasswordInput
                  id="register-password"
                  placeholder="Create password"
                  className="bg-app-input border-app-border focus-visible:border-accent"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormField>

              <FormField label="Confirm password" htmlFor="register-confirm-password" error={errors.confirmPassword}>
                <PasswordInput
                  id="register-confirm-password"
                  placeholder="Repeat password"
                  className="bg-app-input border-app-border focus-visible:border-accent"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </FormField>

              {/* Account recovery section */}
              <div className="rounded-xl border border-accent2/20 bg-accent2/4 p-3.5">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#a89cf7]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Account recovery
                  <span className="rounded px-1.5 py-px text-[10px] font-bold uppercase tracking-wider bg-accent2/15 text-accent2">
                    optional
                  </span>
                </div>
                <p className="mb-2.5 text-xs text-text-secondary">
                  Set at least one so you can recover your account without email.
                </p>
                <div className="space-y-2">
                  <FormField label="Favourite animal" htmlFor="register-animal">
                    <Input
                      id="register-animal"
                      type="text"
                      placeholder="e.g. elephant"
                      className="bg-app-input border-app-border focus-visible:border-accent"
                      value={favAnimal}
                      onChange={(e) => setFavAnimal(e.target.value)}
                      autoComplete="off"
                    />
                  </FormField>
                  <FormField label="Favourite person's name" htmlFor="register-person">
                    <Input
                      id="register-person"
                      type="text"
                      placeholder="e.g. grandmother"
                      className="bg-app-input border-app-border focus-visible:border-accent"
                      value={favPerson}
                      onChange={(e) => setFavPerson(e.target.value)}
                      autoComplete="off"
                    />
                  </FormField>
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-white shadow-[0_4px_20px_rgba(14,165,233,0.25)] transition-all hover:-translate-y-px hover:shadow-[0_6px_28px_rgba(14,165,233,0.35)] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create account"}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>

              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </form>

            <p className="mt-4 text-sm text-text-secondary">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-accent underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
