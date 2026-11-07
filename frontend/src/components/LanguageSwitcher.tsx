"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { useState, useTransition, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";

interface LanguageOption {
  code: "vi" | "en";
  short: string;
  flag: string;
  name: string;
}

const LANGUAGES: LanguageOption[] = [
  {
    code: "vi",
    short: "VI",
    flag: "🇻🇳",
    name: "Tiếng Việt",
  },
  {
    code: "en",
    short: "EN",
    flag: "🇬🇧",
    name: "English",
  },
];

export default function LanguageSwitcher() {
  const locale = useLocale();
  const tSwitcher = useTranslations("switcher");
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];

  const handleSelectLanguage = (newLocale: "vi" | "en") => {
    if (newLocale === locale) {
      setIsOpen(false);
      return;
    }

    startTransition(() => {
      // In next-intl, router.replace(pathname, { locale: newLocale }) navigates to the same path under the new locale
      router.replace(pathname, { locale: newLocale });
      setIsOpen(false);
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left font-poppins" ref={dropdownRef}>
      {/* Trigger Button: Luxury pill style */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all active:scale-95 ${
          isOpen
            ? "border-primary-rose bg-white text-[#211A1C] shadow-sm"
            : "bg-white/80 hover:bg-white text-[#211A1C] border-[#F3E5E8] hover:border-[#FFA6C9] shadow-2xs"
        }`}
        aria-label={tSwitcher("title")}
      >
        <span className="text-sm leading-none">{currentLang.flag}</span>
        <span className="font-bold tracking-wider">{currentLang.short}</span>
        <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu liền kề với caret nối */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-44 rounded-2xl bg-white p-1.5 shadow-xl border border-[#F3E5E8] z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Mũi tên kết nối liền mạch với button */}
          <div className="absolute -top-1.5 right-4 h-3 w-3 rotate-45 border-l border-t border-[#F3E5E8] bg-white pointer-events-none" />

          <div className="relative z-10">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#766970] border-b border-gray-100 mb-1">
              {tSwitcher("title")}
            </div>
            <div className="space-y-0.5">
              {LANGUAGES.map((lang) => {
                const isSelected = lang.code === locale;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                      isSelected
                        ? "bg-[#FEF0F3] text-[#DE5D83] font-bold shadow-2xs"
                        : "text-text-primary hover:bg-surface-container-high/60 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base leading-none">{lang.flag}</span>
                      <span className="text-xs">{lang.name}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-[#DE5D83] stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
