"use client";

import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";

function FacebookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function ArticleActions({ title: _title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  const handleFacebookShare = () => {
    if (typeof window !== "undefined") {
      const url = encodeURIComponent(window.location.href);
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  };

  return (
    <div className="article-share-widget">
      <div className="share-widget-title">
        <Share2 size={16} />
        <span>Chia sẻ bài viết</span>
      </div>
      <div className="share-widget-buttons">
        <button
          type="button"
          className="share-btn share-btn-fb"
          onClick={handleFacebookShare}
          title="Chia sẻ lên Facebook"
        >
          <FacebookIcon size={15} />
          <span>Facebook</span>
        </button>
        <button
          type="button"
          className={`share-btn share-btn-copy ${copied ? "copied" : ""}`}
          onClick={handleCopy}
          title="Sao chép liên kết"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          <span>{copied ? "Đã chép link!" : "Sao chép link"}</span>
        </button>
      </div>
    </div>
  );
}
