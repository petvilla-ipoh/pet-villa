"use client";

import { useEffect, useMemo, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";
import { readVouchers, type UserVoucher, type VoucherStatus } from "../lib/vouchers";

const tabs: VoucherStatus[] = ["available", "used", "expired"];

function statusClass(status: UserVoucher["status"]) {
  if (status === "available") return "bg-[#eef5eb] text-villa-accent-green";
  if (status === "used") return "bg-villa-primary-bg text-villa-primary";
  return "bg-gray-100 text-gray-500";
}

function statusLabel(status: VoucherStatus) {
  if (status === "available") return { en: "Available", zh: "可使用" };
  if (status === "used") return { en: "Used", zh: "已使用" };
  return { en: "Expired", zh: "已过期" };
}

export default function VouchersPage() {
  const { t, lang } = useLanguage();
  const [vouchers, setVouchers] = useState<UserVoucher[]>([]);
  const [activeTab, setActiveTab] = useState<VoucherStatus>("available");

  useEffect(() => {
    const sync = () => setVouchers(readVouchers());
    sync();
    window.addEventListener("pet-villa-vouchers", sync);
    return () => window.removeEventListener("pet-villa-vouchers", sync);
  }, []);

  const filtered = useMemo(() => vouchers.filter((voucher) => voucher.status === activeTab), [activeTab, vouchers]);

  return (
    <ProtectedPage>
      <OwnerSidebar>
        <section className="p-4 lg:p-8">
          <h1 className="page-title">{t({ en: "My Vouchers", zh: "我的优惠券" })}</h1>
          <p className="body-copy mt-1">{t({ en: "Claimed promotions and referral rewards are saved here.", zh: "已领取的优惠和推荐奖励会保存在这里。" })}</p>

          <div className="mt-5 grid grid-cols-3 gap-2 rounded-[18px] bg-white p-1 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`min-h-[40px] rounded-[14px] text-xs font-black transition ${activeTab === tab ? "bg-villa-primary text-white shadow-md" : "text-villa-text-secondary"}`}
                onClick={() => setActiveTab(tab)}
              >
                {t(statusLabel(tab))}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="villa-card mt-5 text-center">
              <h2 className="card-title">{t({ en: `No ${statusLabel(activeTab).en.toLowerCase()} vouchers`, zh: "暂无优惠券" })}</h2>
              <p className="body-copy mt-2">{t({ en: "Homepage promotions and referral rewards will appear here.", zh: "首页优惠和推荐奖励会显示在这里。" })}</p>
              <a href="/#promotions" className="villa-button mt-4 w-full">{t({ en: "View Promotions", zh: "查看优惠" })}</a>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((voucher) => (
                <article key={voucher.id} className="villa-card flex min-h-[190px] flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-pill bg-villa-primary-bg px-3 py-1 text-xs font-black text-villa-primary">{t(voucher.label)}</span>
                    <span className={`rounded-pill px-3 py-1 text-xs font-black ${statusClass(voucher.status)}`}>{t(statusLabel(voucher.status))}</span>
                  </div>
                  <h2 className="mt-4 font-title text-2xl font-black text-villa-text-primary">{t(voucher.title)}</h2>
                  <p className="body-copy mt-1">{t(voucher.body)}</p>
                  <div className="mt-auto pt-4 text-xs font-bold text-villa-text-secondary">
                    <p className="m-0">Code: <strong className="text-villa-text-primary">{voucher.code}</strong></p>
                    {voucher.usedAt ? <p className="m-0 mt-1">{t({ en: "Used Date", zh: "使用日期" })}: {new Date(voucher.usedAt).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US")}</p> : null}
                    {voucher.orderId ? <p className="m-0 mt-1">Order ID: {voucher.orderId}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </OwnerSidebar>
    </ProtectedPage>
  );
}
