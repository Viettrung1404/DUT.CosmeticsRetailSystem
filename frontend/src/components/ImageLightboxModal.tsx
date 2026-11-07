"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

export interface LightboxImageItem {
  url: string;
  title?: string;
  caption?: string;
  badge?: string;
  location?: string;
}

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: LightboxImageItem[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export default function ImageLightboxModal({
  isOpen,
  onClose,
  images,
  currentIndex,
  onNavigate,
}: ImageLightboxModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") {
        onNavigate((currentIndex - 1 + images.length) % images.length);
      }
      if (e.key === "ArrowRight") {
        onNavigate((currentIndex + 1) % images.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Khóa scroll trang khi mở modal
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, currentIndex, images.length, onClose, onNavigate]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200 select-none"
    >
      {/* Header Bar */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="flex items-center justify-between z-10 w-full max-w-6xl mx-auto text-white pb-2"
      >
        <div className="flex items-center gap-3">
          <span className="h-8 px-3 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-xs font-mono font-bold text-pink-200 border border-white/20">
            {currentIndex + 1} / {images.length}
          </span>
          <div>
            <h3 className="text-sm sm:text-base font-bold font-serif">{currentImage.title || "Xem ảnh chi tiết"}</h3>
            {currentImage.location && (
              <p className="text-xs text-white/70">{currentImage.location}</p>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition active:scale-95 border border-white/20 cursor-pointer"
          title="Đóng (Esc)"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main Image Container with Navigation Arrows */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="relative flex-1 flex items-center justify-center my-2 max-w-6xl mx-auto w-full"
      >
        {/* Left Arrow */}
        {images.length > 1 && (
          <button
            onClick={() => onNavigate((currentIndex - 1 + images.length) % images.length)}
            className="absolute left-2 sm:left-4 z-20 h-12 w-12 rounded-full bg-black/60 hover:bg-white hover:text-black text-white flex items-center justify-center transition shadow-2xl active:scale-95 border border-white/20 cursor-pointer"
            title="Ảnh trước (Arrow Left)"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Uncropped High-Res Image */}
        <div className="relative w-full h-[65vh] sm:h-[75vh]">
          <Image
            src={currentImage.url}
            alt={currentImage.title || "Hình ảnh đầy đủ"}
            fill
            className="object-contain rounded-2xl drop-shadow-2xl"
            priority
          />
        </div>

        {/* Right Arrow */}
        {images.length > 1 && (
          <button
            onClick={() => onNavigate((currentIndex + 1) % images.length)}
            className="absolute right-2 sm:right-4 z-20 h-12 w-12 rounded-full bg-black/60 hover:bg-white hover:text-black text-white flex items-center justify-center transition shadow-2xl active:scale-95 border border-white/20 cursor-pointer"
            title="Ảnh tiếp theo (Arrow Right)"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Footer Info & Thumbnails Bar */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl mx-auto space-y-3"
      >
        {/* Caption & Badges */}
        {(currentImage.caption || currentImage.badge) && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            {currentImage.caption && (
              <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-normal">
                {currentImage.caption}
              </p>
            )}
            {currentImage.badge && (
              <span className="px-3 py-1 bg-pink-500/30 text-pink-200 border border-pink-400/50 text-xs font-bold rounded-full shrink-0">
                {currentImage.badge}
              </span>
            )}
          </div>
        )}

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
            {images.map((item, idx) => (
              <button
                key={idx}
                onClick={() => onNavigate(idx)}
                className={`relative h-12 w-16 sm:h-14 sm:w-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                  currentIndex === idx
                    ? "border-pink-400 scale-105 shadow-md"
                    : "border-white/30 opacity-60 hover:opacity-100"
                }`}
              >
                <Image src={item.url} alt={`Thumbnail ${idx + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
