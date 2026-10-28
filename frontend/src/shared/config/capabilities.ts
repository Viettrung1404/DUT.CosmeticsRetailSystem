interface Capability {
  contract: "source-present" | "blocked" | "omitted";
  integrated: false;
  blockers: readonly string[];
  phase: string;
}

// Contract availability is not runtime readiness. No feature is integrated in FE-00.
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
  promotions: { contract: "blocked", blockers: ["O03", "G07"], phase: "FE-06" },
  brands: { contract: "blocked", blockers: ["G03"], phase: "FE-06" },
  stores: { contract: "blocked", blockers: ["G02"], phase: "FE-06" },
  blog: { contract: "blocked", blockers: ["O05"], phase: "FE-06" },
  cms: { contract: "source-present", blockers: ["approved-content"], phase: "FE-06" },
  newsletter: { contract: "omitted", blockers: ["G10"], phase: "out-of-scope" },
  chat: { contract: "omitted", blockers: ["G10"], phase: "out-of-scope" },
  booking: { contract: "omitted", blockers: ["G02"], phase: "out-of-scope" },
  pickup: { contract: "omitted", blockers: ["G02"], phase: "out-of-scope" },
  twoFactor: { contract: "omitted", blockers: ["G04"], phase: "out-of-scope" },
  beautyProfile: { contract: "omitted", blockers: ["G04"], phase: "out-of-scope" },
} as const satisfies Record<string, Omit<Capability, "integrated">>;

export const integrationStatus: Readonly<
  Record<keyof typeof capabilities, Capability["integrated"]>
> = Object.fromEntries(Object.keys(capabilities).map((key) => [key, false])) as Record<
  keyof typeof capabilities,
  false
>;
