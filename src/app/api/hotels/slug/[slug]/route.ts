import { NextRequest, NextResponse } from "next/server";
import { getHotelBySlug } from "@/server/hotels/service";
import { errorResponse } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const hotel = await getHotelBySlug(slug);
    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }
    return NextResponse.json({ hotel });
  } catch (error) {
    return errorResponse(error);
  }
}
