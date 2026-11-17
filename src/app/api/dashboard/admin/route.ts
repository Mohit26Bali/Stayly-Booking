import { NextRequest, NextResponse } from "next/server";
import { getAdminDashboard } from "@/server/dashboard/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    requireUser(request, ["ADMIN"]);
    const dashboard = await getAdminDashboard();
    return NextResponse.json(dashboard);
  } catch (error) {
    return errorResponse(error);
  }
}
