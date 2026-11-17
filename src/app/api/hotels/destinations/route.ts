import { NextResponse } from "next/server";
import { getPopularDestinations } from "@/server/hotels/service";
import { errorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const destinations = await getPopularDestinations();
    return NextResponse.json({ destinations });
  } catch (error) {
    return errorResponse(error);
  }
}
