"use client";
import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Heart,
  Maximize2,
  Minimize2,
  Play,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { CatalogImage } from "./components";
import { FavoriteButton } from "./favorite-button";

type GalleryImage = { imageUrl: string; altText?: string | null };

export function ProductGallery({
  images,
  name,
  productId,
  slug,
  videoUrl,
}: {
  images: GalleryImage[];
  name: string;
  productId?: string;
  slug?: string;
  videoUrl?: string | null;
}) {
  const [selected, setSelected] = useState(0);
  const [isVideoActive, setIsVideoActive] = useState(!!videoUrl);
  const [isMuted, setIsMuted] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const current = images[selected];

  const togglePlay = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    if (iframeRef.current?.contentWindow) {
      const cmd = next ? "playVideo" : "pauseVideo";
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: cmd, args: [] }),
        "*",
      );
    }
    if (videoRef.current) {
      if (next) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (iframeRef.current?.contentWindow) {
      const cmd = next ? "mute" : "unMute";
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: cmd, args: [] }),
        "*",
      );
    }
    if (videoRef.current) {
      videoRef.current.muted = next;
    }
  };

  // Listen to variant selection from purchase box to switch main image (Shopee style)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ imageUrl?: string; variantId?: string }>).detail;
      if (!detail?.imageUrl) return;
      const cleanPath = (url?: string | null) =>
        (url ?? "").split("?")[0]?.split("/").pop() ?? "";
      const targetBase = cleanPath(detail.imageUrl);
      const idx = images.findIndex(
        (img) =>
          img.imageUrl === detail.imageUrl ||
          (targetBase && cleanPath(img.imageUrl) === targetBase),
      );
      if (idx !== -1) {
        setSelected(idx);
        setIsVideoActive(false);
        // Scroll thumbnail into view
        if (thumbnailsRef.current) {
          const children = thumbnailsRef.current.children;
          const targetChild = videoUrl ? children[idx + 1] : children[idx];
          if (targetChild && "scrollIntoView" in targetChild) {
            (targetChild as HTMLElement).scrollIntoView({
              behavior: "smooth",
              inline: "nearest",
              block: "nearest",
            });
          }
        }
      }
    };
    window.addEventListener("glowup:select-variant-image", handler);
    return () => window.removeEventListener("glowup:select-variant-image", handler);
  }, [images, videoUrl]);

  const move = (direction: number) => {
    setIsVideoActive(false);
    setSelected((index) => {
      const next = (index + direction + images.length) % images.length;
      return next;
    });
  };

  const scrollThumbnails = (direction: number) => {
    if (thumbnailsRef.current) {
      thumbnailsRef.current.scrollBy({
        left: direction * 160,
        behavior: "smooth",
      });
    }
  };

  function close() {
    setLightboxZoom(1);
    dialog.current?.close();
    trigger.current?.focus();
  }

  return (
    <div className="pdp-gallery">
      {/* Cover Image / Video */}
      <div className="pdp-cover-container">
        {isVideoActive && videoUrl ? (
          <div className="pdp-cover pdp-cover-video-wrapper">
            {/* Ambient luxury backdrop (soft glow matching the product image) */}
            <div className="pdp-video-ambient-backdrop" aria-hidden="true">
              <CatalogImage src={current?.imageUrl} alt="" />
            </div>

            {/* Video Frame */}
            <div
              className={`pdp-video-frame ${isZoomed ? "is-zoomed" : ""}`}
              onClick={togglePlay}
              title={isPlaying ? "Bấm để tạm dừng" : "Bấm để tiếp tục phát"}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  togglePlay();
                }
              }}
            >
              {videoUrl.includes("youtube.com") ? (
                <div className="pdp-youtube-box">
                  <iframe
                    ref={iframeRef}
                    src={(() => {
                      const base = videoUrl.split("?")[0];
                      const query = new URLSearchParams({
                        autoplay: "1",
                        mute: isMuted ? "1" : "0",
                        controls: "0",
                        modestbranding: "1",
                        rel: "0",
                        iv_load_policy: "3",
                        playsinline: "1",
                        disablekb: "1",
                        fs: "0",
                        enablejsapi: "1",
                      }).toString();
                      return `${base}?${query}`;
                    })()}
                    title={`Video ${name}`}
                    className="pdp-youtube-iframe"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              ) : (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls={false}
                  autoPlay
                  muted={isMuted}
                  loop
                  playsInline
                  className="pdp-native-video"
                />
              )}
              {!isPlaying && (
                <div className="pdp-video-play-center" aria-hidden="true">
                  <span>
                    <Play size={24} fill="currentColor" />
                  </span>
                </div>
              )}
            </div>

            {/* Top Right: Close video & return to image */}
            <button
              type="button"
              className="pdp-video-close-btn"
              onClick={() => setIsVideoActive(false)}
              title="Xem ảnh sản phẩm"
            >
              <X size={14} /> Xem ảnh
            </button>

            {/* Bottom Controls Bar (Custom, clean, branded) */}
            <div className="pdp-video-controls-bar">
              <button
                type="button"
                className="pdp-video-control-pill"
                onClick={toggleMute}
                title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
              >
                {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                <span>{isMuted ? "Bật tiếng" : "Tắt tiếng"}</span>
              </button>

              <button
                type="button"
                className="pdp-video-control-pill"
                onClick={() => setIsZoomed(!isZoomed)}
                title={isZoomed ? "Xem khung chuẩn 16:9" : "Xem tràn viền 1:1"}
              >
                {isZoomed ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                <span>{isZoomed ? "Thu nhỏ" : "Tràn viền"}</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            ref={trigger}
            type="button"
            className="pdp-cover"
            onClick={() => {
              setLightboxZoom(1);
              dialog.current?.showModal();
            }}
            aria-label={`Phóng to ảnh ${selected + 1} của ${name}`}
          >
            <CatalogImage src={current?.imageUrl} alt={current?.altText || name} />
            <span className="pdp-zoom">
              <Expand size={16} /> Phóng to
            </span>
            {videoUrl && (
              <button
                type="button"
                className="pdp-cover-play-badge"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsVideoActive(true);
                }}
                aria-label="Xem video sản phẩm"
              >
                <Play size={13} fill="currentColor" />
                <span>Video</span>
              </button>
            )}
          </button>
        )}
      </div>

      {/* Horizontal Thumbnail Strip below Cover */}
      {(images.length > 1 || !!videoUrl) && (
        <div className="pdp-thumbnails-wrapper">
          <button
            type="button"
            className="pdp-thumb-nav-btn pdp-thumb-prev"
            aria-label="Ảnh trước"
            onClick={() => {
              scrollThumbnails(-1);
              move(-1);
            }}
          >
            <ChevronLeft size={18} />
          </button>

          <div
            ref={thumbnailsRef}
            className="pdp-thumbnails"
            role="group"
            aria-label="Chọn ảnh sản phẩm"
          >
            {/* Video Thumbnail Button if available */}
            {videoUrl && (
              <button
                type="button"
                className={`pdp-thumb-btn ${isVideoActive ? "is-selected" : ""}`}
                aria-label="Xem video sản phẩm"
                aria-pressed={isVideoActive}
                onClick={() => setIsVideoActive(true)}
              >
                <div className="pdp-thumb-video-preview">
                  <CatalogImage src={images[0]?.imageUrl} alt="Video thumbnail" />
                  <span className="pdp-thumb-video-overlay">
                    <span className="pdp-thumb-play-icon">▶</span>
                    <span>Video</span>
                  </span>
                </div>
              </button>
            )}

            {images.map((image, index) => (
              <button
                type="button"
                key={`${image.imageUrl}-${index}`}
                className={`pdp-thumb-btn ${!isVideoActive && selected === index ? "is-selected" : ""}`}
                aria-label={`Xem ảnh ${index + 1}`}
                aria-pressed={!isVideoActive && selected === index}
                onClick={() => {
                  setIsVideoActive(false);
                  setSelected(index);
                }}
                onMouseEnter={() => {
                  setIsVideoActive(false);
                  setSelected(index);
                }}
              >
                <CatalogImage
                  src={image.imageUrl}
                  alt={image.altText || `${name} ${index + 1}`}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            className="pdp-thumb-nav-btn pdp-thumb-next"
            aria-label="Ảnh sau"
            onClick={() => {
              scrollThumbnails(1);
              move(1);
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Share and Favorite Footer */}
      <div className="pdp-gallery-footer">
        <div className="pdp-share-block">
          <span className="pdp-share-label">Chia sẻ:</span>
          <div className="pdp-share-icons">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (typeof window !== "undefined") {
                  window.open(
                    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
                    "_blank",
                  );
                }
              }}
              className="pdp-social-btn pdp-social-fb"
              title="Chia sẻ qua Facebook"
              aria-label="Chia sẻ qua Facebook"
            >
              <svg viewBox="0 0 24 24" width="22" height="22">
                <circle cx="12" cy="12" r="11" fill="#1877f2" />
                <path
                  d="M14.5 12h-2v7h-3v-7h-1.5v-2.5h1.5v-1.7c0-2 1.2-3.1 3-3.1.9 0 1.6.1 1.8.1v2.1h-1.2c-1 0-1.2.5-1.2 1.2v1.4h2.4l-.4 2.5z"
                  fill="#fff"
                />
              </svg>
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (typeof window !== "undefined") {
                  window.open(
                    `https://www.facebook.com/dialog/send?link=${encodeURIComponent(window.location.href)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(window.location.href)}`,
                    "_blank",
                  );
                }
              }}
              className="pdp-social-btn pdp-social-messenger"
              title="Chia sẻ qua Messenger"
              aria-label="Chia sẻ qua Messenger"
            >
              <svg viewBox="0 0 24 24" width="22" height="22">
                <defs>
                  <linearGradient id="pdpMsgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00c6ff" />
                    <stop offset="100%" stopColor="#0072ff" />
                  </linearGradient>
                </defs>
                <circle cx="12" cy="12" r="11" fill="url(#pdpMsgGrad)" />
                <path
                  d="M12 5.5c-3.9 0-7 2.8-7 6.3 0 2 1 3.8 2.6 4.9v2.3l2.2-1.2c.7.2 1.4.3 2.2.3 3.9 0 7-2.8 7-6.3s-3.1-6.3-7-6.3zm.7 8.5l-1.8-1.9-3.5 1.9 3.8-4.1 1.9 1.9 3.4-1.9-3.8 4.1z"
                  fill="#fff"
                />
              </svg>
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (typeof window !== "undefined") {
                  window.open(
                    `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(window.location.href)}`,
                    "_blank",
                  );
                }
              }}
              className="pdp-social-btn pdp-social-pinterest"
              title="Ghim trên Pinterest"
              aria-label="Ghim trên Pinterest"
            >
              <svg viewBox="0 0 24 24" width="22" height="22">
                <circle cx="12" cy="12" r="11" fill="#e60023" />
                <path
                  d="M12 6.5c-3 0-5.5 2.2-5.5 5.2 0 1.9 1.1 3.5 2.7 4.1.2.1.4 0 .5-.2.1-.2.2-.7.2-.9 0-.2-.1-.3-.2-.5-.5-.6-.8-1.5-.8-2.5 0-2.4 1.8-4.3 4.5-4.3 2.3 0 3.7 1.4 3.7 3.3 0 2.5-1.1 4.6-2.7 4.6-.9 0-1.6-.7-1.4-1.6.2-1 .7-2.2.7-2.9 0-.7-.4-1.2-1.1-1.2-.9 0-1.6.9-1.6 2.1 0 .8.3 1.3.3 1.3l-1.1 4.7c-.3 1.4-.1 3.1 0 3.3 0 .1.1.2.2.1.1-.1.3-.4.4-.8.1-.5.7-2.7.9-3.4.1-.4.4-.6.7-.4.9.4 2.1.7 3.2.7 4.2 0 7.1-3.6 7.1-7.8 0-4-3.4-6.8-7.5-6.8z"
                  fill="#fff"
                />
              </svg>
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (typeof window !== "undefined") {
                  window.open(
                    `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`,
                    "_blank",
                  );
                }
              }}
              className="pdp-social-btn pdp-social-x"
              title="Chia sẻ lên X"
              aria-label="Chia sẻ lên X"
            >
              <svg viewBox="0 0 24 24" width="22" height="22">
                <circle cx="12" cy="12" r="11" fill="#000000" />
                <path
                  d="M15.5 8h1.6l-3.5 4 4.1 5.5h-3.2l-2.5-3.3-2.9 3.3H7.5l3.8-4.3L7.3 8h3.3l2.3 3 2.6-3zm-.6 8.5h.9L10.3 9h-.9l5.5 7.5z"
                  fill="#fff"
                />
              </svg>
            </a>
          </div>
        </div>

        {productId && slug ? (
          <FavoriteButton
            productId={productId}
            slug={slug}
            name={name}
            showText={true}
            className="pdp-favorite-count-btn"
          />
        ) : (
          <div className="pdp-gallery-liked-static">
            <Heart size={18} fill="#e63946" stroke="#e63946" />
            <span>Đã thích (1,2k)</span>
          </div>
        )}
      </div>

      {/* Lightbox Dialog */}
      <dialog
        ref={dialog}
        className="pdp-lightbox"
        aria-label={`Ảnh sản phẩm ${name}`}
        onClose={() => setLightboxZoom(1)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            setLightboxZoom(1);
            move(-1);
          }
          if (event.key === "ArrowRight") {
            setLightboxZoom(1);
            move(1);
          }
          if (event.key === "+" || event.key === "=") {
            setLightboxZoom((z) => Math.min(2.5, +(z + 0.5).toFixed(1)));
          }
          if (event.key === "-") {
            setLightboxZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)));
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="pdp-lightbox-container">
          {/* Top Floating Luxury Header */}
          <div className="pdp-lightbox-header">
            <div className="pdp-lightbox-info">
              <span className="pdp-lightbox-title" title={name}>
                {name}
              </span>
              <span className="pdp-lightbox-counter-badge">
                {selected + 1} / {images.length}
              </span>
            </div>

            <div className="pdp-lightbox-actions">
              <button
                type="button"
                className={`pdp-lightbox-btn ${lightboxZoom <= 1 ? "is-disabled" : ""}`}
                title="Thu nhỏ (-)"
                disabled={lightboxZoom <= 1}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)));
                }}
              >
                <ZoomOut size={18} />
              </button>

              <button
                type="button"
                className="pdp-lightbox-scale-indicator"
                title="Nhấn để đưa về kích thước gốc"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxZoom(1);
                }}
              >
                {Math.round(lightboxZoom * 100)}%
              </button>

              <button
                type="button"
                className={`pdp-lightbox-btn ${lightboxZoom >= 2.5 ? "is-disabled" : ""}`}
                title="Phóng to (+)"
                disabled={lightboxZoom >= 2.5}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxZoom((z) => Math.min(2.5, +(z + 0.5).toFixed(1)));
                }}
              >
                <ZoomIn size={18} />
              </button>

              <div className="pdp-lightbox-divider" />

              <button
                type="button"
                className="pdp-lightbox-close-btn"
                aria-label="Đóng ảnh"
                title="Đóng (Esc)"
                onClick={close}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Central Main Viewport Stage */}
          <div
            className="pdp-lightbox-stage"
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            {images.length > 1 && (
              <button
                type="button"
                className="pdp-lightbox-nav-btn pdp-lightbox-nav-prev"
                aria-label="Ảnh trước"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxZoom(1);
                  move(-1);
                }}
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <div
              className={`pdp-lightbox-image-wrap ${lightboxZoom > 1 ? "is-zoomed" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setLightboxZoom((z) => (z > 1 ? 1 : 1.75));
              }}
              title={lightboxZoom > 1 ? "Nhấn để thu nhỏ lại (100%)" : "Nhấn để phóng to chi tiết"}
            >
              <div
                className="pdp-lightbox-image-scaler"
                style={{
                  transform: `scale(${lightboxZoom})`,
                }}
              >
                <CatalogImage
                  src={current?.imageUrl}
                  alt={current?.altText || name}
                  priority={true}
                />
              </div>
            </div>

            {images.length > 1 && (
              <button
                type="button"
                className="pdp-lightbox-nav-btn pdp-lightbox-nav-next"
                aria-label="Ảnh sau"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxZoom(1);
                  move(1);
                }}
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          {/* Bottom Thumbnail Carousel Strip */}
          {images.length > 1 && (
            <div className="pdp-lightbox-footer">
              <div className="pdp-lightbox-thumbs-container">
                {images.map((img, idx) => (
                  <button
                    key={`lb-thumb-${img.imageUrl}-${idx}`}
                    type="button"
                    className={`pdp-lightbox-thumb-btn ${idx === selected ? "is-active" : ""}`}
                    aria-label={`Xem ảnh ${idx + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxZoom(1);
                      setSelected(idx);
                      setIsVideoActive(false);
                    }}
                  >
                    <CatalogImage src={img.imageUrl} alt="" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}
