export * from "./api-client";
export * from "./auth.service";
export * from "./customer.service";
export * from "./admin.service";
export * from "@/types/api";

import { apiClient, tokenStorage } from "./api-client";
import { authService } from "./auth.service";
import { customerService } from "./customer.service";
import { adminService } from "./admin.service";

export { apiClient, tokenStorage, authService, customerService, adminService };
export default {
  client: apiClient,
  token: tokenStorage,
  auth: authService,
  customer: customerService,
  admin: adminService,
};
