"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiErrorMessage } from "@/shared/api/errors";
import { useHydrated } from "@/shared/lib/use-hydrated";
import { wishlistIdsQuery } from "./commerce-state";
import { queueFavorite } from "./favorite-commands";

export function FavoriteButton({
  productId,
  slug,
  name,
  className = "",
  showText = false,
  label,
}: {
  productId: string;
  slug: string;
  name: string;
  className?: string;
  showText?: boolean;
  label?: string;
}) {
  const client = useQueryClient();
  const hydrated = useHydrated();
  const [error, setError] = useState("");
  const { data } = useQuery(wishlistIdsQuery());
  const selected = hydrated && (data?.ids.includes(productId) ?? false);

  function toggle() {
    setError("");
    const current = client.getQueryData<{ ids: string[] }>(["wishlist-ids"]);
    const isSelected = current?.ids.includes(productId) ?? selected;
    queueFavorite(client, productId, slug, !isSelected, (cause) =>
      setError(apiErrorMessage(cause)),
    );
  }

  return (
    <span className={`favorite-control ${className}`}>
      <button
        type="button"
        className={`favorite-button ${showText ? "favorite-button-with-text" : ""}`}
        data-product-id={productId}
        aria-label={`${selected ? "Bỏ yêu thích" : "Yêu thích"} ${name}`}
        aria-pressed={selected}
        title={selected ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
        onClick={toggle}
      >
        <Heart
          size={18}
          fill={selected ? "#e63946" : "none"}
          stroke={selected ? "#e63946" : "currentColor"}
        />
        {showText && <span>{label || (selected ? "Đã yêu thích" : "Thêm vào yêu thích")}</span>}
      </button>
      {error && (
        <span className="favorite-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
