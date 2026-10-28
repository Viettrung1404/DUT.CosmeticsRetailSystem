"use client";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { CatalogImage } from "./components";

type GalleryImage = { imageUrl: string; altText?: string | null };
export function ProductGallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const current = images[selected];
  const move = (direction: number) =>
    setSelected((index) => (index + direction + images.length) % images.length);
  function close() {
    dialog.current?.close();
    trigger.current?.focus();
  }
  return (
    <div className="pdp-gallery">
      <button
        ref={trigger}
        type="button"
        className="pdp-cover"
        onClick={() => dialog.current?.showModal()}
        aria-label={`Phóng to ảnh ${selected + 1} của ${name}`}
      >
        <CatalogImage src={current?.imageUrl} alt={current?.altText || name} />
        <span className="pdp-zoom">
          <Expand size={16} /> Phóng to
        </span>
      </button>
      {images.length > 1 && (
        <div className="pdp-thumbnails" role="group" aria-label="Chọn ảnh sản phẩm">
          {images.map((image, index) => (
            <button
              type="button"
              key={`${image.imageUrl}-${index}`}
              aria-label={`Xem ảnh ${index + 1}`}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
            >
              <CatalogImage src={image.imageUrl} alt={image.altText || `${name} ${index + 1}`} />
            </button>
          ))}
        </div>
      )}
      <dialog
        ref={dialog}
        className="pdp-lightbox"
        aria-label={`Ảnh sản phẩm ${name}`}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") move(-1);
          if (event.key === "ArrowRight") move(1);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="pdp-lightbox-inner">
          <button
            type="button"
            className="pdp-lightbox-close"
            aria-label="Đóng ảnh"
            onClick={close}
          >
            <X />
          </button>
          <CatalogImage src={current?.imageUrl} alt={current?.altText || name} />
          {images.length > 1 && (
            <>
              <button
                type="button"
                className="pdp-lightbox-prev"
                aria-label="Ảnh trước"
                onClick={() => move(-1)}
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                className="pdp-lightbox-next"
                aria-label="Ảnh sau"
                onClick={() => move(1)}
              >
                <ChevronRight />
              </button>
              <span className="pdp-lightbox-count">
                {selected + 1} / {images.length}
              </span>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}
