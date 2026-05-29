"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";

export function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = window.localStorage.getItem("pet-villa-session");
    if (!session) {
      const redirect = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/auth?redirect=${encodeURIComponent(redirect)}`;
      return;
    }
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <main className="villa-shell grid min-h-screen place-items-center p-4">
        <div className="villa-card text-center">
          <h1 className="section-title">{t({ en: "Checking login...", zh: "正在检查登录状态..." })}</h1>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
