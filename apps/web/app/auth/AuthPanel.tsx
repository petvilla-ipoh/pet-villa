"use client";

import { useState } from "react";
import { apiRequest, clearSession, getSession, saveSession, type WebSession } from "../lib/browserApi";
import { Button } from "../ui/Button";
import { Notice } from "../ui/Notice";

export function AuthPanel() {
  const [mode, setMode] = useState<"owner" | "host">("owner");
  const [session, setSession] = useState<WebSession | null>(() => getSession());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function register(formData: FormData) {
    setError("");
    const body = {
      role: mode,
      name: String(formData.get("name")),
      phone: String(formData.get("phone")),
      email: String(formData.get("email")),
      password: String(formData.get("password"))
    };
    try {
      const data = await apiRequest<WebSession>("/auth/register", {
        method: "POST",
        body: JSON.stringify(body)
      });
      saveSession(data);
      setSession(data);
      setMessage(`${data.user.name} registered as ${data.user.role}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    }
  }

  async function login(formData: FormData) {
    setError("");
    try {
      const data = await apiRequest<WebSession>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: String(formData.get("loginEmail")),
          password: String(formData.get("loginPassword"))
        })
      });
      saveSession(data);
      setSession(data);
      setMessage(`Logged in as ${data.user.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    }
  }

  function logout() {
    clearSession();
    setSession(null);
    setMessage("Logged out.");
  }

  return (
    <div className="interactivePanel">
      {session ? (
        <Notice tone="success">Current session: {session.user.name} ({session.user.role})</Notice>
      ) : (
        <Notice>Register or login first. Your user id is stored locally for API calls.</Notice>
      )}
      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="segmented">
        <button className={mode === "owner" ? "active" : ""} onClick={() => setMode("owner")}>Owner</button>
        <button className={mode === "host" ? "active" : ""} onClick={() => setMode("host")}>Host</button>
      </div>

      <form onSubmit={(event) => { event.preventDefault(); register(new FormData(event.currentTarget)); }} className="formGrid">
        <label className="field">Name<input name="name" defaultValue={mode === "host" ? "The Pet Villa Host" : "Mei Ling"} /></label>
        <label className="field">Phone<input name="phone" defaultValue="+60123456789" /></label>
        <label className="field">Email<input name="email" type="email" defaultValue={`${mode}-${Date.now()}@example.test`} /></label>
        <label className="field">Password<input name="password" type="password" defaultValue="secret123" /></label>
        <Button type="submit">Register {mode}</Button>
      </form>

      <form onSubmit={(event) => { event.preventDefault(); login(new FormData(event.currentTarget)); }} className="formGrid">
        <label className="field">Email<input name="loginEmail" type="email" placeholder="email@example.com" /></label>
        <label className="field">Password<input name="loginPassword" type="password" defaultValue="secret123" /></label>
        <Button type="submit" variant="secondary">Login</Button>
        <Button type="button" variant="ghost" onClick={logout}>Logout</Button>
      </form>
    </div>
  );
}
