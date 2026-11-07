"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Mail, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

export default function Footer() {
  const [email, setEmail] = useState("");
  const tNews = useTranslations("newsletter");
  const tFoot = useTranslations("footer");

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    toast.success(tNews("successToast"), {
      style: {
        borderRadius: "16px",
        background: "#211a1c",
        color: "#ffffff",
      },
      iconTheme: {
        primary: "#ffa6c9",
        secondary: "#211a1c",
      },
    });
    setEmail("");
  };

  return (
    <footer className="w-full bg-[#FAF0F3] border-t border-pink-100/70 text-xs text-secondary-text pt-16 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Newsletter Bar Banner */}
        <div className="mb-14 p-8 rounded-3xl bg-white border border-pink-100/80 shadow-card flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-primary text-[10px] font-bold uppercase tracking-widest block">
              {tNews("club")}
            </span>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-primary-text">
              {tNews("title")}
            </h3>
            <p className="text-xs text-secondary-text max-w-lg">
              {tNews("description")}
            </p>
          </div>
          <form onSubmit={handleNewsletterSubmit} className="flex w-full md:w-auto items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={tNews("placeholder")}
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-surface-container-low border border-outline-variant/50 text-xs text-primary-text placeholder:text-secondary-text focus:outline-none focus:ring-1 focus:ring-primary focus:bg-surface"
              />
            </div>
            <button
              type="submit"
              className="bg-primary hover:bg-secondary text-on-primary px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors shadow-xs shrink-0"
            >
              {tNews("join")}
            </button>
          </form>
        </div>

        {/* Main 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start pb-12">
          
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-4">
            <Link 
              href="/" 
              className="font-serif text-2xl font-bold tracking-wider text-primary block"
            >
              GLOW-UP
            </Link>
            <p className="text-xs text-secondary-text max-w-sm leading-relaxed">
              {tFoot("brandDesc")}
            </p>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-primary pt-1">
              <span>{tFoot("locations")}</span>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noreferrer" 
                aria-label="Instagram"
                className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-secondary-text hover:text-primary hover:border-primary border border-outline-variant/40 transition shadow-2xs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </a>
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noreferrer" 
                aria-label="Facebook"
                className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-secondary-text hover:text-primary hover:border-primary border border-outline-variant/40 transition shadow-2xs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            
            {/* Our Science & Brand */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-primary-text uppercase tracking-wider">
                {tFoot("columns.ourScience")}
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/our-science" className="hover:text-primary transition-colors">
                    {tFoot("links.cleanScience")}
                  </Link>
                </li>
                <li>
                  <Link href="/our-science#comparison" className="hover:text-primary transition-colors">
                    {tFoot("links.photometric")}
                  </Link>
                </li>
                <li>
                  <Link href="/our-science#pillars" className="hover:text-primary transition-colors">
                    {tFoot("links.alpineBio")}
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-primary transition-colors">
                    {tFoot("links.heritage")}
                  </Link>
                </li>
                <li>
                  <Link href="/stores" className="hover:text-primary transition-colors">
                    {tFoot("links.locations")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Shop & Collections */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-primary-text uppercase tracking-wider">
                {tFoot("columns.ritualsShop")}
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/shop" className="hover:text-primary transition-colors">
                    {tFoot("links.allFormulations")}
                  </Link>
                </li>
                <li>
                  <Link href="/categories" className="hover:text-primary transition-colors">
                    {tFoot("links.curatedCategories")}
                  </Link>
                </li>
                <li>
                  <Link href="/brands" className="hover:text-primary transition-colors">
                    {tFoot("links.brandDirectory")}
                  </Link>
                </li>
                <li>
                  <Link href="/offers" className="hover:text-primary transition-colors">
                    {tFoot("links.exclusiveOffers")}
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-primary transition-colors">
                    {tFoot("links.beautyGuide")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support & Legal */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-primary-text uppercase tracking-wider">
                {tFoot("columns.clientCare")}
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/support" className="hover:text-primary transition-colors">
                    {tFoot("links.concierge")}
                  </Link>
                </li>
                <li>
                  <Link href="/shipping" className="hover:text-primary transition-colors">
                    {tFoot("links.shipping")}
                  </Link>
                </li>
                <li>
                  <Link href="/returns" className="hover:text-primary transition-colors">
                    {tFoot("links.returns")}
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-primary transition-colors">
                    {tFoot("links.privacy")}
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-primary transition-colors">
                    {tFoot("links.terms")}
                  </Link>
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-outline-variant/30 mb-6" />

        {/* Bottom Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-secondary-text">
          <p>{tFoot("copyright", { year: new Date().getFullYear() })}</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> {tFoot("swissMedic")}
            </span>
            <span className="text-outline">·</span>
            <span>{tFoot("isoCertified")}</span>
          </div>
        </div>

      </div>
    </footer>
  );
}