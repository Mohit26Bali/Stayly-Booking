import { NextResponse } from "next/server";
import { listAmenities } from "@/server/hotels/service";
import { errorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const amenities = await listAmenities();
    return NextResponse.json({ amenities });
  } catch (error) {
    return errorResponse(error);
  }
}
