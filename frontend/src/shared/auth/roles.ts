export const ALLOWED_STAFF_ROLES = [
  "ADMIN",
  "STORE_STAFF",
  "STAFF",
  "STORE_MGR",
  "STORE_MANAGER",
  "WAREHOUSE_STAFF",
  "WH_OPERATOR",
  "WH_SUPERVISOR",
  "MANAGER",
  "QC_STAFF",
  "FINANCE",
  "ACCOUNTANT",
] as const;

export type StaffRole = (typeof ALLOWED_STAFF_ROLES)[number];
