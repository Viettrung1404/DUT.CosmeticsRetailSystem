import { maintenanceResponse } from "@/shared/ui/maintenance-document";
export const dynamic = "force-dynamic";
export function GET() { return maintenanceResponse(process.env.MAINTENANCE_MESSAGE, process.env.MAINTENANCE_RETRY_AFTER); }
