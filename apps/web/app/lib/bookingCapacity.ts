"use client";

import { readOrders, type VillaOrder } from "./orderFlow";
import { isBusinessOrder } from "./safeVoid";

export const MAX_DOGS_PER_DAY = 3;

const OCCUPYING_STATUSES = new Set<VillaOrder["status"]>(["confirmed", "active", "staying", "awaiting_checkout", "ready_pickup"]);

export function toDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value || String(date.getFullYear());
  const month = parts.find((part) => part.type === "month")?.value || String(date.getMonth() + 1).padStart(2, "0");
  const day = parts.find((part) => part.type === "day")?.value || String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function eachDateInRange(start: Date, end: Date) {
  const first = startOfLocalDay(start);
  const last = startOfLocalDay(end);
  const dates: Date[] = [];
  for (let cursor = first; cursor <= last; cursor = addDays(cursor, 1)) {
    dates.push(cursor);
  }
  return dates;
}

export function parseOrderDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDateRange(start: Date, end: Date) {
  return toDateKey(start) === toDateKey(end) ? formatShortDate(start) : `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

export function daysInclusive(start: Date, end: Date) {
  const ms = startOfLocalDay(end).getTime() - startOfLocalDay(start).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

function fallbackDatesFromLabel(order: VillaOrder) {
  const year = new Date().getFullYear();
  const matches = [...order.dateLabel.matchAll(/([A-Za-z]{3})\s+(\d{1,2})/g)];
  if (!matches.length) return null;
  const start = new Date(`${matches[0][1]} ${matches[0][2]}, ${year}`);
  const endMatch = matches[matches.length - 1];
  const end = new Date(`${endMatch[1]} ${endMatch[2]}, ${year}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

export function getOrderDateRange(order: VillaOrder) {
  const start = parseOrderDate(order.startDateISO);
  const end = parseOrderDate(order.endDateISO);
  if (start && end) return { start, end };
  return fallbackDatesFromLabel(order);
}

export function orderOccupiesCapacity(order: VillaOrder) {
  return isBusinessOrder(order) && OCCUPYING_STATUSES.has(order.status);
}

export function buildCapacityMap(orders = readOrders()) {
  const usage: Record<string, number> = {};
  for (const order of orders) {
    if (!orderOccupiesCapacity(order)) continue;
    const range = getOrderDateRange(order);
    if (!range) continue;
    const dogCount = Math.max(0, order.pets?.length || 0);
    for (const date of eachDateInRange(range.start, range.end)) {
      const key = toDateKey(date);
      usage[key] = (usage[key] || 0) + dogCount;
    }
  }
  return usage;
}

export function availableSlotsForDate(date: Date, usage = buildCapacityMap()) {
  return Math.max(0, MAX_DOGS_PER_DAY - (usage[toDateKey(date)] || 0));
}

export function firstCapacityIssue(start: Date, end: Date, selectedPetCount: number, usage = buildCapacityMap()) {
  for (const date of eachDateInRange(start, end)) {
    const available = availableSlotsForDate(date, usage);
    if (selectedPetCount > available) {
      return { date, available };
    }
  }
  return null;
}
