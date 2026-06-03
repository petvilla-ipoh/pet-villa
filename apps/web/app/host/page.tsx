"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { AppNav } from "../components/AppNav";
import { useLanguage } from "../components/LanguageProvider";
import {
  availableSlotsForDate,
  buildCapacityMap,
  formatDateRange,
  getOrderDateRange,
  MAX_DOGS_PER_DAY,
  toDateKey
} from "../lib/bookingCapacity";
import { deleteGuestPhoto, readGuestPhotos, saveGuestPhoto, updateGuestPhoto, type GuestPhoto } from "../lib/gallery";
import { readHostOffDays, writeHostOffDays } from "../lib/hostAvailability";
import { readChatThreads, readMessages, sendMessage, type ChatThread, type VillaMessage } from "../lib/messages";
import { type VillaOrder } from "../lib/orderFlow";
import { readPetProfiles, writePetProfiles, type PetProfile } from "../lib/petProfiles";
import { deleteReview, hideReview, readPublicReviews, saveHostReview, showReview, type PublicReview } from "../lib/reviews";
import { getVoucherDiscount, markVoucherUsed, readVouchers, VOUCHER_DEFINITIONS, writeVouchers, type UserVoucher, type VoucherDefinition } from "../lib/vouchers";

const hostPhotoPlaceholder = "/hero-dogs.png";

type CustomerRecord = {
  id: string;
  name: string;
  phone: string;
  email: string;
  registerDate: string;
  dogs: PetProfile[];
  orders: VillaOrder[];
  lastStay: string;
  totalSpend: number;
};

type RegisteredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  phone?: string;
  email?: string;
  registeredAt?: string;
  phoneVerified?: boolean;
  emailVerified?: boolean;
};

type DogRecord = PetProfile & {
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  medicalRecordName?: string;
  medicalRecordDataUrl?: string;
};

type CapacityStatus = "available" | "partial" | "full" | "off";

type HostBookingForm = {
  mode: "existing" | "new";
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  dogId: string;
  dogName: string;
  dogBreed: string;
  service: "overnight" | "daycare";
  startDate: string;
  endDate: string;
  voucherId: string;
  paid: string;
};

function todayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function monthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days: Date[] = [];
  for (let date = first; date.getMonth() === first.getMonth(); date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)) {
    days.push(date);
  }
  return days;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readAllOrders(): VillaOrder[] {
  if (typeof window === "undefined") return [];
  const orders: VillaOrder[] = [];
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("pet-villa-orders:"))
    .forEach((key) => orders.push(...readJson<VillaOrder[]>(key, [])));
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function readRegisteredUsers(): RegisteredUser[] {
  if (typeof window === "undefined") return [];
  const list = readJson<RegisteredUser[]>("pet-villa-registered-users", []);
  const single = readJson<RegisteredUser | null>("pet-villa-registered-user", null);
  const current = readJson<{ user?: RegisteredUser }>("pet-villa-session", {});
  const records = new Map<string, RegisteredUser>();
  [...list, ...(single ? [single] : []), ...(current.user ? [current.user] : [])].forEach((user) => {
    const id = user.id || user.email || user.phone;
    if (!id) return;
    records.set(id, { ...records.get(id), ...user, id });
  });
  return Array.from(records.values());
}

function readAllPets(registeredUsers = readRegisteredUsers()): DogRecord[] {
  if (typeof window === "undefined") return [];
  const registeredMap = new Map(registeredUsers.map((user) => [user.id || user.email || user.phone || "", user]));
  return Object.keys(window.localStorage)
    .filter((key) => key.startsWith("pet-villa-pets:"))
    .flatMap((key) => {
      const ownerId = key.replace("pet-villa-pets:", "");
      const owner = registeredMap.get(ownerId);
      const ownerName = owner?.fullName || owner?.name || (ownerId === "guest" ? "Guest Owner" : "Pet Owner");
      const ownerPhone = owner?.phone || "";
      const ownerEmail = owner?.email || "";
      return readJson<PetProfile[]>(key, []).map((pet) => ({ ...pet, ownerId, ownerName, ownerPhone, ownerEmail }));
    });
}

function money(value: number) {
  return `RM${Math.round(value || 0)}`;
}

function shortDate(date?: Date | null) {
  if (!date) return "-";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function orderRangeLabel(order: VillaOrder) {
  const range = getOrderDateRange(order);
  return range ? formatDateRange(range.start, range.end) : order.dateLabel;
}

function bookingStatus(order: VillaOrder) {
  const map: Record<VillaOrder["status"], string> = {
    balance: "Pending",
    active: "Checked In",
    confirmed: "Confirmed",
    staying: "Checked In",
    awaiting_checkout: "Checked Out",
    ready_pickup: "Checked Out",
    completed: "Completed",
    cancelled: "Cancelled"
  };
  return map[order.status] || "Pending";
}

function paymentStatus(order: VillaOrder) {
  if (order.status === "cancelled") return order.paid > 0 ? "Refunded" : "Unpaid";
  if ((order.balance || 0) <= 0 && (order.paid || 0) >= (order.total || 0)) return "Full Payment";
  if ((order.paid || 0) > 0) return "Half Payment";
  return "Unpaid";
}

function capacityStatus(slots: number, off: boolean): CapacityStatus {
  if (off) return "off";
  if (slots <= 0) return "full";
  if (slots < MAX_DOGS_PER_DAY) return "partial";
  return "available";
}

function statusPill(status: string) {
  if (["Full Payment", "Confirmed", "Available", "Live"].includes(status)) return "bg-emerald-50 text-emerald-700";
  if (["Half Payment", "Partially Booked", "Pending"].includes(status)) return "bg-amber-50 text-amber-700";
  if (["Full", "Cancelled", "Refunded", "Hidden"].includes(status)) return "bg-red-50 text-red-600";
  if (["Off Day", "Checked In", "Checked Out"].includes(status)) return "bg-villa-text-primary text-white";
  return "bg-villa-primary-bg text-villa-primary";
}

function ordersForDate(orders: VillaOrder[], date: Date) {
  const key = toDateKey(date);
  return orders.filter((order) => {
    const range = getOrderDateRange(order);
    if (!range) return false;
    return key >= toDateKey(range.start) && key <= toDateKey(range.end);
  });
}

function shortDateFromISO(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : shortDate(date);
}

function dogMatchesOrder(dog: DogRecord, order: VillaOrder) {
  return order.pets.some((pet) => {
    const petId = pet.id || "";
    const petName = (pet.name || "").toLowerCase();
    return (petId && petId === dog.id) || (petName && petName === (dog.name || "").toLowerCase());
  });
}

function bookingDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate || startDate}T00:00:00`);
  const safeEnd = end < start ? start : end;
  const days = Math.max(1, Math.round((safeEnd.getTime() - start.getTime()) / 86400000) + 1);
  return { start, end: safeEnd, days };
}

function hostServiceTotal(service: HostBookingForm["service"], days: number, dogCount: number) {
  return service === "overnight" ? days * 35 * dogCount : 5 * dogCount;
}

type OrderWithOwner = VillaOrder & {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
};

type HostVoucherOption = {
  id: string;
  label: string;
  voucher: UserVoucher | VoucherDefinition;
  existing: boolean;
};

type CustomerEditForm = {
  name: string;
  phone: string;
  email: string;
};

type DogEditForm = PetProfile & {
  medicalRecordName?: string;
  medicalRecordDataUrl?: string;
};

function chatThreadsKey() {
  return "pet-villa-chat-threads";
}

export default function HostPage() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<VillaOrder[]>([]);
  const [dogs, setDogs] = useState<DogRecord[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [photos, setPhotos] = useState<GuestPhoto[]>([]);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [messages, setMessages] = useState<VillaMessage[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedDogKey, setSelectedDogKey] = useState("");
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState<HostBookingForm>({
    mode: "existing",
    customerId: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    dogId: "",
    dogName: "",
    dogBreed: "",
    service: "overnight",
    startDate: toDateKey(todayLocal()),
    endDate: toDateKey(todayLocal()),
    voucherId: "",
    paid: "0"
  });
  const [reportDate, setReportDate] = useState(toDateKey(todayLocal()));
  const [customerSearch, setCustomerSearch] = useState("");
  const [dogSearch, setDogSearch] = useState("");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("");
  const [offDays, setOffDays] = useState<string[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(todayLocal());
  const [managedDay, setManagedDay] = useState<Date | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [customerEditOpen, setCustomerEditOpen] = useState(false);
  const [customerEditForm, setCustomerEditForm] = useState<CustomerEditForm>({ name: "", phone: "", email: "" });
  const [dogEditOpen, setDogEditOpen] = useState(false);
  const [dogEditForm, setDogEditForm] = useState<DogEditForm | null>(null);
  const [reply, setReply] = useState("");
  const [photoForm, setPhotoForm] = useState({ petName: "", breed: "", caption: "", imageUrl: "" });
  const [reviewForm, setReviewForm] = useState({ name: "", dogName: "", breed: "", rating: 5, en: "", zh: "", date: new Date().toISOString().slice(0, 10), photo: "" });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const sync = () => {
      const nextThreads = readChatThreads();
      const nextSelected = selectedThreadId || nextThreads[0]?.id || "";
      const nextRegisteredUsers = readRegisteredUsers();
      setOrders(readAllOrders());
      setRegisteredUsers(nextRegisteredUsers);
      setDogs(readAllPets(nextRegisteredUsers));
      setPhotos(readGuestPhotos());
      setReviews(readPublicReviews({ includeHidden: true }));
      setThreads(nextThreads);
      setSelectedThreadId(nextSelected);
      setMessages(nextSelected ? readMessages(nextSelected) : []);
      setOffDays(readHostOffDays());
    };
    sync();
    window.addEventListener("pet-villa-orders", sync);
    window.addEventListener("pet-villa-pets", sync);
    window.addEventListener("pet-villa-gallery", sync);
    window.addEventListener("pet-villa-reviews", sync);
    window.addEventListener("pet-villa-messages", sync);
    window.addEventListener("pet-villa-availability", sync);
    window.addEventListener("pet-villa-customers", sync);
    return () => {
      window.removeEventListener("pet-villa-orders", sync);
      window.removeEventListener("pet-villa-pets", sync);
      window.removeEventListener("pet-villa-gallery", sync);
      window.removeEventListener("pet-villa-reviews", sync);
      window.removeEventListener("pet-villa-messages", sync);
      window.removeEventListener("pet-villa-availability", sync);
      window.removeEventListener("pet-villa-customers", sync);
    };
  }, [selectedThreadId]);

  useEffect(() => {
    setMessages(selectedThreadId ? readMessages(selectedThreadId) : []);
  }, [selectedThreadId]);

  const capacityMap = useMemo(() => buildCapacityMap(orders), [orders]);
  const days = useMemo(() => monthDays(visibleMonth), [visibleMonth]);
  const todayKey = toDateKey(todayLocal());
  const reportKey = reportDate || todayKey;
  const reportDay = new Date(`${reportKey}T00:00:00`);
  const activeOrders = orders.filter((order) => !["cancelled", "completed"].includes(order.status));
  const dayCheckIns = orders.filter((order) => order.startDateISO === reportKey);
  const dayCheckOuts = orders.filter((order) => order.endDateISO === reportKey);
  const dayOrders = ordersForDate(orders, reportDay);
  const balanceDue = orders.reduce((sum, order) => sum + Math.max(0, order.balance || 0), 0);
  const daySales = dayOrders.reduce((sum, order) => sum + Math.max(0, order.paid || 0), 0);
  const monthRevenue = orders
    .filter((order) => new Date(order.createdAt).getMonth() === visibleMonth.getMonth() && new Date(order.createdAt).getFullYear() === visibleMonth.getFullYear())
    .reduce((sum, order) => sum + Math.max(0, order.paid || 0), 0);
  const unreadThreads = threads.filter((thread) => thread.messages.at(-1)?.from === "owner");
  const customers = useMemo<CustomerRecord[]>(() => {
    const records = new Map<string, CustomerRecord>();
    registeredUsers.forEach((user) => {
      const id = user.id || user.email || user.phone;
      if (!id) return;
      records.set(id, {
        id,
        name: user.fullName || user.name || "Pet Owner",
        phone: user.phone || "",
        email: user.email || "",
        registerDate: shortDateFromISO(user.registeredAt),
        dogs: [],
        orders: [],
        lastStay: "-",
        totalSpend: 0
      });
    });
    dogs.forEach((dog) => {
      const existing = records.get(dog.ownerId);
      records.set(dog.ownerId, {
        id: dog.ownerId,
        name: existing?.name || dog.ownerName,
        phone: existing?.phone || dog.ownerPhone,
        email: existing?.email || dog.ownerEmail,
        registerDate: existing?.registerDate || "-",
        dogs: [...(existing?.dogs || []), dog],
        orders: existing?.orders || [],
        lastStay: existing?.lastStay || "-",
        totalSpend: existing?.totalSpend || 0
      });
    });
    orders.forEach((order) => {
      const orderOwner = order as OrderWithOwner;
      const matchedDog = dogs.find((dog) => dogMatchesOrder(dog, order));
      const ownerId = orderOwner.customerId || matchedDog?.ownerId || "customer";
      const existing = records.get(ownerId);
      const range = getOrderDateRange(order);
      records.set(ownerId, {
        id: ownerId,
        name: existing?.name || orderOwner.customerName || matchedDog?.ownerName || "Pet Owner",
        phone: existing?.phone || orderOwner.customerPhone || matchedDog?.ownerPhone || "",
        email: existing?.email || orderOwner.customerEmail || matchedDog?.ownerEmail || "",
        registerDate: existing?.registerDate || "-",
        dogs: existing?.dogs || [],
        orders: [...(existing?.orders || []), order],
        lastStay: range ? shortDate(range.end) : existing?.lastStay || "-",
        totalSpend: (existing?.totalSpend || 0) + (order.paid || 0)
      });
    });
    return Array.from(records.values());
  }, [dogs, orders, registeredUsers]);

  const statusOverview = [
    ["Pending", orders.filter((order) => bookingStatus(order) === "Pending").length],
    ["Confirmed", orders.filter((order) => bookingStatus(order) === "Confirmed").length],
    ["Checked In", orders.filter((order) => bookingStatus(order) === "Checked In").length],
    ["Checked Out", orders.filter((order) => bookingStatus(order) === "Checked Out").length],
    ["Completed", orders.filter((order) => bookingStatus(order) === "Completed").length],
    ["Cancelled", orders.filter((order) => bookingStatus(order) === "Cancelled").length]
  ];
  const reportCapacityLeft = offDays.includes(reportKey) ? 0 : availableSlotsForDate(reportDay, capacityMap);
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) || customers[0];
  const selectedDog = dogs.find((dog) => `${dog.ownerId}-${dog.id}` === selectedDogKey) || dogs[0];
  const selectedOrder = orders.find((order) => order.orderId === selectedOrderId) || null;
  const selectedThread = threads.find((thread) => thread.id === selectedThreadId);
  const selectedThreadCustomer = selectedThread
    ? customers.find((customer) => customer.name === selectedThread.userName || customer.phone === selectedThread.userPhone)
    : undefined;
  const selectedChatDogs = selectedThreadCustomer?.dogs || [];
  const selectedChatOrders = selectedThreadCustomer?.orders || [];
  const selectedChatBalance = selectedChatOrders.reduce((sum, order) => sum + Math.max(0, order.balance || 0), 0);
  const activeBookingCustomer = customers.find((customer) => customer.id === bookingForm.customerId);
  const activeBookingDog = dogs.find((dog) => dog.id === bookingForm.dogId && (!bookingForm.customerId || dog.ownerId === bookingForm.customerId));
  const bookingDogCount = bookingForm.dogName.trim() || activeBookingDog ? 1 : 0;
  const bookingDateMath = bookingDays(bookingForm.startDate, bookingForm.endDate);
  const bookingSubtotal = hostServiceTotal(bookingForm.service, bookingDateMath.days, bookingDogCount || 1);
  const customerVoucherWallet = bookingForm.customerId ? readVouchers(bookingForm.customerId) : [];
  const customerVouchers = customerVoucherWallet.filter((voucher) => voucher.status === "available");
  const hostVoucherOptions: HostVoucherOption[] = [
    ...customerVouchers.map((voucher) => ({
      id: voucher.id,
      label: `${voucher.title.en} · ${voucher.code}`,
      voucher,
      existing: true
    })),
    ...VOUCHER_DEFINITIONS
      .filter((definition) => definition.claimable)
      .filter((definition) => !customerVoucherWallet.some((voucher) => voucher.code === definition.code && voucher.status !== "expired"))
      .map((definition) => ({
        id: `definition:${definition.code}`,
        label: `${definition.title.en} · ${definition.code} (apply now)`,
        voucher: definition,
        existing: false
      }))
  ];
  const selectedVoucherOption = hostVoucherOptions.find((option) => option.id === bookingForm.voucherId) || null;
  const selectedVoucher = selectedVoucherOption?.voucher || null;
  const selectedVoucherForCalculation = selectedVoucher
    ? ({
        ...selectedVoucher,
        id: selectedVoucherOption?.id || selectedVoucher.code,
        status: "available",
        claimedAt: new Date().toISOString()
      } as UserVoucher)
    : null;
  const voucherDiscount = getVoucherDiscount(selectedVoucherForCalculation, {
    subtotal: bookingSubtotal,
    selectedPetCount: bookingDogCount || 1,
    unitTotal: hostServiceTotal(bookingForm.service, bookingDateMath.days, 1)
  });
  const bookingTotal = Math.max(0, bookingSubtotal - voucherDiscount);
  const bookingPaid = Math.min(bookingTotal, Math.max(0, Number(bookingForm.paid) || 0));
  const bookingDeposit = Math.round(bookingTotal / 2);
  const bookingBalance = Math.max(0, bookingTotal - bookingPaid);
  const normalizedCustomerSearch = customerSearch.trim().toLowerCase();
  const filteredCustomers = customers.filter((customer) =>
    [customer.name, customer.phone, customer.email, customer.dogs.map((dog) => dog.name).join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(normalizedCustomerSearch)
  );
  const normalizedDogSearch = dogSearch.trim().toLowerCase();
  const filteredDogs = dogs.filter((dog) =>
    [dog.name, dog.breed, dog.ownerName, dog.ownerPhone]
      .join(" ")
      .toLowerCase()
      .includes(normalizedDogSearch)
  );
  const normalizedBookingSearch = bookingSearch.trim().toLowerCase();
  const filteredOrders = orders.filter((order) => {
    const owner = order as OrderWithOwner;
    const statusMatches = !bookingStatusFilter || bookingStatus(order) === bookingStatusFilter || paymentStatus(order) === bookingStatusFilter;
    return [order.orderId, owner.customerName, owner.customerPhone, order.pets.map((pet) => pet.name).join(" "), order.serviceLabel, orderRangeLabel(order)]
      .join(" ")
      .toLowerCase()
      .includes(normalizedBookingSearch) && statusMatches;
  });
  const selectedStatusOrders = bookingStatusFilter ? orders.filter((order) => bookingStatus(order) === bookingStatusFilter || paymentStatus(order) === bookingStatusFilter).slice(0, 5) : [];

  function ownerForOrder(order: VillaOrder) {
    const owner = order as OrderWithOwner;
    if (owner.customerName || owner.customerId) {
      return {
        id: owner.customerId || "",
        name: owner.customerName || "Pet Owner",
        phone: owner.customerPhone || "",
        email: owner.customerEmail || ""
      };
    }
    const matchedDog = dogs.find((dog) => dogMatchesOrder(dog, order));
    return {
      id: matchedDog?.ownerId || "",
      name: matchedDog?.ownerName || "Pet Owner",
      phone: matchedDog?.ownerPhone || "",
      email: matchedDog?.ownerEmail || ""
    };
  }

  function scrollToHostSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function refreshHostData() {
    const nextRegisteredUsers = readRegisteredUsers();
    setOrders(readAllOrders());
    setRegisteredUsers(nextRegisteredUsers);
    setDogs(readAllPets(nextRegisteredUsers));
    setThreads(readChatThreads());
    setReviews(readPublicReviews({ includeHidden: true }));
    setPhotos(readGuestPhotos());
  }

  function writeRegisteredUser(nextUser: RegisteredUser) {
    const id = nextUser.id || nextUser.email || nextUser.phone;
    if (!id || typeof window === "undefined") return;
    const next = readRegisteredUsers().map((user) => ((user.id || user.email || user.phone) === id ? { ...user, ...nextUser, id } : user));
    if (!next.some((user) => (user.id || user.email || user.phone) === id)) next.unshift({ ...nextUser, id });
    window.localStorage.setItem("pet-villa-registered-users", JSON.stringify(next));
    const session = readJson<{ user?: RegisteredUser }>("pet-villa-session", {});
    if ((session.user?.id || session.user?.email || session.user?.phone) === id) {
      window.localStorage.setItem("pet-villa-session", JSON.stringify({ ...session, user: { ...session.user, ...nextUser, id } }));
    }
    window.dispatchEvent(new Event("pet-villa-customers"));
  }

  function openCustomerEditor(customer: CustomerRecord) {
    setSelectedCustomerId(customer.id);
    setCustomerEditForm({ name: customer.name, phone: customer.phone, email: customer.email });
    setCustomerEditOpen(true);
  }

  function saveCustomerEdit() {
    if (!selectedCustomer) return;
    writeRegisteredUser({
      id: selectedCustomer.id,
      fullName: customerEditForm.name.trim() || selectedCustomer.name,
      phone: customerEditForm.phone.trim(),
      email: customerEditForm.email.trim()
    });
    setCustomerEditOpen(false);
    setNotice("Customer profile updated.");
    refreshHostData();
  }

  function deleteCustomer(customer: CustomerRecord) {
    if (typeof window === "undefined") return;
    const nextUsers = readRegisteredUsers().filter((user) => (user.id || user.email || user.phone) !== customer.id);
    window.localStorage.setItem("pet-villa-registered-users", JSON.stringify(nextUsers));
    window.localStorage.removeItem(`pet-villa-pets:${customer.id}`);
    window.localStorage.removeItem(`pet-villa-orders:${customer.id}`);
    setSelectedCustomerId("");
    setNotice("Customer, pets, and customer-scoped orders removed.");
    window.dispatchEvent(new Event("pet-villa-customers"));
    window.dispatchEvent(new Event("pet-villa-pets"));
    window.dispatchEvent(new Event("pet-villa-orders"));
    refreshHostData();
  }

  function openDogEditor(dog: DogRecord) {
    setSelectedDogKey(`${dog.ownerId}-${dog.id}`);
    setDogEditForm({ ...dog });
    setDogEditOpen(true);
  }

  function handleMedicalRecordFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !dogEditForm) return;
    const reader = new FileReader();
    reader.onload = () => setDogEditForm((current) => current ? { ...current, medicalRecordName: file.name, medicalRecordDataUrl: String(reader.result || "") } : current);
    reader.readAsDataURL(file);
  }

  function saveDogEdit() {
    if (!dogEditForm || !selectedDog) return;
    const ownerId = selectedDog.ownerId;
    const current = readPetProfiles(ownerId);
    const cleanPet: DogEditForm = {
      ...dogEditForm,
      name: dogEditForm.name.trim() || selectedDog.name,
      breed: dogEditForm.breed.trim(),
      weight: dogEditForm.weight.trim(),
      age: dogEditForm.age.trim(),
      allergies: dogEditForm.allergies.trim(),
      medication: dogEditForm.medication.trim(),
      specialNotes: dogEditForm.specialNotes.trim()
    };
    const next = current.map((pet) => (pet.id === cleanPet.id ? cleanPet : pet));
    writePetProfiles(next, ownerId);
    setDogEditOpen(false);
    setNotice("Dog profile updated.");
    refreshHostData();
  }

  function updateHostOrder(order: VillaOrder, updater: (order: VillaOrder & OrderWithOwner) => VillaOrder & OrderWithOwner) {
    if (typeof window === "undefined") return;
    const owner = ownerForOrder(order);
    const possibleKeys = [
      owner.id ? `pet-villa-orders:${owner.id}` : "",
      ...(order as OrderWithOwner).customerId ? [`pet-villa-orders:${(order as OrderWithOwner).customerId}`] : [],
      ...Object.keys(window.localStorage).filter((key) => key.startsWith("pet-villa-orders:"))
    ].filter(Boolean);
    const seen = new Set<string>();
    for (const key of possibleKeys) {
      if (seen.has(key)) continue;
      seen.add(key);
      const current = readJson<(VillaOrder & OrderWithOwner)[]>(key, []);
      if (!current.some((item) => item.orderId === order.orderId)) continue;
      const next = current.map((item) => (item.orderId === order.orderId ? updater(item) : item));
      window.localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event("pet-villa-orders"));
      refreshHostData();
      setSelectedOrderId(order.orderId);
      return;
    }
  }

  function ensureCustomerThread(customer?: CustomerRecord) {
    if (!customer || typeof window === "undefined") return "";
    const threadId = `thread-${customer.id}`;
    const current = readChatThreads();
    const existing = current.find((thread) => thread.id === threadId);
    if (existing) {
      setSelectedThreadId(existing.id);
      setMessages(existing.messages);
      scrollToHostSection("messages");
      return existing.id;
    }
    const nextThread: ChatThread = {
      id: threadId,
      userId: customer.id,
      userName: customer.name,
      userPhone: customer.phone,
      updatedAt: new Date().toISOString(),
      messages: []
    };
    window.localStorage.setItem(chatThreadsKey(), JSON.stringify([nextThread, ...current]));
    setThreads(readChatThreads());
    setSelectedThreadId(threadId);
    setMessages([]);
    scrollToHostSection("messages");
    return threadId;
  }

  function setOffDay(date: Date, shouldBlock: boolean) {
    const key = toDateKey(date);
    const next = shouldBlock ? Array.from(new Set([...offDays, key])) : offDays.filter((day) => day !== key);
    setOffDays(next);
    writeHostOffDays(next);
  }

  function handlePhotoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoForm((current) => ({ ...current, imageUrl: String(reader.result || "") }));
    reader.readAsDataURL(file);
  }

  function handleReviewPhotoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setReviewForm((current) => ({ ...current, photo: String(reader.result || "") }));
    reader.readAsDataURL(file);
  }

  function publishPhoto() {
    if (!photoForm.petName.trim()) {
      setNotice(t({ en: "Please add a pet name before publishing.", zh: "发布前请填写宠物名字。" }));
      return;
    }
    saveGuestPhoto({
      petName: photoForm.petName.trim(),
      breed: photoForm.breed.trim() || "Small dog",
      caption: photoForm.caption.trim() || "Happy guest at Pet Villa.",
      imageUrl: photoForm.imageUrl || hostPhotoPlaceholder,
      visibleOnHome: true,
      color: "#f0b46e"
    });
    setPhotoForm({ petName: "", breed: "", caption: "", imageUrl: "" });
    setNotice(t({ en: "Happy Guest photo published to Home.", zh: "Happy Guests 照片已发布到首页。" }));
  }

  function publishReview() {
    if (!reviewForm.name.trim() || !reviewForm.en.trim()) {
      setNotice(t({ en: "Please add reviewer name and review text.", zh: "请填写顾客名字和评价内容。" }));
      return;
    }
    saveHostReview({
      name: reviewForm.name.trim(),
      pet: [reviewForm.dogName, reviewForm.breed].filter(Boolean).join(" · ") || "Small dog",
      dogName: reviewForm.dogName.trim() || "Pet",
      breed: reviewForm.breed.trim() || "Small dog",
      date: reviewForm.date,
      rating: reviewForm.rating,
      photo: reviewForm.photo,
      quote: { en: reviewForm.en.trim(), zh: reviewForm.zh.trim() || reviewForm.en.trim() }
    });
    setReviewForm({ name: "", dogName: "", breed: "", rating: 5, en: "", zh: "", date: new Date().toISOString().slice(0, 10), photo: "" });
    setReviews(readPublicReviews({ includeHidden: true }));
    setNotice(t({ en: "Review published to Home.", zh: "评价已发布到首页。" }));
  }

  function toggleReviewVisibility(review: PublicReview) {
    review.hidden ? showReview(review.id) : hideReview(review.id);
    setReviews(readPublicReviews({ includeHidden: true }));
    setNotice(review.hidden ? t({ en: "Review is visible on Home again.", zh: "评价已重新显示在首页。" }) : t({ en: "Review hidden from Home.", zh: "评价已从首页隐藏。" }));
  }

  function removeReview(review: PublicReview) {
    deleteReview(review);
    setReviews(readPublicReviews({ includeHidden: true }));
    setNotice(t({ en: "Review deleted.", zh: "评价已删除。" }));
  }

  function sendHostReply() {
    if (!reply.trim() || !selectedThreadId) return;
    sendMessage("host", reply, selectedThreadId);
    setReply("");
    setMessages(readMessages(selectedThreadId));
    setThreads(readChatThreads());
  }

  function openCreateBooking(customer?: CustomerRecord) {
    const owner = customer || selectedCustomer || customers[0];
    const dog = owner?.dogs[0];
    setBookingForm({
      mode: owner ? "existing" : "new",
      customerId: owner?.id || "",
      customerName: owner?.name || "",
      customerPhone: owner?.phone || "",
      customerEmail: owner?.email || "",
      dogId: dog?.id || "",
      dogName: dog?.name || "",
      dogBreed: dog?.breed || "",
      service: "overnight",
      startDate: toDateKey(todayLocal()),
      endDate: toDateKey(todayLocal()),
      voucherId: "",
      paid: "0"
    });
    setBookingModalOpen(true);
  }

  function saveHostBooking() {
    const customerId =
      bookingForm.mode === "existing" && bookingForm.customerId
        ? bookingForm.customerId
        : `host-customer-${Date.now()}`;
    const customerName = bookingForm.customerName.trim() || customers.find((customer) => customer.id === customerId)?.name || "Pet Owner";
    const existingDog = dogs.find((dog) => dog.id === bookingForm.dogId && dog.ownerId === customerId);
    const dogName = bookingForm.dogName.trim() || existingDog?.name || "Pet";
    if (!customerName || !dogName || !bookingForm.startDate) {
      setNotice("Please add customer, dog, and date before creating a booking.");
      return;
    }
    const { start, end: safeEnd, days } = bookingDateMath;
    let orderPet: PetProfile = existingDog || {
      id: `host-dog-${Date.now()}`,
      name: dogName,
      breed: bookingForm.dogBreed || "Small dog",
      weight: "",
      age: "",
      gender: "",
      coatColor: "",
      vaccinated: false,
      neutered: false,
      friendly: true,
      calm: true,
      foodBrand: "",
      mealsPerDay: "",
      allergies: "",
      medication: "",
      specialNotes: ""
    };
    if (!existingDog || !bookingForm.dogId) {
      const currentPets = readPetProfiles(customerId);
      const samePet = currentPets.find((pet) => pet.name.trim().toLowerCase() === dogName.trim().toLowerCase());
      orderPet = samePet || orderPet;
      if (!samePet) {
        writePetProfiles([...currentPets, orderPet], customerId);
      }
    }
    const order: VillaOrder & OrderWithOwner = {
      id: `host-draft-${Date.now()}`,
      service: bookingForm.service,
      serviceLabel: bookingForm.service === "overnight" ? "Overnight Boarding" : "Daycare",
      dateLabel: formatDateRange(start, safeEnd),
      startDateISO: toDateKey(start),
      endDateISO: toDateKey(safeEnd),
      nights: bookingForm.service === "overnight" ? days : 0,
      hours: bookingForm.service === "daycare" ? 1 : 0,
      pets: [{
        id: orderPet.id,
        name: orderPet.name,
        breed: orderPet.breed || bookingForm.dogBreed || "Small dog",
        weight: orderPet.weight || "",
        photoDataUrl: orderPet.photoDataUrl
      }],
      total: bookingTotal,
      subtotal: bookingSubtotal,
      voucherId: selectedVoucherForCalculation?.id,
      voucherCode: selectedVoucher?.code,
      voucherTitle: selectedVoucher?.title.en,
      voucherDiscount,
      deposit: bookingDeposit,
      balance: bookingBalance,
      paid: bookingPaid,
      specialRequest: "",
      createdAt: new Date().toISOString(),
      orderId: `BK-${Date.now()}`,
      status: bookingPaid > 0 ? "confirmed" : "balance",
      photosAvailable: 0,
      customerId,
      customerName,
      customerPhone: bookingForm.customerPhone || activeBookingCustomer?.phone || "",
      customerEmail: bookingForm.customerEmail || activeBookingCustomer?.email || ""
    };
    const orderKey = `pet-villa-orders:${customerId}`;
    const currentOrders = readJson<VillaOrder[]>(orderKey, []);
    window.localStorage.setItem(orderKey, JSON.stringify([order, ...currentOrders]));
    if (selectedVoucherForCalculation && voucherDiscount > 0) {
      if (selectedVoucherOption?.existing) {
        markVoucherUsed(selectedVoucherForCalculation.id, order.orderId, voucherDiscount, order.dateLabel, customerId);
      } else {
        const usedVoucher: UserVoucher = {
          ...selectedVoucherForCalculation,
          id: `${selectedVoucherForCalculation.code}-${Date.now()}`,
          status: "used",
          claimedAt: new Date().toISOString(),
          usedAt: new Date().toISOString(),
          orderId: order.orderId,
          discountAmount: voucherDiscount,
          bookingDateRange: order.dateLabel
        };
        writeVouchers([usedVoucher, ...readVouchers(customerId)], customerId);
      }
    }
    if (bookingForm.mode === "new") {
      const nextUser: RegisteredUser = {
        id: customerId,
        fullName: customerName,
        phone: bookingForm.customerPhone,
        email: bookingForm.customerEmail,
        registeredAt: new Date().toISOString()
      };
      const userList = readRegisteredUsers().filter((user) => (user.id || user.email || user.phone) !== customerId);
      window.localStorage.setItem("pet-villa-registered-users", JSON.stringify([nextUser, ...userList]));
    }
    setBookingModalOpen(false);
    setNotice("Booking created in Host Panel.");
    window.dispatchEvent(new Event("pet-villa-orders"));
    window.dispatchEvent(new Event("pet-villa-customers"));
    window.dispatchEvent(new Event("pet-villa-vouchers"));
  }

  const monthLabel = visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const managedOrders = managedDay ? ordersForDate(orders, managedDay) : [];
  const managedSlots = managedDay ? availableSlotsForDate(managedDay, capacityMap) : MAX_DOGS_PER_DAY;
  const managedKey = managedDay ? toDateKey(managedDay) : "";
  const managedOff = managedDay ? offDays.includes(managedKey) : false;
  const selectedOrderOwner = selectedOrder ? ownerForOrder(selectedOrder) : null;
  const selectedOrderCustomer = selectedOrderOwner ? customers.find((customer) => customer.id === selectedOrderOwner.id || customer.phone === selectedOrderOwner.phone || customer.email === selectedOrderOwner.email) : undefined;

  return (
    <div className="min-h-screen bg-[#3d1f0d] text-[#f5c4b3]">
      <AppNav host />
      <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="bg-[#2a1508] p-4 lg:min-h-[calc(100vh-81px)] lg:sticky lg:top-0">
          <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {[
              ["dashboard", "Dashboard", "仪表盘"],
              ["customers", "Customers", "顾客"],
              ["dogs", "Dogs", "狗狗"],
              ["booking-center", "Booking Center", "预约中心"],
              ["calendar-capacity", "Calendar Capacity", "档期名额"],
              ["messages", "Messages", "消息"],
              ["payments", "Payments", "付款"],
              ["reviews", "Reviews", "评价"],
              ["gallery", "Gallery", "相册"],
              ["promotions", "Promotions", "优惠"],
              ["reports", "Reports", "报表"],
              ["settings", "Settings", "设置"]
            ].map(([id, en, zh], index) => (
              <a key={id} href={`#${id}`} className={`flex items-center justify-between rounded-[16px] px-4 py-3 text-sm font-bold ${index === 0 ? "bg-[rgba(232,146,124,0.24)] text-[#f5c4b3]" : "text-[rgba(245,196,179,0.82)] hover:bg-white/5"}`}>
                <span>{t({ en, zh })}</span>
                {id === "messages" && unreadThreads.length ? <span className="rounded-full bg-villa-primary px-2 py-0.5 text-[10px] text-white">{unreadThreads.length}</span> : null}
              </a>
            ))}
          </nav>
          <div className="mt-6 hidden rounded-[18px] border border-white/10 bg-white/5 p-4 text-sm font-bold text-[#f5c4b3] lg:block">
            <p className="text-xs uppercase opacity-75">Business Info</p>
            <p className="mt-3">Pet Villa</p>
            <p className="mt-2 opacity-80">+60 16-523 6409</p>
            <p className="opacity-80">Ipoh, Perak</p>
            <a href="/" className="mt-4 inline-flex rounded-full border border-[#f5c4b3]/40 px-4 py-2 text-xs">View Website</a>
          </div>
        </aside>

        <main className="host-paw-bg p-4 text-villa-text-primary lg:p-8">
          <header id="dashboard" className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="rounded-pill bg-villa-peach px-4 py-2 text-xs font-black uppercase">HOST PANEL</span>
              <h1 className="page-title mt-4">{t({ en: "Welcome back, Pet Villa!", zh: "欢迎回来，Pet Villa！" })}</h1>
              <p className="body-copy mt-1">{t({ en: "Today’s check-ins, payments, messages, and capacity in one place.", zh: "快速处理今天的入住、付款、消息和名额。" })}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-villa-primary-light bg-white p-2">
              <span className="px-2 text-xs font-black text-villa-text-secondary">View day</span>
              <input className="villa-input h-10 w-[160px]" type="date" value={reportDate} onChange={(event) => {
                setReportDate(event.target.value);
                if (event.target.value) setVisibleMonth(new Date(`${event.target.value}T00:00:00`));
              }} />
              <button type="button" className="villa-button-outline h-10 bg-white px-4 text-xs" onClick={() => {
                const today = todayLocal();
                setReportDate(toDateKey(today));
                setVisibleMonth(today);
              }}>Today</button>
            </div>
          </header>

          {notice ? <p className="mt-4 rounded-[16px] bg-villa-primary-bg p-3 text-sm font-black text-villa-primary">{notice}</p> : null}

          <section className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8">
            {[
              { en: "Check-in", zh: "入住", value: dayCheckIns.length, sub: `${dayCheckIns.length} bookings`, action: () => { setBookingSearch(reportKey); setBookingStatusFilter(""); scrollToHostSection("booking-center"); } },
              { en: "Check-out", zh: "退房", value: dayCheckOuts.length, sub: `${dayCheckOuts.length} bookings`, action: () => { setBookingSearch(reportKey); setBookingStatusFilter(""); scrollToHostSection("booking-center"); } },
              { en: "Active Bookings", zh: "进行中预约", value: activeOrders.length, sub: "Currently active", action: () => { setBookingStatusFilter("Checked In"); scrollToHostSection("booking-center"); } },
              { en: "Pending Payment", zh: "待收付款", value: money(balanceDue), sub: "Unpaid balance", action: () => { setBookingStatusFilter("Half Payment"); scrollToHostSection("booking-center"); } },
              { en: "This Month Revenue", zh: "本月营业额", value: money(monthRevenue), sub: monthLabel, action: () => scrollToHostSection("payments") },
              { en: "Unread Messages", zh: "未读消息", value: unreadThreads.length, sub: "Need reply", action: () => scrollToHostSection("messages") },
              { en: "Day Sales", zh: "当天收款", value: money(daySales), sub: shortDate(reportDay), action: () => scrollToHostSection("payments") },
              { en: "Day Capacity", zh: "当天剩余容量", value: `${reportCapacityLeft}/${MAX_DOGS_PER_DAY}`, sub: offDays.includes(reportKey) ? "Off Day" : "Slots left", action: () => { setManagedDay(reportDay); scrollToHostSection("calendar-capacity"); } }
            ].map((card) => (
              <button key={card.en} type="button" onClick={card.action} className="villa-card flex min-h-[128px] flex-col justify-between p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg">
                <p className="m-0 text-xs font-black text-villa-text-secondary">{t({ en: card.en, zh: card.zh })}</p>
                <strong className="text-2xl font-black text-villa-text-primary">{card.value}</strong>
                <span className="text-[11px] font-bold text-villa-text-muted">{card.sub}</span>
              </button>
            ))}
          </section>

          <section className="mt-5 villa-card p-4">
            <h2 className="card-title">Quick Actions</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {[
                ["Create Booking", () => openCreateBooking()],
                ["Find Customer", () => { document.getElementById("customers")?.scrollIntoView({ behavior: "smooth" }); }],
                ["Open Messages", () => { document.getElementById("messages")?.scrollIntoView({ behavior: "smooth" }); }],
                ["Manage Capacity", () => { document.getElementById("calendar-capacity")?.scrollIntoView({ behavior: "smooth" }); }],
                ["Add Review", () => { document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" }); }],
                ["Upload Gallery", () => { document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" }); }]
              ].map(([label, action]) => (
                <button key={String(label)} type="button" onClick={action as () => void} className="rounded-[16px] bg-villa-primary-bg p-4 text-center text-xs font-black text-villa-text-primary transition hover:-translate-y-0.5 hover:shadow-md">{String(label)}</button>
              ))}
            </div>
          </section>

          <section id="messages" className="mt-5 villa-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="section-title">Messages Inbox</h2>
                <p className="body-copy mt-1">Reply customers, check their dogs, and create bookings from one workspace.</p>
              </div>
              {unreadThreads.length ? <span className="rounded-full bg-villa-primary px-3 py-1 text-xs font-black text-white">{unreadThreads.length} unread</span> : null}
            </div>
            <div className="mt-4 grid min-h-[620px] gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
              <div className="rounded-[18px] border border-villa-primary-light bg-villa-primary-bg p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <strong className="text-sm text-villa-text-primary">Chats</strong>
                  <span className="text-xs font-black text-villa-text-muted">{threads.length}</span>
                </div>
                <div className="grid max-h-[560px] content-start gap-2 overflow-auto pr-1">
                  {threads.map((thread) => (
                    <button key={thread.id} type="button" className={`rounded-[16px] border p-3 text-left transition hover:-translate-y-px ${thread.id === selectedThreadId ? "border-villa-primary bg-white shadow-md" : "border-villa-primary-light bg-white/70"}`} onClick={() => setSelectedThreadId(thread.id)}>
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-black text-villa-text-primary">{thread.userName}</span>
                        {thread.messages.at(-1)?.from === "owner" ? <span className="rounded-full bg-villa-primary px-2 py-0.5 text-[10px] font-black text-white">New</span> : null}
                      </span>
                      <span className="mt-1 block truncate text-xs font-bold text-villa-text-secondary">{thread.messages.at(-1)?.text || "No message yet"}</span>
                      <span className="mt-1 block text-[10px] font-black text-villa-text-muted">{thread.messages.at(-1)?.createdAt ? shortDateFromISO(thread.messages.at(-1)?.createdAt) : "No time"}</span>
                    </button>
                  ))}
                  {threads.length === 0 ? <p className="body-copy rounded-[16px] bg-white p-3 text-xs">No customer chats yet.</p> : null}
                </div>
              </div>

              <div className="flex min-h-0 flex-col rounded-[18px] border border-villa-primary-light bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-villa-primary-light pb-3">
                  <div>
                    <strong className="block text-base text-villa-text-primary">{selectedThread?.userName || "Select a chat"}</strong>
                    <span className="text-xs font-bold text-villa-text-secondary">{selectedThreadCustomer?.phone || selectedThread?.userPhone || "No phone"} · {selectedThreadCustomer?.email || "No email"}</span>
                  </div>
                  {selectedThreadCustomer ? (
                    <button type="button" className="villa-button-outline bg-white px-3 py-2 text-xs" onClick={() => {
                      setSelectedCustomerId(selectedThreadCustomer.id);
                      scrollToHostSection("customers");
                    }}>Open CRM</button>
                  ) : null}
                </div>
                <div className="mt-4 grid flex-1 content-start gap-3 overflow-auto rounded-[18px] bg-villa-primary-bg p-4">
                  {messages.map((message) => (
                    <div key={message.id} className={`max-w-[78%] rounded-[18px] p-3 text-sm font-bold leading-relaxed ${message.from === "host" ? "justify-self-end bg-villa-primary text-white" : "bg-white text-villa-text-primary"}`}>{message.text}</div>
                  ))}
                  {messages.length === 0 ? <p className="body-copy rounded-[18px] bg-white p-4">Choose a customer conversation to reply.</p> : null}
                </div>
                <div className="mt-4 flex gap-2">
                  <input className="villa-input" value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply as host..." />
                  <button type="button" className="villa-button px-6" onClick={sendHostReply}>Send</button>
                </div>
              </div>

              <aside className="rounded-[18px] border border-villa-primary-light bg-white p-4">
                <h3 className="card-title">Customer Card</h3>
                {selectedThreadCustomer ? (
                  <div className="mt-4 grid gap-3 text-sm font-bold">
                    <div className="rounded-[16px] bg-villa-primary-bg p-4">
                      <strong className="block text-villa-text-primary">{selectedThreadCustomer.name}</strong>
                      <span className="mt-1 block text-xs text-villa-text-secondary">{selectedThreadCustomer.phone || "No phone"}</span>
                      <span className="block text-xs text-villa-text-secondary">{selectedThreadCustomer.email || "No email"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <span className="rounded-[14px] bg-villa-primary-bg p-3"><b className="block text-lg">{selectedChatDogs.length}</b>Dogs</span>
                      <span className="rounded-[14px] bg-villa-primary-bg p-3"><b className="block text-lg">{selectedChatOrders.length}</b>Orders</span>
                      <span className="rounded-[14px] bg-villa-primary-bg p-3"><b className="block text-lg">{money(selectedChatBalance)}</b>Balance</span>
                    </div>
                    <div className="rounded-[16px] bg-villa-primary-bg p-3">
                      <strong className="text-xs uppercase text-villa-text-secondary">Dogs</strong>
                      <div className="mt-2 grid gap-1 text-xs">
                        {selectedChatDogs.slice(0, 4).map((dog) => <span key={dog.id}>{dog.name} · {dog.breed || "Small dog"}</span>)}
                        {selectedChatDogs.length === 0 ? <span>No dogs saved.</span> : null}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <button type="button" className="villa-button-outline bg-white px-3 py-2 text-xs" onClick={() => {
                        setSelectedCustomerId(selectedThreadCustomer.id);
                        scrollToHostSection("customers");
                      }}>Open CRM</button>
                      <button type="button" className="villa-button-outline bg-white px-3 py-2 text-xs" onClick={() => {
                        setBookingSearch(selectedThreadCustomer.name);
                        setBookingStatusFilter("");
                        scrollToHostSection("booking-center");
                      }}>Open Orders</button>
                      <button type="button" className="villa-button px-3 py-2 text-xs" onClick={() => openCreateBooking(selectedThreadCustomer)}>Create Booking</button>
                    </div>
                  </div>
                ) : (
                  <p className="body-copy mt-3 text-xs">Select a customer chat to view phone, email, dogs, orders, and outstanding balance.</p>
                )}
              </aside>
            </div>
          </section>

          <section className="mt-5 grid gap-5">
              <div className="grid gap-5 lg:grid-cols-2">
                <article id="payments" className="villa-card p-5">
                  <h2 className="card-title">Sales Overview</h2>
                  <div className="mt-4 grid gap-3">
                    {[
                      ["Completed Sales", money(orders.filter((order) => order.status === "completed").reduce((sum, order) => sum + order.paid, 0)), "bg-emerald-500"],
                      ["Remaining Balance", money(balanceDue), "bg-blue-400"],
                      ["Pending Collection", money(orders.filter((order) => paymentStatus(order) === "Half Payment").reduce((sum, order) => sum + order.balance, 0)), "bg-amber-400"],
                      ["Cancelled Amount", money(orders.filter((order) => order.status === "cancelled").reduce((sum, order) => sum + order.total, 0)), "bg-red-400"]
                    ].map(([label, value, dot]) => (
                      <div key={label} className="flex items-center justify-between rounded-[14px] bg-villa-primary-bg px-3 py-2 text-sm font-bold">
                        <span className="flex items-center gap-2"><i className={`h-2.5 w-2.5 rounded-full ${dot}`} />{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="villa-card p-5">
                  <h2 className="card-title">Booking Status Overview</h2>
                  <div className="mt-4 grid gap-2">
                    {statusOverview.map(([label, count]) => (
                      <button key={label} type="button" onClick={() => {
                        setBookingStatusFilter(String(label));
                        setBookingSearch("");
                        scrollToHostSection("booking-center");
                      }} className={`flex items-center justify-between rounded-[14px] border px-3 py-2 text-left text-sm font-bold transition hover:-translate-y-px ${bookingStatusFilter === label ? "border-villa-primary bg-villa-primary-bg" : "border-villa-primary-light bg-white"}`}>
                        <span>{label}</span>
                        <span className={`rounded-full px-2.5 py-1 text-xs ${statusPill(String(label))}`}>{count}</span>
                      </button>
                    ))}
                  </div>
                  {bookingStatusFilter ? (
                    <div className="mt-4 rounded-[18px] bg-villa-primary-bg p-3">
                      <div className="flex items-center justify-between gap-3">
                        <strong className="text-sm text-villa-text-primary">{bookingStatusFilter} bookings</strong>
                        <button type="button" className="text-xs font-black text-villa-primary" onClick={() => setBookingStatusFilter("")}>Clear</button>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {selectedStatusOrders.map((order) => (
                          <button key={order.orderId} type="button" className="rounded-[14px] bg-white p-3 text-left text-xs font-bold" onClick={() => setSelectedOrderId(order.orderId)}>
                            <span className="block font-black text-villa-text-primary">{order.pets.map((pet) => pet.name).join(", ") || "Pet"} - {ownerForOrder(order).name}</span>
                            <span className="text-villa-text-secondary">{orderRangeLabel(order)} - {money(order.balance)} balance</span>
                          </button>
                        ))}
                        {selectedStatusOrders.length === 0 ? <p className="body-copy text-xs">No matching orders.</p> : null}
                      </div>
                    </div>
                  ) : null}
                </article>
              </div>

              <section id="customers" className="villa-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="section-title">Customers CRM</h2>
                    <p className="body-copy mt-1">Owner profile, dogs, order count, last stay, and total spend.</p>
                  </div>
                  <span className="rounded-full bg-villa-primary-bg px-3 py-1 text-xs font-black text-villa-primary">{filteredCustomers.length} customers</span>
                </div>
                <input className="villa-input mt-4" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search name, phone, email, or dog..." />
                <div className="mt-4 max-h-[360px] overflow-auto rounded-[18px] border border-villa-primary-light bg-white">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="text-xs uppercase text-villa-text-secondary">
                      <tr className="border-b border-villa-primary-light">
                        <th className="py-3">Customer</th><th>Phone</th><th>Email</th><th>Registered</th><th>Dogs</th><th>Orders</th><th>Last Stay</th><th>Total Spend</th><th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer) => (
                        <tr key={customer.id} className="border-b border-villa-primary-light/60 font-bold">
                          <td className="py-3"><button type="button" onClick={() => setSelectedCustomerId(customer.id)} className="text-left text-villa-primary">{customer.name}</button></td>
                          <td>{customer.phone || "-"}</td>
                          <td>{customer.email || "-"}</td>
                          <td>{customer.registerDate || "-"}</td>
                          <td>{customer.dogs.map((dog) => dog.name).join(", ") || "-"}</td>
                          <td>{customer.orders.length}</td>
                          <td>{customer.lastStay}</td>
                          <td>{money(customer.totalSpend)}</td>
                          <td>
                            <div className="flex gap-2">
                              <button type="button" className="rounded-pill border border-villa-primary px-3 py-1 text-xs font-black text-villa-primary" onClick={() => setSelectedCustomerId(customer.id)}>Open</button>
                              <button type="button" className="rounded-pill bg-villa-primary px-3 py-1 text-xs font-black text-white" onClick={() => openCreateBooking(customer)}>Book</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {customers.length === 0 ? <p className="body-copy mt-4">No customer records yet.</p> : null}
                </div>
                {selectedCustomer ? (
                  <article className="mt-4 rounded-[18px] border border-villa-primary-light bg-villa-primary-bg p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="card-title">{selectedCustomer.name}</h3>
                        <p className="mt-1 text-xs font-bold text-villa-text-secondary">{selectedCustomer.phone || "No phone"} · {selectedCustomer.email || "No email"}</p>
                        <p className="mt-1 text-xs font-bold text-villa-text-muted">Registered {selectedCustomer.registerDate || "-"} · Last stay {selectedCustomer.lastStay}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="villa-button-outline bg-white px-4 py-2 text-xs" onClick={() => openCustomerEditor(selectedCustomer)}>Edit Customer</button>
                        <button type="button" className="villa-button-outline bg-white px-4 py-2 text-xs" onClick={() => ensureCustomerThread(selectedCustomer)}>Send Message</button>
                        <button type="button" className="villa-button px-4 py-2 text-xs" onClick={() => openCreateBooking(selectedCustomer)}>Create Booking</button>
                        <button type="button" className="rounded-pill border border-red-200 bg-white px-4 py-2 text-xs font-black text-red-500" onClick={() => window.confirm("Delete this customer and their local pets/orders?") && deleteCustomer(selectedCustomer)}>Delete</button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-[14px] bg-white p-3 text-sm font-black">Dogs: {selectedCustomer.dogs.length}</div>
                      <div className="rounded-[14px] bg-white p-3 text-sm font-black">Orders: {selectedCustomer.orders.length}</div>
                      <div className="rounded-[14px] bg-white p-3 text-sm font-black">Spend: {money(selectedCustomer.totalSpend)}</div>
                    </div>
                    {customerEditOpen ? (
                      <div className="mt-3 grid gap-3 rounded-[16px] bg-white p-3 sm:grid-cols-3">
                        <input className="villa-input" value={customerEditForm.name} onChange={(event) => setCustomerEditForm({ ...customerEditForm, name: event.target.value })} placeholder="Full name" />
                        <input className="villa-input" value={customerEditForm.phone} onChange={(event) => setCustomerEditForm({ ...customerEditForm, phone: event.target.value })} placeholder="Phone" />
                        <input className="villa-input" value={customerEditForm.email} onChange={(event) => setCustomerEditForm({ ...customerEditForm, email: event.target.value })} placeholder="Email" />
                        <button type="button" className="villa-button sm:col-span-2" onClick={saveCustomerEdit}>Save Customer</button>
                        <button type="button" className="villa-button-outline bg-white" onClick={() => setCustomerEditOpen(false)}>Cancel</button>
                      </div>
                    ) : null}
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-[16px] bg-white p-3">
                        <h4 className="text-sm font-black text-villa-text-primary">Dog List</h4>
                        <div className="mt-2 grid gap-2">
                          {selectedCustomer.dogs.map((dog) => {
                            const fullDogRecord = dogs.find((item) => item.ownerId === selectedCustomer.id && item.id === dog.id) || {
                              ...dog,
                              ownerId: selectedCustomer.id,
                              ownerName: selectedCustomer.name,
                              ownerPhone: selectedCustomer.phone,
                              ownerEmail: selectedCustomer.email,
                            };

                            return (
                            <button key={dog.id} type="button" className="rounded-[12px] bg-villa-primary-bg p-2 text-left text-xs font-bold" onClick={() => openDogEditor(fullDogRecord)}>
                              <span className="block font-black">{dog.name || "Unnamed dog"} - {dog.breed || "Small dog"}</span>
                              <span className="text-villa-text-secondary">{dog.weight || "-"}kg - {dog.vaccinated ? "Vaccinated" : "Not vaccinated"}</span>
                            </button>
                            );
                          })}
                          {selectedCustomer.dogs.length === 0 ? <p className="body-copy text-xs">No dogs yet.</p> : null}
                        </div>
                      </div>
                      <div className="rounded-[16px] bg-white p-3">
                        <h4 className="text-sm font-black text-villa-text-primary">Order History</h4>
                        <div className="mt-2 grid max-h-[190px] gap-2 overflow-auto pr-1">
                          {selectedCustomer.orders.map((order) => (
                            <button key={order.orderId} type="button" className="rounded-[12px] bg-villa-primary-bg p-2 text-left text-xs font-bold" onClick={() => setSelectedOrderId(order.orderId)}>
                              <span className="block font-black">{order.orderId} - {bookingStatus(order)}</span>
                              <span className="text-villa-text-secondary">{orderRangeLabel(order)} - {money(order.total)}</span>
                            </button>
                          ))}
                          {selectedCustomer.orders.length === 0 ? <p className="body-copy text-xs">No orders yet.</p> : null}
                        </div>
                      </div>
                    </div>
                  </article>
                ) : null}
              </section>

              <section id="dogs" className="villa-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="section-title">Dogs Profile</h2>
                  <span className="rounded-full bg-villa-primary-bg px-3 py-1 text-xs font-black text-villa-primary">{filteredDogs.length} dogs</span>
                </div>
                <input className="villa-input mt-4" value={dogSearch} onChange={(event) => setDogSearch(event.target.value)} placeholder="Search dog, breed, owner, or phone..." />
                <div className="mt-4 grid max-h-[520px] gap-3 overflow-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
                  {filteredDogs.map((dog) => (
                    <article key={`${dog.ownerId}-${dog.id}`} className="rounded-[18px] border border-villa-primary-light bg-white p-4">
                      <div className="flex gap-3">
                        <img src={dog.photoDataUrl || "/avatar-poodle.png"} alt={dog.name} className="h-16 w-16 rounded-[16px] object-cover" />
                        <div>
                          <h3 className="card-title">{dog.name || "Unnamed dog"}</h3>
                          <p className="text-xs font-bold text-villa-text-secondary">{dog.breed || "-"} · {dog.weight || "-"}kg · {dog.age || "-"}</p>
                          <p className="mt-1 text-xs font-bold text-villa-text-muted">Owner: {dog.ownerName}</p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold">
                        <span className={dog.vaccinated ? "text-emerald-700" : "text-red-500"}>{dog.vaccinated ? "Vaccinated" : "Not vaccinated"}</span>
                        <span>{dog.allergies || "No allergies"}</span>
                        <span>{dog.medication || "No medication"}</span>
                        <span>{dog.specialNotes || "No notes"}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" className="rounded-pill border border-villa-primary px-3 py-1 text-xs font-black text-villa-primary" onClick={() => setSelectedDogKey(`${dog.ownerId}-${dog.id}`)}>View Full Profile</button>
                        <button type="button" className="rounded-pill bg-villa-primary px-3 py-1 text-xs font-black text-white" onClick={() => openDogEditor(dog)}>Edit Dog</button>
                      </div>
                    </article>
                  ))}
                  {filteredDogs.length === 0 ? <p className="body-copy">No dog profiles yet.</p> : null}
                </div>
                {selectedDog ? (
                  <article className="mt-4 rounded-[18px] border border-villa-primary-light bg-villa-primary-bg p-4">
                    <h3 className="card-title">{selectedDog.name} Full Profile</h3>
                    <div className="mt-3 grid gap-2 text-sm font-bold sm:grid-cols-2 lg:grid-cols-3">
                      <span>Breed: {selectedDog.breed || "-"}</span>
                      <span>Age: {selectedDog.age || "-"}</span>
                      <span>Weight: {selectedDog.weight || "-"}kg</span>
                      <span>Owner: {selectedDog.ownerName}</span>
                      <span>Vaccination: {selectedDog.vaccinated ? "Vaccinated" : "Not verified"}</span>
                      <span>Allergy: {selectedDog.allergies || "None"}</span>
                      <span>Medication: {selectedDog.medication || "None"}</span>
                      <span>Medical record: {selectedDog.medicalRecordName || "Not uploaded"}</span>
                      <span className="sm:col-span-2">Notes: {selectedDog.specialNotes || "No notes"}</span>
                    </div>
                    <button type="button" className="villa-button-outline mt-3 bg-white px-4 py-2 text-xs" onClick={() => openDogEditor(selectedDog)}>Edit Dog</button>
                    {dogEditOpen && dogEditForm ? (
                      <div className="mt-4 grid gap-3 rounded-[16px] bg-white p-3 sm:grid-cols-2">
                        <input className="villa-input" value={dogEditForm.name} onChange={(event) => setDogEditForm({ ...dogEditForm, name: event.target.value })} placeholder="Dog name" />
                        <input className="villa-input" value={dogEditForm.breed} onChange={(event) => setDogEditForm({ ...dogEditForm, breed: event.target.value })} placeholder="Breed" />
                        <input className="villa-input" value={dogEditForm.age} onChange={(event) => setDogEditForm({ ...dogEditForm, age: event.target.value })} placeholder="Age" />
                        <input className="villa-input" value={dogEditForm.weight} onChange={(event) => setDogEditForm({ ...dogEditForm, weight: event.target.value })} placeholder="Weight kg" />
                        <label className="flex items-center gap-2 rounded-[14px] border border-villa-primary-light bg-villa-primary-bg px-3 py-3 text-sm font-black">
                          <input type="checkbox" checked={dogEditForm.vaccinated} onChange={(event) => setDogEditForm({ ...dogEditForm, vaccinated: event.target.checked })} />
                          Vaccinated
                        </label>
                        <label className="flex items-center gap-2 rounded-[14px] border border-villa-primary-light bg-villa-primary-bg px-3 py-3 text-sm font-black">
                          <input type="checkbox" checked={dogEditForm.neutered} onChange={(event) => setDogEditForm({ ...dogEditForm, neutered: event.target.checked })} />
                          Neutered
                        </label>
                        <input className="villa-input" value={dogEditForm.allergies} onChange={(event) => setDogEditForm({ ...dogEditForm, allergies: event.target.value })} placeholder="Allergy" />
                        <input className="villa-input" value={dogEditForm.medication} onChange={(event) => setDogEditForm({ ...dogEditForm, medication: event.target.value })} placeholder="Medication" />
                        <textarea className="villa-input h-24 py-3 sm:col-span-2" value={dogEditForm.specialNotes} onChange={(event) => setDogEditForm({ ...dogEditForm, specialNotes: event.target.value })} placeholder="Notes" />
                        <label className="grid cursor-pointer place-items-center rounded-[14px] border border-villa-primary-light bg-villa-primary-bg px-4 py-3 text-sm font-black text-villa-primary sm:col-span-2">
                          {dogEditForm.medicalRecordName ? `Medical record: ${dogEditForm.medicalRecordName}` : "Upload Medical Record"}
                          <input type="file" accept="image/*,.pdf" className="sr-only" onChange={handleMedicalRecordFile} />
                        </label>
                        <button type="button" className="villa-button" onClick={saveDogEdit}>Save Dog</button>
                        <button type="button" className="villa-button-outline bg-white" onClick={() => setDogEditOpen(false)}>Cancel</button>
                      </div>
                    ) : null}
                  </article>
                ) : null}
              </section>

              <section id="booking-center" className="villa-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="section-title">Booking Center</h2>
                  <span className="rounded-full bg-villa-primary-bg px-3 py-1 text-xs font-black text-villa-primary">{filteredOrders.length} bookings</span>
                </div>
                <input className="villa-input mt-4" value={bookingSearch} onChange={(event) => setBookingSearch(event.target.value)} placeholder="Search booking ID, owner, phone, dog, service, or date..." />
                <div className="mt-4 max-h-[420px] overflow-auto rounded-[18px] border border-villa-primary-light bg-white">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="text-xs uppercase text-villa-text-secondary">
                      <tr className="border-b border-villa-primary-light">
                        <th className="py-3">Booking ID</th><th>Owner</th><th>Dog(s)</th><th>Check-in</th><th>Check-out</th><th>Status</th><th>Payment</th><th>Paid</th><th>Balance</th><th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => {
                        const range = getOrderDateRange(order);
                        const owner = ownerForOrder(order);
                        return (
                          <tr key={order.orderId} className="border-b border-villa-primary-light/60 font-bold">
                            <td className="py-3">{order.orderId}</td>
                            <td>{owner.name}</td>
                            <td>{order.pets.map((pet) => pet.name).join(", ") || "Pet"} ({order.pets.length})</td>
                            <td>{shortDate(range?.start)}</td>
                            <td>{shortDate(range?.end)}</td>
                            <td><span className={`rounded-full px-2.5 py-1 text-xs ${statusPill(bookingStatus(order))}`}>{bookingStatus(order)}</span></td>
                            <td><span className={`rounded-full px-2.5 py-1 text-xs ${statusPill(paymentStatus(order))}`}>{paymentStatus(order)}</span></td>
                            <td>{money(order.paid)}</td>
                            <td>{money(order.balance)}</td>
                            <td><button type="button" className="rounded-pill bg-villa-primary px-3 py-1 text-xs font-black text-white" onClick={() => setSelectedOrderId(order.orderId)}>Details</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredOrders.length === 0 ? <p className="body-copy m-4">No bookings yet.</p> : null}
                </div>
              </section>

              <section id="calendar-capacity" className="villa-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="section-title">Calendar Capacity</h2>
                    <p className="body-copy mt-1">Off Day and Full are synced with the customer booking calendar.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="villa-button-outline h-10 bg-white px-4" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}>‹</button>
                    <strong className="min-w-[150px] text-center text-sm font-black">{monthLabel}</strong>
                    <button type="button" className="villa-button-outline h-10 bg-white px-4" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}>›</button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold">
                  {[
                    ["Available", "bg-white"],
                    ["Partially Booked", "bg-amber-50"],
                    ["Full", "bg-red-50"],
                    ["Off Day", "bg-villa-text-primary text-white"]
                  ].map(([label, cls]) => <span key={label} className={`rounded-full border border-villa-primary-light px-3 py-1 ${cls}`}>{label}</span>)}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                  {days.map((date) => {
                    const key = toDateKey(date);
                    const slots = availableSlotsForDate(date, capacityMap);
                    const status = capacityStatus(slots, offDays.includes(key));
                    const label = status === "off" ? "Off Day" : status === "full" ? "Full" : status === "partial" ? `${slots}/${MAX_DOGS_PER_DAY} left` : `${MAX_DOGS_PER_DAY}/${MAX_DOGS_PER_DAY} slots`;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setManagedDay(date)}
                        className={`rounded-[18px] border p-3 text-left text-xs font-black transition hover:-translate-y-px ${
                          status === "off" ? "border-villa-text-primary bg-villa-text-primary text-white" : status === "full" ? "border-red-200 bg-red-50 text-red-600" : status === "partial" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-villa-primary-light bg-white text-villa-text-primary"
                        }`}
                      >
                        <span className="block">{date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        <strong className="mt-2 block text-sm">{label}</strong>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section id="reviews" className="villa-card p-5">
                <h2 className="section-title">Reviews Management</h2>
                <div className="mt-4 grid gap-4 xl:grid-cols-[380px_1fr]">
                  <div className="grid gap-3">
                    <input className="villa-input" value={reviewForm.name} onChange={(event) => setReviewForm({ ...reviewForm, name: event.target.value })} placeholder="Owner name" />
                    <input className="villa-input" value={reviewForm.dogName} onChange={(event) => setReviewForm({ ...reviewForm, dogName: event.target.value })} placeholder="Dog name" />
                    <input className="villa-input" value={reviewForm.breed} onChange={(event) => setReviewForm({ ...reviewForm, breed: event.target.value })} placeholder="Breed" />
                    <input className="villa-input" type="date" value={reviewForm.date} onChange={(event) => setReviewForm({ ...reviewForm, date: event.target.value })} />
                    <label className="grid cursor-pointer place-items-center rounded-[14px] border border-villa-primary-light bg-villa-primary-bg px-4 py-3 text-sm font-black text-villa-primary">
                      {reviewForm.photo ? "Change review photo" : "Optional photo"}
                      <input type="file" accept="image/*" className="sr-only" onChange={handleReviewPhotoFile} />
                    </label>
                    <select className="villa-input" value={reviewForm.rating} onChange={(event) => setReviewForm({ ...reviewForm, rating: Number(event.target.value) })}>
                      {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
                    </select>
                    <textarea className="villa-input h-24 py-3" value={reviewForm.en} onChange={(event) => setReviewForm({ ...reviewForm, en: event.target.value })} placeholder="English review" />
                    <textarea className="villa-input h-24 py-3" value={reviewForm.zh} onChange={(event) => setReviewForm({ ...reviewForm, zh: event.target.value })} placeholder="Chinese review (optional)" />
                    <button type="button" className="villa-button" onClick={publishReview}>Publish Review</button>
                  </div>
                  <div className="grid max-h-[610px] content-start gap-3 overflow-auto pr-1">
                    {reviews.map((review) => (
                      <article key={review.id} className="rounded-[18px] border border-villa-primary-light bg-white p-4">
                        <div className="flex items-start gap-3">
                          {review.photo ? <img src={review.photo} alt={review.dogName || review.pet} className="h-12 w-12 rounded-full object-cover" /> : <div className="grid h-12 w-12 place-items-center rounded-full bg-villa-primary-bg text-villa-primary">★</div>}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-black text-[#f5a623]">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div>
                            <p className="mt-2 text-sm font-bold text-villa-text-primary">{review.quote.en}</p>
                            <p className="mt-2 text-xs font-black text-villa-text-secondary">{review.name} · {review.dogName || review.pet}{review.breed ? ` · ${review.breed}` : ""} · {review.date}</p>
                            <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${statusPill(review.hidden ? "Hidden" : "Live")}`}>{review.hidden ? "Hidden" : "Live"}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" className="rounded-pill border border-villa-primary px-3 py-1 text-xs font-black text-villa-primary" onClick={() => toggleReviewVisibility(review)}>{review.hidden ? "Show" : "Hide"}</button>
                          <button type="button" className="rounded-pill border border-red-200 px-3 py-1 text-xs font-black text-red-500" onClick={() => removeReview(review)}>Delete</button>
                        </div>
                      </article>
                    ))}
                    {reviews.length === 0 ? <p className="body-copy">No reviews yet.</p> : null}
                  </div>
                </div>
              </section>

              <section id="gallery" className="villa-card p-5">
                <h2 className="section-title">Happy Guests Gallery</h2>
                <p className="body-copy mt-1">Only Published photos appear on Home. Customers cannot upload here.</p>
                <div className="mt-4 grid gap-4 xl:grid-cols-[260px_1fr]">
                  <div className="grid gap-3">
                    <label className="grid h-40 cursor-pointer place-items-center overflow-hidden rounded-[18px] border-2 border-dashed border-villa-primary-light bg-villa-primary-bg text-center text-sm font-black text-villa-primary">
                      {photoForm.imageUrl ? <img src={photoForm.imageUrl} alt="" className="h-full w-full object-cover" /> : "Upload photo"}
                      <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoFile} />
                    </label>
                    <input className="villa-input" value={photoForm.petName} onChange={(event) => setPhotoForm({ ...photoForm, petName: event.target.value })} placeholder="Pet name" />
                    <input className="villa-input" value={photoForm.breed} onChange={(event) => setPhotoForm({ ...photoForm, breed: event.target.value })} placeholder="Breed" />
                    <input className="villa-input" value={photoForm.caption} onChange={(event) => setPhotoForm({ ...photoForm, caption: event.target.value })} placeholder="Caption" />
                    <button type="button" className="villa-button" onClick={publishPhoto}>Publish to Home</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {photos.slice(0, 9).map((photo) => (
                      <article key={photo.id} className="overflow-hidden rounded-[18px] border border-villa-primary-light bg-white">
                        <img src={photo.imageUrl || hostPhotoPlaceholder} alt={photo.petName} className="h-28 w-full object-cover" />
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <strong className="block text-sm">{photo.petName}</strong>
                              <span className="text-xs font-bold text-villa-text-secondary">{photo.breed}</span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`rounded-full px-2 py-1 text-[10px] font-black ${statusPill(photo.visibleOnHome ? "Live" : "Hidden")}`}>{photo.visibleOnHome ? "Published" : "Hidden"}</span>
                              {(photo as GuestPhoto & { featured?: boolean }).featured ? <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">Featured</span> : null}
                            </div>
                          </div>
                          {!photo.id.startsWith("guest-") ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button type="button" className="rounded-pill border border-villa-primary px-3 py-1 text-xs font-black text-villa-primary" onClick={() => updateGuestPhoto(photo.id, { visibleOnHome: !photo.visibleOnHome })}>{photo.visibleOnHome ? "Hide" : "Show"}</button>
                              <button type="button" className="rounded-pill border border-amber-200 px-3 py-1 text-xs font-black text-amber-700" onClick={() => updateGuestPhoto(photo.id, { featured: !(photo as GuestPhoto & { featured?: boolean }).featured } as Partial<GuestPhoto>)}>{(photo as GuestPhoto & { featured?: boolean }).featured ? "Unfeature" : "Feature"}</button>
                              <button type="button" className="rounded-pill border border-red-200 px-3 py-1 text-xs font-black text-red-500" onClick={() => deleteGuestPhoto(photo.id)}>Delete</button>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            <aside className="hidden">
              <section id="messages-legacy" className="villa-card p-5 lg:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="card-title">Messages Inbox</h2>
                  {unreadThreads.length ? <span className="rounded-full bg-villa-primary px-2 py-1 text-xs font-black text-white">{unreadThreads.length} unread</span> : null}
                </div>
                <div className="mt-4 grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_260px]">
                  <div className="grid max-h-[360px] content-start gap-2 overflow-auto pr-1">
                    {threads.map((thread) => (
                      <button key={thread.id} type="button" className={`rounded-[14px] border p-3 text-left text-xs font-black ${thread.id === selectedThreadId ? "border-villa-primary bg-villa-primary-bg text-villa-primary" : "border-villa-primary-light bg-white text-villa-text-primary"}`} onClick={() => setSelectedThreadId(thread.id)}>
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate">{thread.userName}</span>
                          {thread.messages.at(-1)?.from === "owner" ? <span className="rounded-full bg-villa-primary px-2 py-0.5 text-[10px] text-white">1</span> : null}
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-villa-text-muted">{thread.messages.at(-1)?.text || "No message yet"}</span>
                        <span className="mt-1 block text-[10px] text-villa-text-muted">{thread.messages.at(-1)?.createdAt ? shortDateFromISO(thread.messages.at(-1)?.createdAt) : ""}</span>
                      </button>
                    ))}
                    {threads.length === 0 ? <p className="body-copy">No customer chats yet.</p> : null}
                  </div>
                  <div className="min-w-0">
                    <div className="rounded-[18px] border border-villa-primary-light bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <strong className="block text-sm text-villa-text-primary">{selectedThread?.userName || "Select a chat"}</strong>
                          <span className="text-xs font-bold text-villa-text-secondary">{selectedThreadCustomer?.phone || selectedThread?.userPhone || "No phone"} · {selectedThreadCustomer?.email || "No email"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid max-h-[340px] gap-3 overflow-auto rounded-[18px] bg-villa-primary-bg p-3">
                      {messages.map((message) => (
                        <div key={message.id} className={`max-w-[86%] rounded-[18px] p-3 text-sm font-bold ${message.from === "host" ? "justify-self-end bg-villa-primary text-white" : "bg-white text-villa-text-primary"}`}>{message.text}</div>
                      ))}
                      {messages.length === 0 ? <p className="body-copy">Choose a customer conversation to reply.</p> : null}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input className="villa-input" value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply as host..." />
                      <button type="button" className="villa-button px-5" onClick={sendHostReply}>Send</button>
                    </div>
                  </div>
                  <aside className="rounded-[18px] border border-villa-primary-light bg-white p-4">
                    <h3 className="card-title">Customer Card</h3>
                    {selectedThreadCustomer ? (
                      <div className="mt-3 grid gap-3 text-sm font-bold">
                        <div className="rounded-[14px] bg-villa-primary-bg p-3">
                          <strong className="block text-villa-text-primary">{selectedThreadCustomer.name}</strong>
                          <span className="block text-xs text-villa-text-secondary">{selectedThreadCustomer.phone || "No phone"}</span>
                          <span className="block text-xs text-villa-text-secondary">{selectedThreadCustomer.email || "No email"}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <span className="rounded-[12px] bg-villa-primary-bg p-2"><b className="block text-base">{selectedChatDogs.length}</b>Dogs</span>
                          <span className="rounded-[12px] bg-villa-primary-bg p-2"><b className="block text-base">{selectedChatOrders.length}</b>Orders</span>
                          <span className="rounded-[12px] bg-villa-primary-bg p-2"><b className="block text-base">{money(selectedChatBalance)}</b>Balance</span>
                        </div>
                        <div className="grid gap-2">
                          <button type="button" className="villa-button-outline bg-white px-3 py-2 text-xs" onClick={() => {
                            setSelectedCustomerId(selectedThreadCustomer.id);
                            scrollToHostSection("customers");
                          }}>Open CRM</button>
                          <button type="button" className="villa-button-outline bg-white px-3 py-2 text-xs" onClick={() => {
                            setBookingSearch(selectedThreadCustomer.name);
                            setBookingStatusFilter("");
                            scrollToHostSection("booking-center");
                          }}>Open Orders</button>
                          <button type="button" className="villa-button px-3 py-2 text-xs" onClick={() => openCreateBooking(selectedThreadCustomer)}>Create Booking</button>
                        </div>
                      </div>
                    ) : (
                      <p className="body-copy mt-3 text-xs">Select a customer chat to view CRM details.</p>
                    )}
                  </aside>
                </div>
              </section>

              <section className="villa-card p-5">
                <h2 className="card-title">Recent Bookings</h2>
                <div className="mt-4 grid gap-3">
                  {orders.slice(0, 4).map((order) => (
                    <article key={order.orderId} className="rounded-[18px] border border-villa-primary-light bg-white p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="block text-villa-text-primary">{order.pets.map((pet) => pet.name).join(", ") || "Pet"}</strong>
                          <span className="text-xs font-bold text-villa-text-secondary">{ownerForOrder(order).name} · {order.serviceLabel} · {orderRangeLabel(order)}</span>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusPill(bookingStatus(order))}`}>{bookingStatus(order)}</span>
                      </div>
                      <div className="mt-2 flex justify-between text-xs font-black">
                        <span>{paymentStatus(order)}</span>
                        <span>{money(order.total)}</span>
                      </div>
                    </article>
                  ))}
                  {orders.length === 0 ? <p className="body-copy">No orders yet.</p> : null}
                </div>
              </section>

              <section className="villa-card p-5">
                <h2 className="card-title">Recent Reviews</h2>
                <div className="mt-4 grid gap-3">
                  {reviews.slice(0, 3).map((review) => (
                    <article key={review.id} className="rounded-[18px] border border-villa-primary-light bg-white p-3">
                      <div className="text-sm font-black text-[#f5a623]">{"★".repeat(review.rating)}</div>
                      <p className="mt-2 line-clamp-2 text-sm font-bold">{review.quote.en}</p>
                      <p className="mt-2 text-xs font-black text-villa-text-secondary">{review.name} · {review.dogName || review.pet}</p>
                    </article>
                  ))}
                </div>
              </section>
            </aside>
          </section>
        </main>
      </div>

      {bookingModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="villa-card max-h-[92vh] w-full max-w-2xl overflow-auto p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="section-title">Create Booking</h2>
                <p className="body-copy mt-1">Create a booking directly from Host Panel.</p>
              </div>
              <button type="button" className="villa-button-outline h-10 bg-white px-4" onClick={() => setBookingModalOpen(false)}>Close</button>
            </div>

            <div className="mt-4 grid gap-4">
              <section className="rounded-[18px] border border-villa-primary-light bg-villa-primary-bg p-4">
                <h3 className="card-title">1. Customer</h3>
                <div className="mt-3 flex gap-2">
                  {(["existing", "new"] as const).map((mode) => (
                    <button key={mode} type="button" className={bookingForm.mode === mode ? "villa-button px-4 py-2 text-xs" : "villa-button-outline bg-white px-4 py-2 text-xs"} onClick={() => setBookingForm({ ...bookingForm, mode, voucherId: "" })}>
                      {mode === "existing" ? "Existing Customer" : "New Customer"}
                    </button>
                  ))}
                </div>
                {bookingForm.mode === "existing" ? (
                  <select className="villa-input mt-3" value={bookingForm.customerId} onChange={(event) => {
                    const customer = customers.find((item) => item.id === event.target.value);
                    const dog = customer?.dogs[0];
                    setBookingForm({
                      ...bookingForm,
                      customerId: event.target.value,
                      customerName: customer?.name || "",
                      customerPhone: customer?.phone || "",
                      customerEmail: customer?.email || "",
                      dogId: dog?.id || "",
                      dogName: dog?.name || "",
                      dogBreed: dog?.breed || "",
                      voucherId: ""
                    });
                  }}>
                    <option value="">Select customer</option>
                    {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone || customer.email || "No contact"}</option>)}
                  </select>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <input className="villa-input" value={bookingForm.customerName} onChange={(event) => setBookingForm({ ...bookingForm, customerName: event.target.value })} placeholder="Customer name" />
                    <input className="villa-input" value={bookingForm.customerPhone} onChange={(event) => setBookingForm({ ...bookingForm, customerPhone: event.target.value })} placeholder="Phone" />
                    <input className="villa-input" value={bookingForm.customerEmail} onChange={(event) => setBookingForm({ ...bookingForm, customerEmail: event.target.value })} placeholder="Email" />
                  </div>
                )}
              </section>

              <section className="rounded-[18px] border border-villa-primary-light bg-white p-4">
                <h3 className="card-title">2. Dog</h3>
                <p className="body-copy mt-1">Choose a saved dog from this customer. If no dog exists, type a new dog and it will be saved to the customer's My Pets.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <select className="villa-input" value={bookingForm.dogId} onChange={(event) => {
                    const dog = dogs.find((item) => item.id === event.target.value && (!bookingForm.customerId || item.ownerId === bookingForm.customerId));
                    setBookingForm({ ...bookingForm, dogId: event.target.value, dogName: dog?.name || bookingForm.dogName, dogBreed: dog?.breed || bookingForm.dogBreed });
                  }}>
                    <option value="">Select saved dog or type below</option>
                    {dogs.filter((dog) => !bookingForm.customerId || dog.ownerId === bookingForm.customerId).map((dog) => <option key={`${dog.ownerId}-${dog.id}`} value={dog.id}>{dog.name} · {dog.breed || "Small dog"}</option>)}
                  </select>
                  <input className="villa-input" value={bookingForm.dogName} onChange={(event) => setBookingForm({ ...bookingForm, dogName: event.target.value })} placeholder="Dog name" />
                  <input className="villa-input sm:col-span-2" value={bookingForm.dogBreed} onChange={(event) => setBookingForm({ ...bookingForm, dogBreed: event.target.value })} placeholder="Breed" />
                </div>
              </section>

              <section className="rounded-[18px] border border-villa-primary-light bg-white p-4">
                <h3 className="card-title">3. Service & Dates</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <select className="villa-input" value={bookingForm.service} onChange={(event) => setBookingForm({ ...bookingForm, service: event.target.value as HostBookingForm["service"] })}>
                    <option value="overnight">Boarding</option>
                    <option value="daycare">Daycare</option>
                  </select>
                  <input className="villa-input" type="date" value={bookingForm.startDate} onChange={(event) => setBookingForm({ ...bookingForm, startDate: event.target.value })} />
                  <input className="villa-input" type="date" value={bookingForm.endDate} onChange={(event) => setBookingForm({ ...bookingForm, endDate: event.target.value })} />
                </div>
              </section>

              <section className="rounded-[18px] border border-villa-primary-light bg-white p-4">
                <h3 className="card-title">4. Payment</h3>
                <div className="mt-3 grid gap-3">
                  <select className="villa-input" value={bookingForm.voucherId} onChange={(event) => setBookingForm({ ...bookingForm, voucherId: event.target.value })} disabled={!bookingForm.customerId || hostVoucherOptions.length === 0}>
                    <option value="">{hostVoucherOptions.length ? "No voucher applied" : "No available voucher"}</option>
                    {hostVoucherOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                  <input className="villa-input" inputMode="numeric" value={bookingForm.paid} onChange={(event) => setBookingForm({ ...bookingForm, paid: event.target.value })} placeholder={`Paid amount RM (deposit ${bookingDeposit})`} />
                  <div className="rounded-[18px] bg-villa-primary-bg p-4 text-sm font-bold text-villa-text-primary">
                    <div className="flex justify-between gap-3"><span>Service</span><strong>{bookingForm.service === "overnight" ? "Boarding" : "Daycare"} · {bookingDateMath.days} day(s) · {bookingDogCount || 1} dog</strong></div>
                    <div className="mt-2 flex justify-between gap-3"><span>Subtotal</span><strong>{money(bookingSubtotal)}</strong></div>
                    <div className="mt-2 flex justify-between gap-3 text-villa-primary"><span>Voucher</span><strong>-{money(voucherDiscount)}</strong></div>
                    <div className="mt-3 border-t border-villa-primary-light pt-3 flex justify-between gap-3 text-base"><span>Total</span><strong>{money(bookingTotal)}</strong></div>
                    <div className="mt-2 flex justify-between gap-3"><span>Suggested Deposit</span><strong>{money(bookingDeposit)}</strong></div>
                    <div className="mt-2 flex justify-between gap-3"><span>Paid Now</span><strong>{money(bookingPaid)}</strong></div>
                    <div className="mt-2 flex justify-between gap-3"><span>Balance</span><strong>{money(bookingBalance)}</strong></div>
                  </div>
                </div>
              </section>

              <button type="button" className="villa-button" onClick={saveHostBooking}>Create Booking</button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedOrder ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 p-3">
          <aside className="villa-card h-full w-full max-w-md overflow-auto p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="section-title">Booking Detail</h2>
                <p className="body-copy mt-1">{selectedOrder.orderId}</p>
              </div>
              <button type="button" className="villa-button-outline h-10 bg-white px-4" onClick={() => setSelectedOrderId("")}>Close</button>
            </div>

            <div className="mt-4 grid gap-3">
              <section className="rounded-[18px] border border-villa-primary-light bg-villa-primary-bg p-4">
                <h3 className="card-title">{selectedOrderOwner?.name || "Pet Owner"}</h3>
                <p className="mt-1 text-xs font-bold text-villa-text-secondary">{selectedOrderOwner?.phone || "No phone"} · {selectedOrderOwner?.email || "No email"}</p>
              </section>

              <section className="rounded-[18px] border border-villa-primary-light bg-white p-4 text-sm font-bold">
                <div className="grid gap-3">
                  <div className="flex justify-between gap-3"><span>Dog</span><strong>{selectedOrder.pets.map((pet) => `${pet.name} (${pet.breed || "Small dog"})`).join(", ")}</strong></div>
                  <div className="flex justify-between gap-3"><span>Service</span><strong>{selectedOrder.serviceLabel}</strong></div>
                  <div className="flex justify-between gap-3"><span>Check In</span><strong>{shortDate(getOrderDateRange(selectedOrder)?.start)}</strong></div>
                  <div className="flex justify-between gap-3"><span>Check Out</span><strong>{shortDate(getOrderDateRange(selectedOrder)?.end)}</strong></div>
                  <div className="flex justify-between gap-3"><span>Status</span><span className={`rounded-full px-2.5 py-1 text-xs ${statusPill(bookingStatus(selectedOrder))}`}>{bookingStatus(selectedOrder)}</span></div>
                  <div className="flex justify-between gap-3"><span>Payment</span><span className={`rounded-full px-2.5 py-1 text-xs ${statusPill(paymentStatus(selectedOrder))}`}>{paymentStatus(selectedOrder)}</span></div>
                </div>
              </section>

              <section className="rounded-[18px] border border-villa-primary-light bg-white p-4 text-sm font-bold">
                <div className="flex justify-between gap-3"><span>Total</span><strong>{money(selectedOrder.total)}</strong></div>
                <div className="mt-2 flex justify-between gap-3"><span>Paid</span><strong>{money(selectedOrder.paid)}</strong></div>
                <div className="mt-2 flex justify-between gap-3 text-villa-primary"><span>Balance</span><strong>{money(selectedOrder.balance)}</strong></div>
              </section>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="villa-button-outline bg-white px-3 py-2 text-xs" onClick={() => updateHostOrder(selectedOrder, (order) => ({ ...order, status: "active" }))}>Check In</button>
                <button type="button" className="villa-button-outline bg-white px-3 py-2 text-xs" onClick={() => updateHostOrder(selectedOrder, (order) => ({ ...order, status: "ready_pickup" }))}>Check Out</button>
                <button type="button" className="villa-button px-3 py-2 text-xs" onClick={() => updateHostOrder(selectedOrder, (order) => ({ ...order, paid: order.total, balance: 0, status: order.status === "balance" ? "confirmed" : order.status }))}>Mark Full Payment</button>
                <button type="button" className="rounded-pill border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-500" onClick={() => updateHostOrder(selectedOrder, (order) => ({ ...order, status: "cancelled", cancelledAt: new Date().toISOString() }))}>Cancel Booking</button>
                <button type="button" className="villa-button-outline col-span-2 bg-white px-3 py-2 text-xs" onClick={() => selectedOrderCustomer && ensureCustomerThread(selectedOrderCustomer)}>Send Message</button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {managedDay ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="villa-card max-h-[90vh] w-full max-w-xl overflow-auto p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="section-title">Manage Day</h2>
                <p className="body-copy mt-1">{managedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
              </div>
              <button type="button" className="villa-button-outline h-10 bg-white px-4" onClick={() => setManagedDay(null)}>Close</button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[16px] bg-villa-primary-bg p-4">
                <p className="text-xs font-black text-villa-text-secondary">Used Slots</p>
                <strong className="text-2xl font-black">{MAX_DOGS_PER_DAY - managedSlots}/{MAX_DOGS_PER_DAY}</strong>
              </div>
              <div className="rounded-[16px] bg-villa-primary-bg p-4">
                <p className="text-xs font-black text-villa-text-secondary">Available</p>
                <strong className="text-2xl font-black">{managedOff ? 0 : managedSlots}</strong>
              </div>
              <div className="rounded-[16px] bg-villa-primary-bg p-4">
                <p className="text-xs font-black text-villa-text-secondary">Status</p>
                <strong className="text-lg font-black">{managedOff ? "Off Day" : managedSlots <= 0 ? "Full" : managedSlots < MAX_DOGS_PER_DAY ? "Partially Booked" : "Available"}</strong>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button type="button" className={managedOff ? "villa-button-outline flex-1 bg-white" : "villa-button flex-1"} onClick={() => setOffDay(managedDay, !managedOff)}>{managedOff ? "Release Off Day" : "Block Off Day"}</button>
            </div>
            <h3 className="card-title mt-5">Bookings on this day</h3>
            <div className="mt-3 grid gap-3">
              {managedOrders.map((order) => (
                <article key={order.orderId} className="rounded-[16px] border border-villa-primary-light bg-white p-3 text-sm font-bold">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong>{ownerForOrder(order).name}</strong>
                      <p className="mt-1 text-xs text-villa-text-secondary">{order.pets.map((pet) => `${pet.name} (${pet.breed || "Small dog"})`).join(", ") || "Pet"}</p>
                      <p className="mt-1 text-xs text-villa-text-muted">{order.serviceLabel} · {orderRangeLabel(order)} · {order.pets.length} slot(s)</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusPill(bookingStatus(order))}`}>{bookingStatus(order)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="rounded-pill border border-villa-primary px-3 py-1 text-xs font-black text-villa-primary" onClick={() => {
                      setSelectedOrderId(order.orderId);
                      setManagedDay(null);
                    }}>Open Booking</button>
                    <button type="button" className="rounded-pill border border-villa-primary px-3 py-1 text-xs font-black text-villa-primary" onClick={() => {
                      const owner = ownerForOrder(order);
                      setSelectedCustomerId(owner.id);
                      setManagedDay(null);
                      scrollToHostSection("customers");
                    }}>Open Customer</button>
                  </div>
                </article>
              ))}
              {managedOrders.length === 0 ? <p className="body-copy">No bookings on this day.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
