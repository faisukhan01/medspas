import { create } from "zustand";

// ── shared client-side types (subset of API payloads) ───────────────────────
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string | null;
  branchId: string | null;
  avatarColor: string;
  specialties: string | null;
  rating: number;
  tenantId: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  country: string;
  currency: string;
  timezone: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  openTime: string;
  closeTime: string;
  taxRate: number;
  isActive: boolean;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string | null;
  branchId: string | null;
  avatarColor: string;
  specialties: string | null;
  qualifications: string | null;
  commissionRate: number;
  rating: number;
  isActive: boolean;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  durationMin: number;
  price: number;
  currency: string;
  depositAmount: number;
  requiresConsultation: boolean;
  emoji: string;
  isActive: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  plan: string;
  status: string;
  country: string;
  currency: string;
  logoEmoji: string;
  brandColor: string;
}

export interface BootData {
  dbMode: "TURSO" | "LOCAL";
  tenant: Tenant;
  user: SafeUser | null;
  branches: Branch[];
  staff: Staff[];
  services: Service[];
  categories: { id: string; name: string; colorHex: string; icon: string }[];
  plans: { id: string; name: string; price: number; currency: string; billingCycle: string; benefits: string | null }[];
  consentTemplates: { id: string; title: string; version: number }[];
  counts: { patients: number; appointments: number; leads: number; products: number };
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface AppState {
  stage: "landing" | "login" | "app";
  boot: BootData | null;
  activeView: string;
  branchFilter: string;
  notifications: NotificationItem[];
  unread: number;
  conciergeOpen: boolean;
  setStage: (s: AppState["stage"]) => void;
  setBoot: (b: BootData) => void;
  setView: (v: string) => void;
  setBranchFilter: (b: string) => void;
  setNotifications: (n: NotificationItem[], unread: number) => void;
  setConciergeOpen: (open: boolean) => void;
}

export const useApp = create<AppState>((set) => ({
  stage: "landing",
  boot: null,
  activeView: "dashboard",
  branchFilter: "all",
  notifications: [],
  unread: 0,
  conciergeOpen: false,
  setStage: (stage) => set({ stage }),
  setBoot: (boot) => set({ boot }),
  setView: (activeView) => set({ activeView }),
  setBranchFilter: (branchFilter) => set({ branchFilter }),
  setNotifications: (notifications, unread) => set({ notifications, unread }),
  setConciergeOpen: (conciergeOpen) => set({ conciergeOpen }),
}));
