interface Capability {
  contract: "source-present" | "blocked" | "omitted";
  integrated: boolean;
  blockers: readonly string[];
  phase: string;
}

// Contract availability is not runtime readiness; deployment gates are tracked separately.
export const capabilities = {
  auth: { contract: "source-present", blockers: ["ENV-01"], phase: "FE-01" },
  oauth: { contract: "source-present", blockers: ["ENV-01", "provider-smoke"], phase: "FE-01" },
  catalog: { contract: "blocked", blockers: ["O01", "O02"], phase: "FE-02" },
  cart: { contract: "source-present", blockers: ["O02"], phase: "FE-03" },
  cod: { contract: "source-present", blockers: ["O02"], phase: "FE-03" },
  vnpay: { contract: "blocked", blockers: ["G01-sandbox", "payment-openapi"], phase: "FE-03" },
  account: { contract: "source-present", blockers: ["O02"], phase: "FE-04" },
  returns: { contract: "source-present", blockers: ["O02", "ENV-01"], phase: "FE-05" },
  loyalty: { contract: "source-present", blockers: ["O02", "reward-policy"], phase: "FE-05" },
  promotions: { contract: "source-present", blockers: ["staging-validation"], phase: "FE-06" },
  brands: { contract: "source-present", blockers: ["approved-brand-content"], phase: "FE-06" },
  stores: { contract: "source-present", blockers: ["approved-store-content"], phase: "FE-06" },
  blog: { contract: "source-present", blockers: ["approved-content"], phase: "FE-06" },
  cms: { contract: "source-present", blockers: ["approved-content"], phase: "FE-06" },
  newsletter: { contract: "omitted", blockers: ["G10"], phase: "out-of-scope" },
  chat: { contract: "omitted", blockers: ["G10"], phase: "out-of-scope" },
  booking: { contract: "omitted", blockers: ["G02"], phase: "out-of-scope" },
  pickup: { contract: "omitted", blockers: ["G02"], phase: "out-of-scope" },
  twoFactor: { contract: "omitted", blockers: ["G04"], phase: "out-of-scope" },
  beautyProfile: { contract: "omitted", blockers: ["G04"], phase: "out-of-scope" },
} as const satisfies Record<string, Omit<Capability, "integrated">>;

export const integrationStatus: Readonly<Record<keyof typeof capabilities, boolean>> = {
  auth: true,
  oauth: true,
  catalog: true,
  cart: true,
  cod: true,
  vnpay: true,
  account: true,
  returns: true,
  loyalty: true,
  promotions: true,
  brands: true,
  stores: false,
  blog: true,
  cms: true,
  newsletter: false,
  chat: false,
  booking: false,
  pickup: false,
  twoFactor: false,
  beautyProfile: false,
};
