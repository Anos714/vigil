"use client";

import { Loader2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { BrandLink } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-4", className)}
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.88-3c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.26A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.26 5.38l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.62l4.01 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

export function AuthForm({
  googleConfigured = true,
}: {
  googleConfigured?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { data: session, isPending } = authClient.useSession();

  async function signInWithGoogle() {
    if (!googleConfigured) {
      toast.error("Google sign-in is not configured", {
        description:
          "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local, then restart the dev server. The sample workspace below is available now.",
      });
      return;
    }
    setLoading(true);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
        errorCallbackURL: "/login",
      });

      if (result.error) {
        toast.error("Google sign-in is not configured", {
          description:
            "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local, then restart the dev server.",
        });
      }
    } catch {
      toast.error("Google sign-in is not available yet", {
        description:
          "This preview needs Google OAuth credentials. Use the sample workspace below to explore the product.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper lg:grid lg:grid-cols-[1.02fr_0.98fr]">
      <aside className="relative hidden min-h-dvh overflow-hidden bg-ink p-10 text-paper lg:flex lg:flex-col xl:p-14">
        <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(to_right,var(--paper)_1px,transparent_1px),linear-gradient(to_bottom,var(--paper)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="absolute -right-32 -top-24 size-[420px] rounded-full bg-signal/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 size-[360px] rounded-full bg-violet/10 blur-3xl" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-paper">
              <span className="size-4 rounded-[3px] bg-ink p-[3px]">
                <span className="grid size-full grid-cols-2 gap-[2px]">
                  <span className="rounded-[1px] bg-paper/45" />
                  <span className="rounded-[1px] bg-paper/45" />
                  <span className="rounded-[1px] bg-paper/45" />
                  <span className="rounded-[1px] bg-signal" />
                </span>
              </span>
            </span>
            <span className="text-lg font-semibold tracking-[-0.045em]">
              vigil
            </span>
          </div>
          <span className="rounded-full border border-paper/15 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-paper/55">
            self-hosted
          </span>
        </div>

        <div className="relative my-auto max-w-lg">
          <div className="mono-label mb-5 flex items-center gap-2 text-paper/45">
            <span className="size-1.5 rounded-full bg-signal" />
            API performance, without the meter running
          </div>
          <h1 className="display text-[clamp(2.6rem,5vw,4.7rem)] text-paper">
            Know before
            <br />
            they <span className="serif-accent text-signal">notice.</span>
          </h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-paper/60">
            Every check, every millisecond, every incident — designed to live in
            your own Postgres. No per-monitor pricing. No black box. This
            preview runs on labelled sample data with a live API status card.
          </p>

          <div className="mt-10 max-w-sm rounded-2xl border border-paper/10 bg-paper/[0.045] p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-paper/10 pb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/45">
                Sample edge
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-signal">
                <span className="size-1.5 animate-pulse rounded-full bg-signal" />{" "}
                nominal
              </span>
            </div>
            <div className="mt-3 space-y-2.5">
              {[
                ["api.acme.dev", "42ms", "up"],
                ["checkout.acme.dev", "684ms", "degraded"],
                ["auth.acme.dev", "48ms", "up"],
              ].map(([name, latency, state]) => (
                <div
                  key={name}
                  className="flex items-center gap-2.5 font-mono text-[11px]"
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      state === "up" ? "bg-signal" : "bg-warning",
                    )}
                  />
                  <span className="flex-1 text-paper/65">{name}</span>
                  <span className="text-paper/40">{latency}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-2 font-mono text-[10px] text-paper/35">
          <ShieldCheck className="size-3.5" />
          Better Auth · Google OAuth · SQLite preview store
        </div>
      </aside>

      <main className="relative flex flex-1 flex-col px-5 py-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between lg:justify-end">
          <div className="lg:hidden">
            <BrandLink />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex h-8 items-center rounded-lg border border-line bg-card px-2.5 text-xs text-muted-ink transition-colors hover:text-ink"
            >
              Back to site
            </Link>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[400px]">
            <div className="mono-label mb-4 flex items-center gap-2 text-muted-ink">
              <span className="size-1.5 rounded-full bg-signal-deep" />
              Sign in to your workspace
            </div>
            <h2 className="display text-[clamp(2.1rem,5vw,3rem)]">
              Welcome back
              <span className="serif-accent text-signal-deep">.</span>
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-ink">
              One provider. One click. Your own data.
            </p>

            {session?.user ? (
              <div className="mt-7 rounded-2xl border border-positive/25 bg-positive/[0.045] p-4">
                <p className="text-sm font-medium">
                  You are already signed in.
                </p>
                <p className="mt-1 text-xs text-muted-ink">
                  {session.user.name} · {session.user.email}
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "mt-4 h-9 w-full bg-ink text-xs text-paper",
                  )}
                >
                  Continue to dashboard
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={loading || isPending}
                className="mt-7 flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-line bg-card text-sm font-medium transition-colors hover:border-ink/20 hover:bg-secondary/50 disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </button>
            )}

            <div className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-ink/70">
              <LockKeyhole className="size-3" />
              {googleConfigured
                ? "Google is the only sign-in method"
                : "Google is the only sign-in method · keys needed"}
            </div>

            <div className="my-7 flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-ink">
                or preview
              </span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-10 w-full gap-2 rounded-xl border-line bg-transparent text-xs",
              )}
            >
              <Sparkles className="size-3.5 text-signal-deep" />
              Explore the sample workspace
            </Link>
            <p className="mt-3 text-center text-[10px] leading-4 text-muted-ink/75">
              The sample workspace is public in this preview. Google OAuth is
              wired through Better Auth and activates when credentials are
              present.
            </p>

            <p className="mt-8 text-center text-[10px] leading-5 text-muted-ink">
              By continuing you agree to the{" "}
              <span className="underline decoration-line underline-offset-2">
                Terms
              </span>{" "}
              and{" "}
              <span className="underline decoration-line underline-offset-2">
                Privacy Policy
              </span>
              .
            </p>
          </div>
        </div>

        <footer className="flex items-center justify-between font-mono text-[9px] text-muted-ink/60">
          <span>© 2026 Vigil</span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-positive" />
            api operational
          </span>
        </footer>
      </main>
    </div>
  );
}
