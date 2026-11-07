"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { 
  ShieldCheck, 
  Check, 
  RotateCcw, 
  Sparkles, 
  Calendar, 
  Lock, 
  Smartphone, 
  Mail, 
  CreditCard,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

export default function AccountProfilePage() {
  const { user } = useAuthStore();

  // Split name for inputs
  const fullNameParts = (user?.fullName || user?.name || "Elena Vance").split(" ");
  const initialFirstName = fullNameParts[0] || "Elena";
  const initialLastName = fullNameParts.slice(1).join(" ") || "Vance";

  // Form states
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(user?.email || "elena.vance@vogueatelier.com");
  const [phone, setPhone] = useState(user?.phone || "+1 (415) 820-4412");
  const [dob, setDob] = useState("1992-10-24");
  const [honorific, setHonorific] = useState("Ms.");
  const [pronouns, setPronouns] = useState("she/her");

  // Communication toggles
  const [notifVipSales, setNotifVipSales] = useState(true);
  const [notifRoutineReminders, setNotifRoutineReminders] = useState(true);
  const [notifDeliverySms, setNotifDeliverySms] = useState(true);

  // Linked accounts
  const [appleLinked, setAppleLinked] = useState(true);
  const [googleLinked, setGoogleLinked] = useState(true);
  const [oneClickPay, setOneClickPay] = useState(true);

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Đã lưu thông tin cá nhân thành công!", {
      style: {
        borderRadius: "12px",
        background: "#2B2025",
        color: "#fff",
      },
      iconTheme: {
        primary: "#FFA6C9",
        secondary: "#2B2025",
      },
    });
  };

  const handleDiscard = () => {
    setFirstName(initialFirstName);
    setLastName(initialLastName);
    setEmail(user?.email || "elena.vance@vogueatelier.com");
    setPhone(user?.phone || "+1 (415) 820-4412");
    toast("Đã hoàn tác các thay đổi", { icon: "↩️" });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* =========================================================================
          CARD 1: PERSONAL INFORMATION
      ========================================================================= */}
      <div className="rounded-3xl border border-nude/40 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-xl font-bold text-text-primary tracking-tight">Personal Information</h2>
            <p className="text-xs text-text-secondary mt-1">
              Manage your personal identification details and luxury communication credentials.
            </p>
          </div>
          <span className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-full bg-nude/30 px-3 py-1 text-[11px] font-semibold text-text-secondary">
            <Lock className="h-3 w-3 text-status-success" />
            Encrypted & Secure
          </span>
        </div>

        <form onSubmit={handleSaveChanges} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* First Name */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-2xl border border-nude/60 bg-[#FCF8F9] px-4 py-3 text-sm font-medium text-text-primary outline-none focus:border-primary-rose focus:bg-white transition"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-2xl border border-nude/60 bg-[#FCF8F9] px-4 py-3 text-sm font-medium text-text-primary outline-none focus:border-primary-rose focus:bg-white transition"
              />
            </div>

            {/* Email Address */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-text-secondary">Email Address</label>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-status-success bg-status-success/10 px-2 py-0.5 rounded-full">
                  <Check className="h-3 w-3" /> Verified
                </span>
              </div>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-nude/60 bg-[#FCF8F9] px-4 py-3 pr-10 text-sm font-medium text-text-primary outline-none focus:border-primary-rose focus:bg-white transition"
                />
                <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              </div>
            </div>

            {/* Mobile Phone */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-text-secondary">Mobile Phone</label>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-rose bg-primary-pink/20 px-2 py-0.5 rounded-full">
                  SMS Alerts Active
                </span>
              </div>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-2xl border border-nude/60 bg-[#FCF8F9] px-4 py-3 pr-10 text-sm font-medium text-text-primary outline-none focus:border-primary-rose focus:bg-white transition"
                />
                <Smartphone className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-text-secondary">Date of Birth</label>
                <span className="text-[10px] font-semibold text-text-secondary">Bespoke B&apos;day Gift</span>
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full rounded-2xl border border-nude/60 bg-[#FCF8F9] px-4 py-3 text-sm font-medium text-text-primary outline-none focus:border-primary-rose focus:bg-white transition"
                />
              </div>
            </div>

            {/* Honorific & Pronouns (2 columns inside) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">Honorific</label>
                <select
                  value={honorific}
                  onChange={(e) => setHonorific(e.target.value)}
                  className="w-full rounded-2xl border border-nude/60 bg-[#FCF8F9] px-4 py-3 text-sm font-medium text-text-primary outline-none focus:border-primary-rose focus:bg-white transition appearance-none cursor-pointer"
                >
                  <option value="Ms.">Ms.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Dr.">Dr.</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">Pronouns</label>
                <select
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  className="w-full rounded-2xl border border-nude/60 bg-[#FCF8F9] px-4 py-3 text-sm font-medium text-text-primary outline-none focus:border-primary-rose focus:bg-white transition appearance-none cursor-pointer"
                >
                  <option value="she/her">she/her</option>
                  <option value="he/him">he/him</option>
                  <option value="they/them">they/them</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-nude/30">
            <button
              type="button"
              onClick={handleDiscard}
              className="px-5 py-2.5 rounded-full text-xs font-bold text-text-secondary hover:text-text-primary transition"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              className="rounded-full bg-primary px-7 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-secondary"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>


      {/* =========================================================================
          CARD 2: RADIANT SKIN BIO-PROFILE (Matching Stitch Diagnostics)
      ========================================================================= */}
      <div id="skin-profile" className="rounded-3xl border border-outline-variant/30 bg-surface p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-on-surface tracking-tight">Radiant Skin Bio-Profile</h2>
              <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-[10px] font-bold text-primary">
                Linked Diagnostic
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Algorithmically tuned to your cellular turnover and micro-barrier telemetry.
            </p>
          </div>

          <button 
            onClick={() => toast.success("Đang mở bảng chẩn đoán da 60-giây...")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-secondary transition self-start sm:self-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retake 60-Sec Diagnostic
          </button>
        </div>

        {/* 3 Telemetry Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border border-outline-variant/30 bg-background p-4 text-left">
            <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Skin Type Topology</div>
            <div className="text-sm font-extrabold text-on-surface mt-1">Combination / Sensitive</div>
            <div className="flex items-center gap-1.5 text-[11px] text-primary mt-1 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
              T-Zone Radiant Lipid Balance
            </div>
          </div>

          <div className="rounded-2xl border border-outline-variant/30 bg-background p-4 text-left">
            <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Diagnostic Match</div>
            <div className="text-sm font-extrabold text-on-surface mt-1">98% Formulation Affinity</div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 mt-1 font-medium">
              <Check className="h-3.5 w-3.5" />
              Bio-Retinol & Peptide Base
            </div>
          </div>

          <div className="rounded-2xl border border-outline-variant/30 bg-background p-4 text-left">
            <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Cellular Barrier State</div>
            <div className="text-sm font-extrabold text-on-surface mt-1">High Hydration Lock</div>
            <div className="text-[11px] text-on-surface-variant mt-1 font-medium">
              Last Tested Oct 12, 2024
            </div>
          </div>
        </div>

        {/* Chips Rows */}
        <div className="space-y-4 mb-6 pt-2 border-t border-outline-variant/20">
          <div>
            <div className="text-xs font-semibold text-on-surface-variant mb-2">Primary Skin Barrier Focus:</div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-surface-container px-3.5 py-1 text-xs font-semibold text-primary flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary"></span> Glass Skin Dewy Glow
              </span>
              <span className="rounded-full bg-surface-container px-3.5 py-1 text-xs font-semibold text-primary flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary"></span> Micro-Peptide Firming Matrix
              </span>
              <span className="rounded-full bg-surface-container px-3.5 py-1 text-xs font-semibold text-primary flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary"></span> Deep Moisture & Ceramide Seal
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-on-surface-variant mb-2">Allergies & Sensitivities Flags:</div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-surface-container-high px-3.5 py-1 text-xs font-medium text-on-surface flex items-center gap-1.5">
                🌸 Essential Oil Sensitivity
              </span>
              <span className="rounded-full bg-surface-container-high px-3.5 py-1 text-xs font-medium text-on-surface flex items-center gap-1.5">
                ✨ 100% Fragrance-Free Preference
              </span>
            </div>
          </div>
        </div>

        {/* Prescribed Match Box */}
        <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface shadow-sm flex-shrink-0">
              <Image
                src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=200"
                alt="Peptide Glaze Elixir"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-primary">YOUR #1 PRESCRIBED MATCH</span>
              <h4 className="text-sm font-bold text-on-surface">Peptide Glaze Elixir</h4>
              <p className="text-xs text-on-surface-variant font-medium">Illuminating & Firming Botanical Serum • 50ml / 1.7 fl. oz. e</p>
            </div>
          </div>

          <button 
            onClick={() => toast.success("Đang mở cấu hình gói Auto-Replenish định kỳ...")}
            className="rounded-full border border-outline-variant/50 bg-surface px-5 py-2.5 text-xs font-bold text-on-surface shadow-sm hover:border-primary hover:text-primary transition whitespace-nowrap"
          >
            Manage Auto-Replenish
          </button>
        </div>
      </div>


      {/* =========================================================================
          CARD 3: BEAUTY PREFERENCES & COMMUNICATION RITUALS
      ========================================================================= */}
      <div className="rounded-3xl border border-outline-variant/30 bg-surface p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-on-surface tracking-tight">Beauty Preferences & Communication Rituals</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Control how Glow-Up Cosmetic curates recommendations and delivery dispatches.
          </p>
        </div>

        <div className="space-y-5">
          {/* Toggle 1 */}
          <div className="flex items-center justify-between gap-4 py-2 border-b border-outline-variant/20">
            <div>
              <h3 className="text-sm font-bold text-on-surface">Seasonal Formulation Drops & VIP Private Sales</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Early 48-hour access to limited botanical harvests and VIP archive releases.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNotifVipSales(!notifVipSales)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                notifVipSales ? "bg-primary" : "bg-outline-variant/60"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  notifVipSales ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle 2 */}
          <div className="flex items-center justify-between gap-4 py-2 border-b border-outline-variant/20">
            <div>
              <h3 className="text-sm font-bold text-on-surface">Bespoke Skincare Routine Reminders (Morning & Evening)</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Intelligent weather and humidity-based prompts to modify your active serum layers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNotifRoutineReminders(!notifRoutineReminders)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                notifRoutineReminders ? "bg-primary" : "bg-outline-variant/60"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  notifRoutineReminders ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle 3 */}
          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <h3 className="text-sm font-bold text-on-surface">SMS Delivery Milestones & Live Courier Tracking</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Real-time alerts when temperature-sensitive formulation batches leave cold storage.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNotifDeliverySms(!notifDeliverySms)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                notifDeliverySms ? "bg-primary" : "bg-outline-variant/60"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  notifDeliverySms ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>


      {/* =========================================================================
          CARD 4: LINKED CREDENTIALS & EXPRESS CHECKOUT
      ========================================================================= */}
      <div className="rounded-3xl border border-nude/40 bg-white p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-text-primary tracking-tight">Linked Credentials & Express Checkout</h2>
          <p className="text-xs text-text-secondary mt-1">
            Quickly authenticate orders and safeguard your personalized beauty algorithm.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Apple ID */}
          <div className="rounded-2xl border border-nude/40 bg-[#FCF8F9] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white text-base">
                
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-primary">Apple ID</h4>
                <span className="text-[10px] font-semibold text-status-success">
                  {appleLinked ? "Linked" : "Not Linked"}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setAppleLinked(!appleLinked);
                toast(appleLinked ? "Đã ngắt liên kết Apple ID" : "Đã liên kết Apple ID");
              }}
              className="text-xs font-semibold text-text-secondary hover:text-primary-rose transition"
            >
              {appleLinked ? "Unlink" : "Link"}
            </button>
          </div>

          {/* Google Account */}
          <div className="rounded-2xl border border-nude/40 bg-[#FCF8F9] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-nude/40 shadow-sm">
                <Image
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  alt="Google"
                  width={20}
                  height={20}
                />
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-primary">Google Account</h4>
                <span className="text-[10px] font-semibold text-status-success">
                  {googleLinked ? "Linked" : "Not Linked"}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setGoogleLinked(!googleLinked);
                toast(googleLinked ? "Đã ngắt liên kết Google" : "Đã liên kết Google");
              }}
              className="text-xs font-semibold text-text-secondary hover:text-primary-rose transition"
            >
              {googleLinked ? "Unlink" : "Link"}
            </button>
          </div>

          {/* One-Click Pay */}
          <div className="rounded-2xl border border-nude/40 bg-[#FCF8F9] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-pink/30 text-[#D23F72]">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-primary">One-Click Pay</h4>
                <span className="text-[10px] font-semibold text-status-success">Active</span>
              </div>
            </div>
            <button
              onClick={() => toast.success("Đang mở cấu hình ví nhanh One-Click Pay...")}
              className="text-xs font-semibold text-text-secondary hover:text-primary-rose transition"
            >
              Configure
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}