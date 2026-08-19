"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { hasAuthSession } from "../lib/authSession";

export function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function checkSession() {
      const session = await hasAuthSession();
      if (!active) return;
      if (!session) {
        const redirect = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/auth?redirect=${encodeURIComponent(redirect)}`;
        return;
      }
      setReady(true);
    }
    void checkSession();
    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return (
      <main className="pet-loading-page">
        <div className="pet-loading-card" role="status" aria-live="polite">
          <div className="pet-loading-orbit">
            <img src="/petvilla-app-badge.webp" alt="" />
            <span />
            <span />
          </div>
          <p>{t({ en: "Preparing your Pet Villa space", zh: "正在准备您的 Pet Villa 空间" })}</p>
          <div className="pet-loading-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
