"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import toast from "react-hot-toast";

export default function RegisterOnboardingPage() {
  const router = useRouter();
  const tAuth = useTranslations("auth");
  const { login } = useAuthStore();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [skinType, setSkinType] = useState("");
  const [concerns, setConcerns] = useState<string[]>([]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.register({ fullName, email, password });
      toast.success(res.data?.message || "Đăng ký thành công! Vui lòng xác thực email.");
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng ký thất bại";
      // Fallback for offline dev
      if (msg.includes("fetch failed") || msg.includes("Failed to fetch") || msg.includes("ECONNREFUSED")) {
        console.warn("[Register] Backend offline — continuing in offline mode");
        login({ id: "mock_usr", name: fullName, email, role: "CUSTOMER" });
        toast.success("Đăng ký thành công! (offline mode)");
        setStep(2);
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleConcern = (c: string) => {
    setConcerns(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  return (
    <div className="bg-transparent min-h-screen flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-xl rounded-3xl border border-nude/40 bg-surface p-8 md:p-12 shadow-sm font-poppins">
        
        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
          <div className="h-1 flex-1 rounded-full bg-primary-rose"></div>
          <div className={`h-1 flex-1 rounded-full transition-colors duration-500 ${step === 2 ? 'bg-primary-rose' : 'bg-nude'}`}></div>
        </div>

        {step === 1 ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-text-primary mb-2 font-serif">{tAuth("registerTitle")}</h1>
              <p className="text-text-secondary">{tAuth("registerSubtitle")}</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">{tAuth("fullName")}</label>
                <input 
                  required 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Elena Rostova" 
                  className="w-full rounded-xl border border-nude/60 bg-background px-4 py-3 outline-none focus:border-primary-rose transition text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">{tAuth("email")}</label>
                <input 
                  required 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="elena@example.com" 
                  className="w-full rounded-xl border border-nude/60 bg-background px-4 py-3 outline-none focus:border-primary-rose transition text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">{tAuth("password")}</label>
                <input 
                  required 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full rounded-xl border border-nude/60 bg-background px-4 py-3 outline-none focus:border-primary-rose transition text-sm" 
                />
              </div>
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 rounded-xl bg-text-primary mt-6 px-4 py-4 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-primary-rose disabled:opacity-60 disabled:cursor-not-allowed shadow-sm active:scale-95"
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {tAuth("signUp")}...</>
                ) : (
                  <>{tAuth("signUp")}</>
                )}
              </button>
            </form>
            
            <p className="mt-6 text-center text-sm text-text-secondary">
              {tAuth("alreadyHaveAccount")}{" "}
              <Link href="/login" className="font-bold text-primary-rose hover:underline">
                {tAuth("signIn")}
              </Link>
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-3 bg-primary-pink/20 rounded-full mb-4 text-primary-rose">
                <Sparkles className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-2 font-serif">60-Second Skin Diagnostic</h1>
              <p className="text-text-secondary text-sm">Help us curate the perfect Swiss Bio-Tech regimen for you.</p>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-text-primary mb-3">How would you describe your skin?</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['Dry', 'Oily', 'Combination', 'Sensitive'].map(type => (
                    <button 
                      key={type}
                      onClick={() => setSkinType(type)}
                      className={`py-3 px-4 rounded-xl border text-sm font-medium transition ${skinType === type ? 'border-primary-rose bg-primary-pink/10 text-primary-rose' : 'border-nude/60 bg-background text-text-secondary hover:border-primary-rose/50'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-text-primary mb-3">Primary Concerns (Select multiple)</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['Hydration', 'Fine Lines', 'Redness', 'Pigmentation', 'Acne', 'Texture'].map(c => (
                    <button 
                      key={c}
                      onClick={() => toggleConcern(c)}
                      className={`flex items-center justify-between py-3 px-4 rounded-xl border text-sm font-medium transition ${concerns.includes(c) ? 'border-primary-rose bg-primary-pink/10 text-primary-rose' : 'border-nude/60 bg-background text-text-secondary hover:border-primary-rose/50'}`}
                    >
                      {c} {concerns.includes(c) && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button onClick={() => setStep(1)} className="px-6 py-4 rounded-xl border border-nude/60 font-bold text-text-secondary hover:bg-nude/20 transition">Back</button>
                <Link href="/account" className="flex-1 flex justify-center items-center gap-2 rounded-xl bg-primary-rose px-4 py-4 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-secondary">
                  Complete & Build Routine
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
