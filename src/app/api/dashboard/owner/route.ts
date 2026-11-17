import { NextRequest, NextResponse } from "next/server";
import { getOwnerDashboard } from "@/server/dashboard/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request, ["HOTEL_OWNER", "ADMIN"]);
    const dashboard = await getOwnerDashboard(user.id);
    return NextResponse.json(dashboard);
  } catch (error) {
    return errorResponse(error);
  }
}
