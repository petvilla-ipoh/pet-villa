import type { PaymentMethod } from "./types";

export const BRAND = {
  name: "The Pet Villa",
  location: "Ipoh",
  descriptor: "Pet Boarding",
  tagline: "A Home Away From Home",
  colors: {
    primary: "#e8927c",
    secondary: "#f5c4b3",
    background: "#faf6f2",
    text: "#3d1f0d",
    accentGreen: "#7a9e7e",
    surface: "#fffaf7",
    border: "#efd8cd"
  },
  fonts: {
    title: "Playfair Display",
    body: "Nunito"
  }
} as const;

export const SERVICE_RULES = {
  minDogWeightKg: 1,
  maxDogWeightKg: 12,
  maxDogsPerDay: 3,
  checkInStartHour: 9,
  checkInEndHour: 20,
  checkOutLatestHour: 12,
  diaryUpdatesPerDay: { min: 3, max: 5 },
  features: [
    "No cages",
    "24h companionship",
    "Daily 3-5 photo/video updates",
    "Same sleeping environment",
    "24h air conditioning"
  ],
  rejectedTraits: ["large_dog", "aggressive", "fleas"]
} as const;

export const PRICING = {
  currency: "MYR",
  overnightBoardingPerNightSen: 4000,
  daycarePerHourSen: 500,
  depositPercent: 50,
  finalPercent: 50
} as const;

export const PAYMENT_METHODS: PaymentMethod[] = [
  "duitnow_qr",
  "fpx",
  "touch_n_go",
  "grabpay",
  "visa_mastercard"
];

export const OWNER_NOTICE = [
  "Please provide health proof and vaccination details before boarding.",
  "Please bring your dog's own food and treats.",
  "Please explain special needs, medication, allergies, habits, and anxiety triggers in advance.",
  "Any discomfort, illness, emergency care, transport, vet, medication, or special handling cost is paid by the owner."
] as const;
