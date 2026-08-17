import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeSlash,
  GoogleLogo,
  Sparkle,
} from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Button, Field, Logo, Page } from "../components/ui";
import { FloatingCelebration } from "../components/Celebration";

export function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nav = useNavigate();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      if (mode === "in")
        await api.signIn(
          String(form.get("email")),
          String(form.get("password")),
        );
      else
        await api.signUp(
          String(form.get("email")),
          String(form.get("password")),
          String(form.get("name")),
        );
      nav("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }
  return (
    <Page className="auth-page">
      <div className="auth-brand">
        <Link to="/" className="back">
          <ArrowLeft /> Back home
        </Link>
        <Logo />
        <FloatingCelebration />
        <div>
          <span>
            <Sparkle /> Made to be remembered
          </span>
          <h1>Bring every beautiful message into one place.</h1>
          <p>
            For birthdays, weddings, graduations, and all the moments worth
            keeping.
          </p>
        </div>
      </div>
      <main className="auth-panel">
        <div className="auth-box">
          <span className="mobile-logo">
            <Logo />
          </span>
          <h2>
            {mode === "in" ? "Welcome back" : "Create your Huraay account"}
          </h2>
          <p>
            {mode === "in"
              ? "Your celebrations are waiting."
              : "Your first board is only a minute away."}
          </p>
          <button
            className="social"
            onClick={async () => {
              try {
                await api.signInWithGoogle();
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Google sign in could not start",
                );
              }
            }}
          >
            <GoogleLogo weight="bold" /> Continue with Google
          </button>
          <div className="or">
            <span />
            or continue with email
            <span />
          </div>
          <form onSubmit={submit}>
            {mode === "up" && (
              <Field label="Your name">
                <input name="name" required placeholder="Amani Mensah" />
              </Field>
            )}
            <Field label="Email address">
              <input
                name="email"
                type="email"
                required
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password">
              <div className="password">
                <input
                  name="password"
                  type={show ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                />
                <button type="button" onClick={() => setShow(!show)}>
                  {show ? <EyeSlash /> : <Eye />}
                </button>
              </div>
            </Field>
            {error && <div className="form-error">{error}</div>}
            <Button type="submit" disabled={loading}>
              {loading
                ? "Please wait..."
                : mode === "in"
                  ? "Sign in"
                  : "Create account"}{" "}
              <ArrowRight />
            </Button>
          </form>
          <p className="auth-switch">
            {mode === "in" ? "New to Huraay? " : "Already have an account? "}
            <button onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </main>
    </Page>
  );
}
