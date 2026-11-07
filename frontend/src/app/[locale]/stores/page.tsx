"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { 
  Sparkles, 
  MapPin, 
  Clock, 
  Phone, 
  Navigation, 
  ShieldCheck, 
  Calendar, 
  Check, 
  Compass, 
  Star, 
  Award, 
  Gift, 
  FlaskConical, 
  Camera, 
  Flower2, 
  X,
  CheckCircle2,
  Share2
} from "lucide-react";
import toast from "react-hot-toast";

interface Atelier {
  id: string;
  flagshipId: string;
  name: string;
  address: string;
  openStatus: string;
  region: "north-america" | "europe";
  leadEsthetician: string;
  leadEstheticianInitials: string;
  features: string[];
  phone: string;
  mapCoords: { x: number; y: number; label: string };
  image: string;
}

interface Protocol {
  id: string;
  duration: string;
  name: string;
  price: string;
  numericPrice: number;
  description: string;
  isComplimentary?: boolean;
}

interface Esthetician {
  id: string;
  name: string;
  role: string;
}

const ATELIERS: Atelier[] = [
  {
    id: "soho",
    flagshipId: "Flagship 01",
    name: "SoHo Flagship Boutique & Atelier",
    address: "450 Park Avenue South / SoHo, New York, NY 10016",
    openStatus: "Open Today · Until 20:00 EST",
    region: "north-america",
    leadEsthetician: "Sarah Jenkins",
    leadEstheticianInitials: "SJ",
    features: ["Fragrance Bar", "Private VIP Suite", "Glaze Signature Facial"],
    phone: "+1 (212) 555-0198",
    mapCoords: { x: 26, y: 44, label: "New York" },
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "geneva",
    flagshipId: "Flagship 02",
    name: "Geneva Central Laboratory & Spa",
    address: "Rue du Rhône 42, 1204 Geneva, Switzerland",
    openStatus: "Open Today · 09:30 - 19:00 CET",
    region: "europe",
    leadEsthetician: "Dr. Marc Weber",
    leadEstheticianInitials: "MW",
    features: ["Lab Dispensing", "Cleanroom Sterile Circa", "Cryo-Bio Peptide"],
    phone: "+41 22 555 4321",
    mapCoords: { x: 62, y: 36, label: "Geneva Lab" },
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "paris",
    flagshipId: "Flagship 03",
    name: "Paris Le Marais Atelier",
    address: "28 Rue des Francs-Bourgeois, 75004 Paris, France",
    openStatus: "Open Today · 10:00 - 19:30 CET",
    region: "europe",
    leadEsthetician: "Camille Laurent",
    leadEstheticianInitials: "CL",
    features: ["Master Color Studio", "French Phyto-Active", "Lymphatic Gua Sha"],
    phone: "+33 1 42 68 55 00",
    mapCoords: { x: 74, y: 52, label: "Paris Le Marais" },
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800",
  },
];

const PROTOCOLS: Protocol[] = [
  {
    id: "proto-1",
    duration: "60-Min",
    name: "60-Min Bio-Peptide Facial",
    price: "$185",
    numericPrice: 185,
    description: "Intense cellular glass infusion & micro-sculpting.",
  },
  {
    id: "proto-2",
    duration: "45-Min",
    name: "45-Min Glass Skin Barrier",
    price: "$140",
    numericPrice: 140,
    description: "Lipid re-balancing with peptide glaze ampoule.",
  },
  {
    id: "proto-3",
    duration: "30-Min",
    name: "30-Min Express Glow Sculpt",
    price: "$85",
    numericPrice: 85,
    description: "Lymphatic drainage with warmed rose quartz.",
  },
  {
    id: "proto-4",
    duration: "20-Min",
    name: "20-Min Digital Diagnostic",
    price: "Complimentary",
    numericPrice: 0,
    isComplimentary: true,
    description: "Biophotonic hydration camera analysis & routine design.",
  },
];

const ESTHETICIANS: Esthetician[] = [
  { id: "sarah", name: "Sarah Jenkins", role: "Lead Esthetician" },
  { id: "elena", name: "Elena Rostova", role: "Cellular Specialist" },
  { id: "chloe", name: "Chloé Dubois", role: "Dermal Therapist" },
  { id: "any", name: "Any Specialist", role: "Earliest Slot" },
];

const TIME_SLOTS = {
  morning: ["10:30 AM", "11:45 AM"],
  afternoon: ["02:15 PM", "04:00 PM", "05:30 PM"],
};

export default function StoresPage() {
  const [selectedRegion, setSelectedRegion] = useState<"all" | "europe" | "north-america">("all");
  const [selectedAtelierId, setSelectedAtelierId] = useState<string>("soho");
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>("proto-1");
  const [selectedEstheticianId, setSelectedEstheticianId] = useState<string>("sarah");
  const [selectedTime, setSelectedTime] = useState<string>("02:15 PM");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const selectedAtelier = ATELIERS.find((a) => a.id === selectedAtelierId) || ATELIERS[0];
  const selectedProtocol = PROTOCOLS.find((p) => p.id === selectedProtocolId) || PROTOCOLS[0];
  const selectedEsthetician = ESTHETICIANS.find((e) => e.id === selectedEstheticianId) || ESTHETICIANS[0];

  const filteredAteliers = ATELIERS.filter((a) => {
    if (selectedRegion === "all") return true;
    return a.region === selectedRegion;
  });

  const handleCallConcierge = (atelier: Atelier) => {
    toast.success(`Đang kết nối đường dây hỗ trợ riêng: ${atelier.phone}`, {
      style: { background: "#211a1c", color: "#fff", borderRadius: "12px" },
      iconTheme: { primary: "#FFA6C9", secondary: "#211a1c" },
    });
  };

  const handleGetDirections = (atelier: Atelier) => {
    toast.success(`Đã sao chép địa chỉ của ${atelier.name} vào bộ nhớ tạm!`, {
      style: { background: "#211a1c", color: "#fff", borderRadius: "12px" },
      iconTheme: { primary: "#FFA6C9", secondary: "#211a1c" },
    });
    navigator.clipboard?.writeText(atelier.address);
  };

  const handleConfirmReservation = () => {
    setIsSuccessModalOpen(true);
    toast.success("Xác nhận lịch hẹn thành công tại Atelier Thụy Sĩ!", {
      style: { background: "#211a1c", color: "#fff", borderRadius: "12px" },
      iconTheme: { primary: "#FFA6C9", secondary: "#211a1c" },
    });
  };

  return (
    <div className="min-h-screen bg-[#FFF9FA] text-[#211a1c] font-sans pb-24">

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14">

        {/* 1. TOP HEADER & METRIC BADGES */}
        <section className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-50 text-[#732845] border border-pink-200/60 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest mb-4 shadow-2xs">
            <Sparkles className="h-3 w-3 text-[#732845]" />
            <span>HAUTE PARFUMERIE & CELLULAR SKINCARE CLINICS</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#211a1c] font-serif mb-4 leading-tight">
            Ateliers & Bespoke Skin Consultations
          </h1>

          <p className="text-xs sm:text-sm text-secondary-text max-w-2xl mx-auto leading-relaxed mb-8 font-medium">
            Experience Swiss cellular formulations and personalized dermal protocols with our master estheticians in Geneva, New York, and Paris.
          </p>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-white/95 border border-pink-100 shadow-xs text-left">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-[#732845] border border-pink-100">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-sm font-bold text-[#211a1c]">3 Global</span>
                <span className="text-[11px] text-secondary-text font-medium">Flagship Ateliers</span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-white/95 border border-pink-100 shadow-xs text-left">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-[#732845] border border-pink-100">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-sm font-bold text-[#211a1c]">100% Certified</span>
                <span className="text-[11px] text-secondary-text font-medium">Swiss Estheticians</span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-white/95 border border-pink-100 shadow-xs text-left">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-[#732845] border border-pink-100">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-sm font-bold text-[#211a1c]">Complimentary</span>
                <span className="text-[11px] text-secondary-text font-medium">15-Min Skin Diagnosis</span>
              </div>
            </div>
          </div>
        </section>


        {/* 2. MAIN TWO-COLUMN INTERACTIVE BOOKING LAYOUT */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-24">

          {/* LEFT COLUMN: BOUTIQUE DIRECTORY (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif text-[#211a1c] mb-1">
                Boutique Directory
              </h2>
              <p className="text-xs text-secondary-text">
                Select an atelier to reserve your treatment protocol
              </p>
            </div>

            {/* Region Filter Capsule Buttons */}
            <div className="flex items-center gap-1.5 p-1 rounded-full bg-pink-50/70 border border-pink-100/80 text-xs">
              <button
                onClick={() => setSelectedRegion("all")}
                className={`flex-1 py-1.5 px-3 rounded-full font-bold transition-all text-xs ${
                  selectedRegion === "all"
                    ? "bg-white text-[#732845] shadow-xs"
                    : "text-secondary-text hover:text-[#211a1c]"
                }`}
              >
                All Locations (3)
              </button>
              <button
                onClick={() => setSelectedRegion("europe")}
                className={`flex-1 py-1.5 px-3 rounded-full font-bold transition-all text-xs ${
                  selectedRegion === "europe"
                    ? "bg-white text-[#732845] shadow-xs"
                    : "text-secondary-text hover:text-[#211a1c]"
                }`}
              >
                Europe
              </button>
              <button
                onClick={() => setSelectedRegion("north-america")}
                className={`flex-1 py-1.5 px-3 rounded-full font-bold transition-all text-xs ${
                  selectedRegion === "north-america"
                    ? "bg-white text-[#732845] shadow-xs"
                    : "text-secondary-text hover:text-[#211a1c]"
                }`}
              >
                North America
              </button>
            </div>

            {/* List of Atelier Cards */}
            <div className="space-y-4">
              {filteredAteliers.map((atelier) => {
                const isSelected = selectedAtelierId === atelier.id;
                return (
                  <div
                    key={atelier.id}
                    onClick={() => setSelectedAtelierId(atelier.id)}
                    className={`rounded-3xl border p-5 sm:p-6 transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? "bg-white border-[#732845] shadow-md ring-2 ring-[#732845]/15"
                        : "bg-white/80 border-pink-100/80 hover:bg-white hover:border-pink-200 shadow-2xs hover:shadow-xs"
                    }`}
                  >
                    {/* Top Status & Flagship ID */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-bold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {atelier.openStatus}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-secondary-text uppercase">
                        {atelier.flagshipId}
                      </span>
                    </div>

                    {/* Atelier Name */}
                    <h3 className="text-base sm:text-lg font-bold text-[#211a1c] mb-2 font-serif">
                      {atelier.name}
                    </h3>

                    {/* Address */}
                    <div className="flex items-start gap-2 text-xs text-secondary-text mb-3">
                      <MapPin className="h-4 w-4 shrink-0 text-[#732845] mt-0.5" />
                      <span className="line-clamp-2 leading-relaxed">{atelier.address}</span>
                    </div>

                    {/* Lead Esthetician */}
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-pink-50">
                      <div className="h-6 w-6 rounded-full bg-pink-100 text-[#732845] flex items-center justify-center text-[10px] font-bold">
                        {atelier.leadEstheticianInitials}
                      </div>
                      <span className="text-xs text-secondary-text">
                        Lead Esthetician: <strong className="text-[#211a1c]">{atelier.leadEsthetician}</strong>
                      </span>
                    </div>

                    {/* Feature Tags */}
                    <div className="flex flex-wrap items-center gap-2 mb-5">
                      {atelier.features.map((feature, fIdx) => (
                        <span
                          key={fIdx}
                          className="rounded-lg bg-pink-50/70 border border-pink-100 text-[#732845] px-2.5 py-1 text-[10px] font-semibold"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>

                    {/* Actions Footer */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCallConcierge(atelier);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-secondary-text hover:text-[#732845] font-semibold transition"
                          title="Gọi Concierge"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Call Concierge</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGetDirections(atelier);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-secondary-text hover:text-[#732845] font-semibold transition"
                          title="Chỉ đường"
                        >
                          <Navigation className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Get Directions</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAtelierId(atelier.id);
                        }}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all active:scale-95 shadow-xs ${
                          isSelected
                            ? "bg-[#732845] text-white hover:bg-[#591e35]"
                            : "bg-pink-100/70 text-[#732845] hover:bg-[#732845] hover:text-white"
                        }`}
                      >
                        {isSelected ? "Selected" : "Select Atelier"}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>


          {/* RIGHT COLUMN: INTERACTIVE MAP & RITUAL RESERVATION (7 cols) */}
          <div className="lg:col-span-7 space-y-6">

            {/* CARD 1: INTERACTIVE GLOBAL MAP */}
            <div className="rounded-3xl border border-pink-100 bg-white p-5 sm:p-6 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Compass className="h-4 w-4 text-[#732845]" />
                  <h3 className="text-sm font-bold text-[#211a1c]">Interactive Global Map</h3>
                </div>
                <span className="rounded-full bg-pink-50 text-[#732845] border border-pink-100 px-3 py-1 text-[10px] font-bold">
                  Live Satellite & Boutique Status
                </span>
              </div>

              {/* Graphic Map Canvas with connected coordinates */}
              <div className="relative h-64 sm:h-72 w-full rounded-2xl bg-gradient-to-br from-[#FFF0F4] via-[#FFEBF1] to-[#FFF5F7] border border-pink-100/70 overflow-hidden flex items-center justify-center">
                {/* SVG Coordinate Grid Background */}
                <svg className="absolute inset-0 h-full w-full stroke-pink-200/50" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
                      <path d="M 36 0 L 0 0 0 36" fill="none" strokeWidth="0.8" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  
                  {/* Connected Dashed Flight/Transit Lines between Geneva, Paris, and NY */}
                  <path 
                    d="M 170 120 Q 300 80 410 100 T 490 145" 
                    fill="none" 
                    stroke="#FFA6C9" 
                    strokeWidth="1.5" 
                    strokeDasharray="4 4"
                    className="opacity-70"
                  />
                </svg>

                {/* Pin 1: New York */}
                <button
                  type="button"
                  onClick={() => setSelectedAtelierId("soho")}
                  style={{ left: "26%", top: "42%" }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group/pin z-10 transition-transform active:scale-95"
                >
                  <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full shadow-md border border-pink-200">
                    <span className={`h-2.5 w-2.5 rounded-full ${selectedAtelierId === "soho" ? "bg-[#732845] ring-4 ring-pink-300" : "bg-pink-400"}`} />
                    <span className="text-[11px] font-bold text-[#211a1c]">New York</span>
                  </div>
                </button>

                {/* Pin 2: Geneva Lab */}
                <button
                  type="button"
                  onClick={() => setSelectedAtelierId("geneva")}
                  style={{ left: "62%", top: "34%" }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group/pin z-10 transition-transform active:scale-95"
                >
                  <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full shadow-md border border-pink-200">
                    <span className={`h-2.5 w-2.5 rounded-full ${selectedAtelierId === "geneva" ? "bg-[#732845] ring-4 ring-pink-300" : "bg-pink-400"}`} />
                    <span className="text-[11px] font-bold text-[#211a1c]">Geneva Lab</span>
                  </div>
                </button>

                {/* Pin 3: Paris Le Marais */}
                <button
                  type="button"
                  onClick={() => setSelectedAtelierId("paris")}
                  style={{ left: "74%", top: "52%" }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group/pin z-10 transition-transform active:scale-95"
                >
                  <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full shadow-md border border-pink-200">
                    <span className={`h-2.5 w-2.5 rounded-full ${selectedAtelierId === "paris" ? "bg-[#732845] ring-4 ring-pink-300" : "bg-pink-400"}`} />
                    <span className="text-[11px] font-bold text-[#211a1c]">Paris Le Marais</span>
                  </div>
                </button>

                {/* Bottom Selected Atelier Floating Capsule */}
                <div className="absolute bottom-3 left-4 right-4 sm:left-auto sm:right-4 z-10">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-white/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-[#732845] border border-pink-200 shadow-sm">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Selected: {selectedAtelier.name}</span>
                  </span>
                </div>
              </div>
            </div>


            {/* CARD 2: RESERVE YOUR ATELIER RITUAL */}
            <div className="rounded-3xl border border-pink-100 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#732845] block mb-1">
                    BESPOKE PROTOCOL
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold font-serif text-[#211a1c]">
                    Reserve Your Atelier Ritual
                  </h3>
                </div>
                <div className="h-10 w-10 rounded-full bg-pink-50 text-[#732845] flex items-center justify-center border border-pink-100">
                  <Flower2 className="h-5 w-5" />
                </div>
              </div>

              {/* STEP 1: SELECT RITUAL PROTOCOL */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="font-bold text-[#211a1c]">Step 1: Select Ritual Protocol</span>
                  <span className="text-secondary-text font-medium text-[11px]">All include Skin Diagnosis</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PROTOCOLS.map((protocol) => {
                    const isSelected = selectedProtocolId === protocol.id;
                    return (
                      <div
                        key={protocol.id}
                        onClick={() => setSelectedProtocolId(protocol.id)}
                        className={`rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-[#FFF2F6] border-[#732845] ring-2 ring-[#732845]/20 shadow-xs"
                            : "bg-white border-pink-100/90 hover:border-pink-200 shadow-2xs hover:shadow-xs"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-xs sm:text-sm font-bold text-[#211a1c] font-serif leading-snug">
                            {protocol.name}
                          </h4>
                          <span className={`text-xs font-bold font-mono shrink-0 ${protocol.isComplimentary ? "text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md" : "text-[#732845]"}`}>
                            {protocol.price}
                          </span>
                        </div>
                        <p className="text-[11px] text-secondary-text leading-relaxed">
                          {protocol.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STEP 2: CHOOSE ESTHETICIAN */}
              <div className="mb-6">
                <span className="block text-xs font-bold text-[#211a1c] mb-3">Step 2: Choose Esthetician</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {ESTHETICIANS.map((esthetician) => {
                    const isSelected = selectedEstheticianId === esthetician.id;
                    return (
                      <button
                        key={esthetician.id}
                        type="button"
                        onClick={() => setSelectedEstheticianId(esthetician.id)}
                        className={`rounded-2xl p-3 border text-center transition-all text-left ${
                          isSelected
                            ? "bg-[#FFF2F6] border-[#732845] ring-2 ring-[#732845]/20 shadow-xs"
                            : "bg-white border-pink-100 hover:border-pink-200 shadow-2xs hover:shadow-xs"
                        }`}
                      >
                        <span className="block text-xs font-bold text-[#211a1c] truncate">{esthetician.name}</span>
                        <span className="block text-[10px] text-secondary-text truncate mt-0.5">{esthetician.role}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 3: SELECT DATE & AVAILABLE SLOT */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="font-bold text-[#211a1c]">Step 3: Select Date & Available Slot</span>
                  <span className="text-[#732845] font-bold text-[11px]">Tomorrow, October 24</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-secondary-text block mb-1.5">
                      MORNING SESSIONS
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {TIME_SLOTS.morning.map((slot) => {
                        const isSelected = selectedTime === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedTime(slot)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                              isSelected
                                ? "bg-[#732845] text-white border-[#732845] shadow-xs"
                                : "bg-white text-secondary-text hover:text-[#211a1c] border-pink-100 hover:border-pink-200"
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-secondary-text block mb-1.5">
                      AFTERNOON SESSIONS
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {TIME_SLOTS.afternoon.map((slot) => {
                        const isSelected = selectedTime === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedTime(slot)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                              isSelected
                                ? "bg-[#732845] text-white border-[#732845] shadow-xs"
                                : "bg-white text-secondary-text hover:text-[#211a1c] border-pink-100 hover:border-pink-200"
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* RESERVATION SUMMARY BOX */}
              <div className="rounded-2xl bg-[#FFF5F8] border border-pink-200/70 p-4 sm:p-5 mb-6">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-secondary-text mb-2">
                  Reservation Summary
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-secondary-text">Location:</span>
                    <strong className="text-[#211a1c]">{selectedAtelier.name}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-secondary-text">Protocol:</span>
                    <strong className="text-[#211a1c]">{selectedProtocol.name} ({selectedProtocol.price})</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-secondary-text">Esthetician & Time:</span>
                    <strong className="text-[#211a1c]">{selectedEsthetician.name} · Tomorrow at {selectedTime}</strong>
                  </div>
                </div>
              </div>

              {/* CONFIRM CTA BUTTON */}
              <button
                type="button"
                onClick={handleConfirmReservation}
                className="w-full rounded-2xl bg-[#732845] hover:bg-[#591e35] text-white py-4 font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <Calendar className="h-4 w-4" />
                <span>Confirm Atelier Reservation</span>
              </button>

              <div className="mt-3 text-center">
                <span className="text-[11px] text-secondary-text font-medium flex items-center justify-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>100% Satisfaction Guarantee · Complimentary 24-Hour Rescheduling</span>
                </span>
              </div>

            </div>

          </div>

        </section>


        {/* 3. SECTION: THE BOUTIQUE EXPERIENCE */}
        <section className="mb-24 pt-8 border-t border-pink-100">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#732845] block mb-2">
              THE STANDARD OF CARE
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#211a1c] mb-3">
              The Boutique Experience
            </h2>
            <p className="text-xs sm:text-sm text-secondary-text leading-relaxed">
              Every appointment is an intimate sensory journey rooted in Swiss biotechnology and restorative touch.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Card 1 */}
            <div className="rounded-3xl bg-white border border-pink-100 p-6 sm:p-8 shadow-xs flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-[#732845] mb-5 border border-pink-100">
                  <FlaskConical className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-pink-50 text-[#732845] px-3 py-1 text-[10px] font-bold uppercase tracking-wider mb-3 inline-block">
                  Bespoke Compounding
                </span>
                <h3 className="text-lg font-serif font-bold text-[#211a1c] mb-2">
                  Cellular Formulations Fresh from Lab
                </h3>
                <p className="text-xs text-secondary-text leading-relaxed mb-6 font-normal">
                  Zero occlusives or pore-clogging waxes. Each elixir is precision-formulated in cold batches with pharmaceutical Swiss peptides.
                </p>
              </div>

              <Link
                href="/our-science"
                className="inline-flex items-center text-xs font-bold text-[#732845] hover:underline underline-offset-4"
              >
                <span>Explore Dermal Science</span>
              </Link>
            </div>

            {/* Card 2 */}
            <div className="rounded-3xl bg-white border border-pink-100 p-6 sm:p-8 shadow-xs flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-[#732845] mb-5 border border-pink-100">
                  <Camera className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-pink-50 text-[#732845] px-3 py-1 text-[10px] font-bold uppercase tracking-wider mb-3 inline-block">
                  Clinical Precision
                </span>
                <h3 className="text-lg font-serif font-bold text-[#211a1c] mb-2">
                  Sensory Biophotonic Testing
                </h3>
                <p className="text-xs text-secondary-text leading-relaxed mb-6 font-normal">
                  Multi-spectral diagnostic cameras map deep dermal hydration, lipid barrier integrity, and UV resistance in real time.
                </p>
              </div>

              <Link
                href="/our-science#comparison"
                className="inline-flex items-center text-xs font-bold text-[#732845] hover:underline underline-offset-4"
              >
                <span>View Diagnostic Protocol</span>
              </Link>
            </div>

            {/* Card 3 */}
            <div className="rounded-3xl bg-white border border-pink-100 p-6 sm:p-8 shadow-xs flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-[#732845] mb-5 border border-pink-100">
                  <Gift className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-pink-50 text-[#732845] px-3 py-1 text-[10px] font-bold uppercase tracking-wider mb-3 inline-block">
                  Haute Hospitality
                </span>
                <h3 className="text-lg font-serif font-bold text-[#211a1c] mb-2">
                  Complimentary Atelier Gifting
                </h3>
                <p className="text-xs text-secondary-text leading-relaxed mb-6 font-normal">
                  Conclude your ritual with a personalized deluxe 15ml sample duo and our signature chilled organic herbal rose infusion.
                </p>
              </div>

              <Link
                href="/offers"
                className="inline-flex items-center text-xs font-bold text-[#732845] hover:underline underline-offset-4"
              >
                <span>Discover Concierge Gifts</span>
              </Link>
            </div>
          </div>
        </section>


        {/* 4. SECTION: GUEST EXPERIENCES (NOTES FROM TREATMENT SUITES) */}
        <section className="mb-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10 pb-4 border-b border-pink-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#732845] block mb-1">
                GUEST EXPERIENCES
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#211a1c]">
                Notes from the Treatment Suites
              </h2>
            </div>
            <p className="text-xs text-secondary-text sm:text-right max-w-xs font-medium">
              Over 1,200 Five-star Dermal Visits across Geneva, New York, and Paris.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Review 1 */}
            <div className="rounded-3xl bg-white border border-pink-100 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex text-amber-500 text-sm mb-3">
                  {"★".repeat(5)}
                </div>
                <p className="text-xs text-secondary-text leading-relaxed italic font-serif mb-6">
                  &quot;The Glaze Signature Facial at SoHo is simply unmatched. My skin retained an ethereal luminous glass bounce for a full two weeks.&quot;
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-pink-50">
                <div className="h-9 w-9 rounded-full bg-pink-100 text-[#732845] flex items-center justify-center text-xs font-bold">
                  AL
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#211a1c]">Aurelia Laurent</h4>
                  <span className="text-[10px] text-secondary-text">SoHo Flagship Visitor</span>
                </div>
              </div>
            </div>

            {/* Review 2 */}
            <div className="rounded-3xl bg-white border border-pink-100 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex text-amber-500 text-sm mb-3">
                  {"★".repeat(5)}
                </div>
                <p className="text-xs text-secondary-text leading-relaxed italic font-serif mb-6">
                  &quot;Dr. Weber in Geneva analyzed my skin barrier with their biophotonic scanner. The bespoke peptide serum formulated on-site cleared my chronic dryness.&quot;
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-pink-50">
                <div className="h-9 w-9 rounded-full bg-pink-100 text-[#732845] flex items-center justify-center text-xs font-bold">
                  MV
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#211a1c]">Mathieu Garnier</h4>
                  <span className="text-[10px] text-secondary-text">Geneva Central Spa</span>
                </div>
              </div>
            </div>

            {/* Review 3 */}
            <div className="rounded-3xl bg-white border border-pink-100 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex text-amber-500 text-sm mb-3">
                  {"★".repeat(5)}
                </div>
                <p className="text-xs text-secondary-text leading-relaxed italic font-serif mb-6">
                  &quot;Le Marais atelier feels like a sanctuary. The Gua Sha sculpted my jawline immediately, and the iced herbal rose tea at reception was divine.&quot;
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-pink-50">
                <div className="h-9 w-9 rounded-full bg-pink-100 text-[#732845] flex items-center justify-center text-xs font-bold">
                  SC
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#211a1c]">Sophie Clemence</h4>
                  <span className="text-[10px] text-secondary-text">Paris Le Marais Atelier</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>


      {/* 5. SUCCESS RESERVATION MODAL */}
      {isSuccessModalOpen && (
        <div 
          onClick={() => setIsSuccessModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-pink-100 text-center relative"
          >
            <button
              onClick={() => setIsSuccessModalOpen(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-pink-50 text-[#732845] hover:bg-pink-100 flex items-center justify-center transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 mb-4">
              <CheckCircle2 className="h-7 w-7" />
            </div>

            <span className="text-[10px] font-bold uppercase tracking-widest text-[#732845] block mb-1">
              RESERVATION CONFIRMED
            </span>
            <h3 className="text-2xl font-serif font-bold text-[#211a1c] mb-2">
              Atelier Ritual Booked
            </h3>
            <p className="text-xs text-secondary-text leading-relaxed mb-6">
              A bespoke appointment confirmation dossier and preparation guide have been sent to your email.
            </p>

            <div className="rounded-2xl bg-[#FFF5F8] border border-pink-100 p-4 text-left space-y-2 text-xs mb-6">
              <div className="flex justify-between">
                <span className="text-secondary-text">Atelier:</span>
                <strong className="text-[#211a1c]">{selectedAtelier.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-text">Protocol:</span>
                <strong className="text-[#211a1c]">{selectedProtocol.name} ({selectedProtocol.price})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-text">Esthetician:</span>
                <strong className="text-[#211a1c]">{selectedEsthetician.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-text">Time Slot:</span>
                <strong className="text-[#211a1c]">Tomorrow at {selectedTime}</strong>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setIsSuccessModalOpen(false);
                  toast.success("Đã lưu lịch hẹn vào thiết bị của bạn!");
                }}
                className="flex-1 rounded-full bg-[#732845] text-white py-3 text-xs font-bold hover:bg-[#591e35] transition shadow-xs"
              >
                Add to Calendar
              </button>
              <button
                onClick={() => setIsSuccessModalOpen(false)}
                className="flex-1 rounded-full border border-pink-200 bg-white py-3 text-xs font-bold text-[#732845] hover:bg-pink-50 transition shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}