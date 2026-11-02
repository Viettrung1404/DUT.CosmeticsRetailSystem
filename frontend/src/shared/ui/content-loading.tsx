import { cn } from "@/shared/lib/utils";

type LoadingVariant = "list" | "profile" | "cards" | "checkout" | "cart" | "detail";

function Placeholder({ className }: { className?: string }) {
  return <div className={cn("loading-placeholder", className)} />;
}

function LoadingRows({ count = 3 }: { count?: number }) {
  return (
    <div className="loading-rows">
      {Array.from({ length: count }, (_, index) => (
        <div className="loading-row" key={index}>
          <Placeholder className="loading-thumbnail" />
          <div className="loading-copy">
            <Placeholder className="loading-line-long" />
            <Placeholder className="loading-line-short" />
            <Placeholder className="loading-line-medium" />
          </div>
          <Placeholder className="loading-tag" />
        </div>
      ))}
    </div>
  );
}

function LoadingFields() {
  return (
    <div className="loading-fields">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="loading-copy" key={index}>
          <Placeholder className="loading-line-short" />
          <Placeholder className="loading-input" />
        </div>
      ))}
    </div>
  );
}

/** Shared by route fallbacks and client queries so both stages keep the same layout. */
export function ContentLoading({
  variant = "list",
  label = "Đang tải nội dung…",
  heading = true,
  compact = false,
}: {
  variant?: LoadingVariant;
  label?: string;
  heading?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn("content-loading", `content-loading-${variant}`, compact && "is-compact")}
      role="status"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="loading-layout">
        {heading && (
          <div className="loading-heading">
            <Placeholder className="loading-title" />
            <Placeholder className="loading-subtitle" />
          </div>
        )}
        {variant === "checkout" || variant === "cart" ? (
          <>
            <div className="loading-steps">
              {[0, 1, 2].map((step) => (
                <div key={step}>
                  <Placeholder className="loading-step-dot" />
                  <Placeholder className="loading-line-medium" />
                </div>
              ))}
            </div>
            <div className="loading-checkout-grid">
              <div className="loading-stack">
                <div className="loading-surface">
                  <Placeholder className="loading-section-title" />
                  {variant === "cart" ? <LoadingRows /> : <LoadingFields />}
                </div>
                {variant === "checkout" && (
                  <div className="loading-surface">
                    <Placeholder className="loading-section-title" />
                    <Placeholder className="loading-payment-option" />
                    <Placeholder className="loading-payment-option" />
                  </div>
                )}
              </div>
              <div className="loading-surface">
                <Placeholder className="loading-section-title" />
                <LoadingRows count={2} />
                <div className="loading-summary">
                  <Placeholder />
                  <Placeholder />
                  <Placeholder className="loading-line-long" />
                </div>
                <Placeholder className="loading-button" />
              </div>
            </div>
          </>
        ) : variant === "profile" ? (
          <div className="loading-surface">
            <div className="loading-row">
              <Placeholder className="loading-avatar" />
              <div className="loading-copy">
                <Placeholder className="loading-line-medium" />
                <Placeholder className="loading-line-short" />
              </div>
            </div>
            <LoadingFields />
            <Placeholder className="loading-button" />
          </div>
        ) : variant === "cards" ? (
          <div className="loading-card-grid">
            {[0, 1, 2, 3].map((card) => (
              <div className="loading-surface" key={card}>
                <Placeholder className="loading-card-image" />
                <Placeholder className="loading-line-long" />
                <Placeholder className="loading-line-medium" />
                <Placeholder className="loading-line-short" />
              </div>
            ))}
          </div>
        ) : (
          <div className="loading-surface">
            {variant === "detail" && (
              <div className="loading-summary">
                <Placeholder className="loading-section-title" />
                <Placeholder className="loading-payment-option" />
              </div>
            )}
            <LoadingRows count={compact ? 2 : 3} />
          </div>
        )}
      </div>
    </div>
  );
}
