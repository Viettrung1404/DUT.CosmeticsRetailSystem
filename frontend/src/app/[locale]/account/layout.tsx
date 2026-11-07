"use client";

import { Link } from "@/i18n/routing";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect, useState } from "react";
import { 
  User, 
  Sparkles, 
  ShoppingBag, 
  Heart, 
  Award, 
  Repeat, 
  MapPin, 
  CreditCard, 
  ShieldCheck, 
  LogOut, 
  Package, 
  ChevronRight, 
  MessageCircle, 
  Camera, 
  Loader2,
  Shield,
  Sun,
  HeartHandshake,
  CheckCircle2
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    toast.success("Đã đăng xuất thành công");
    router.push("/login");
  };

  if (!mounted || !isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary-rose" />
        <p className="text-sm text-text-secondary">Đang tải hồ sơ khách hàng...</p>
      </div>
    );
  }

  const displayName = user?.fullName || user?.name || "Elena Vance";

  const navMenuItems = [
    { label: "Profile & Personal Info", href: "/account", icon: User, badge: null, activeExact: true },
    { label: "Skin Profile & Diagnostic", href: "/account#skin-profile", icon: Sparkles, badge: "Updated", badgeColor: "bg-status-success/15 text-status-success" },
    { label: "Order History & Tracking", href: "/account/orders", icon: ShoppingBag, badge: "1 In Transit", badgeColor: "bg-primary-pink/30 text-primary-rose" },
    { label: "My Saved Rituals & Wishlist", href: "/wishlist", icon: Heart, badge: "5 Items", badgeColor: "bg-nude/40 text-text-secondary" },
    { label: "Atelier VIP Loyalty & Rewards", href: "/account/loyalty", icon: Award, badge: "1,420 pts", badgeColor: "bg-primary-pink/20 text-primary-rose" },
    { label: "Auto-Replenish Subscriptions", href: "/account/subscriptions", icon: Repeat, badgeDot: true },
    { label: "Saved Addresses & Shipping", href: "/account/addresses", icon: MapPin, badge: null },
    { label: "Payment & Atelier Wallet", href: "/account/wallet", icon: CreditCard, badge: null },
    { label: "Security & Privacy", href: "/account/security", icon: ShieldCheck, badge: null },
  ];

  return (
    <div className="min-h-screen bg-transparent pb-24 text-text-primary">
      {/* Top Banner Accent */}
      <div className="bg-[#FAF3F5] border-b border-nude/30 py-2.5 text-center text-xs tracking-wider text-text-secondary">
        ✨ Curated Swiss Clinical Botanical Radiance • Enjoy complimentary Rose Quartz Gua Sha on orders over $75
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs font-medium text-text-secondary">
          <Link href="/" className="hover:text-primary-rose transition">Home</Link>
          <span>›</span>
          <Link href="/account" className="hover:text-primary-rose transition">My Account</Link>
          <span>›</span>
          <span className="text-text-primary font-semibold">
            {pathname === "/account/orders" ? "Order History & Tracking" : 
             pathname === "/account/addresses" ? "Saved Addresses" : "Profile & Ritual Preferences"}
          </span>
        </nav>

        {/* Hero Welcome Card (Soft Pink Glassmorphism gradient matching Stitch) */}
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-[#F3D7E2]/60 bg-gradient-to-r from-[#FFF0F5] via-[#FFF6F9] to-[#FFF0F4] p-6 sm:p-8 shadow-sm">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* User Info Left */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="relative h-20 w-20 overflow-hidden rounded-2xl border-2 border-white shadow-md bg-[#FCE7F0]">
                  <Image
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400"
                    alt={displayName}
                    fill
                    className="object-cover"
                  />
                </div>
                <button 
                  aria-label="Edit avatar"
                  className="absolute -bottom-1.5 -right-1.5 rounded-full bg-white p-1.5 text-text-secondary shadow-md hover:text-primary-rose transition border border-nude/40"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
                    Welcome back, {displayName}
                  </h1>
                  <span className="rounded-full bg-[#FFE3ED] px-3 py-1 text-[11px] font-bold tracking-wider uppercase text-[#D23F72]">
                    Radiant Atelier Member
                  </span>
                </div>
                <p className="mt-1.5 text-xs sm:text-sm text-text-secondary font-medium">
                  Atelier Member since September 2023 • <span className="text-text-primary font-semibold">Bespoke Skin ID: #GLW-7728</span>
                </p>
              </div>
            </div>

            {/* Atelier Glow Points Right Card */}
            <div className="min-w-[280px] sm:min-w-[320px] rounded-2xl border border-white/80 bg-white/90 backdrop-blur-md p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D23F72] text-[10px] text-white font-bold">★</div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Atelier Glow Points</span>
                </div>
                <span className="text-xl font-extrabold text-[#D23F72]">1,420 <span className="text-xs font-semibold text-text-secondary">pts</span></span>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="h-2 w-full rounded-full bg-[#F5DEE7]/70 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#FFA6C9] to-[#D23F72] transition-all duration-700" style={{ width: "94%" }}></div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-text-secondary font-medium">
                  <span>Gold Member Formulation Gift</span>
                  <span className="font-semibold text-text-primary">80 pts to 1,500</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Columns Body */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left Sidebar (3 Stacked Cards matching Stitch) */}
          <aside className="w-full lg:w-80 flex-shrink-0 space-y-6">
            
            {/* 1. Main Navigation Menu Card */}
            <div className="rounded-3xl border border-nude/40 bg-white p-4 shadow-sm space-y-1">
              {navMenuItems.map((item) => {
                const isActive = item.activeExact ? pathname === item.href : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition group ${
                      isActive
                        ? "bg-[#FFF0F5] text-[#D23F72] font-bold"
                        : "text-text-secondary hover:bg-background hover:text-text-primary"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 transition-colors ${isActive ? "text-[#D23F72]" : "text-text-secondary group-hover:text-primary-rose"}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor || "bg-nude/30 text-text-secondary"}`}>
                        {item.badge}
                      </span>
                    )}
                    {item.badgeDot && (
                      <span className="h-2 w-2 rounded-full bg-status-success"></span>
                    )}
                  </Link>
                );
              })}

              <div className="pt-2 border-t border-nude/30 mt-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3.5 py-3 rounded-2xl text-xs font-bold text-status-danger hover:bg-status-danger/10 transition"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out of Atelier
                </button>
              </div>
            </div>

            {/* 2. Active Order Status Card */}
            <Link
              href="/account/orders"
              className="block rounded-3xl border border-nude/40 bg-white p-5 shadow-sm hover:border-[#FFA6C9] hover:shadow-md transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF0F5] text-[#D23F72]">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#D23F72]">Active Order #GLW-8931</div>
                    <div className="text-xs font-bold text-text-primary mt-0.5">Peptide Glaze Elixir • In Transit</div>
                    <div className="text-[11px] text-text-secondary mt-0.5 font-medium">Arriving Thursday, Oct 26</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-text-secondary transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            {/* 3. Atelier Concierge Card */}
            <div className="rounded-3xl border border-outline-variant/30 bg-surface p-6 shadow-sm text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-primary mb-3.5">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-on-surface">Atelier Concierge</h3>
              <p className="mt-1 text-xs text-on-surface-variant leading-relaxed font-medium">
                Need bespoke clinical routine advice? Connect with our lead Swiss Esthetician 24/7.
              </p>
              <button 
                onClick={() => toast.success("Đang kết nối tới chuyên viên Thụy Sĩ (Live Concierge)...")}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-xs font-bold text-white shadow-sm transition hover:bg-secondary"
              >
                <MessageCircle className="h-4 w-4" />
                Chat with Concierge
              </button>
            </div>

          </aside>

          {/* Right Main Content Area */}
          <main className="flex-1 w-full min-w-0">
            {children}
          </main>

        </div>

        {/* Bottom Trust Badges Bar (Matching Stitch footer guarantee pillars) */}
        <div className="mt-20 border-t border-nude/40 pt-10 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF0F5] text-[#D23F72] mb-3">
              <Sparkles className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">Swiss-Formulated</h4>
            <p className="text-[11px] text-text-secondary mt-1">Clinically validated actives</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF0F5] text-[#D23F72] mb-3">
              <Shield className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">100% UV Violet Glass</h4>
            <p className="text-[11px] text-text-secondary mt-1">Bio-photon active preservation</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF0F5] text-[#D23F72] mb-3">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">Cruelty-Free Certified</h4>
            <p className="text-[11px] text-text-secondary mt-1">Leaping Bunny recognized</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF0F5] text-[#D23F72] mb-3">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">30-Day Radiant Guarantee</h4>
            <p className="text-[11px] text-text-secondary mt-1">Hassle-free complimentary returns</p>
          </div>
        </div>

      </div>
    </div>
  );
}