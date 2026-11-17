import { NextRequest, NextResponse } from "next/server";
import { hotelSearchSchema, createHotelSchema } from "@/features/hotels/schemas/hotel.schema";
import { searchHotels, createHotel } from "@/server/hotels/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params = Object.fromEntries(searchParams.entries());
    const amenities = searchParams.getAll("amenities");
    const filters = hotelSearchSchema.parse({
      ...params,
      ...(amenities.length > 0 ? { amenities } : {}),
    });
    const result = await searchHotels(filters);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request, ["HOTEL_OWNER", "ADMIN"]);
    const body = createHotelSchema.parse(await request.json());
    const hotel = await createHotel(user.id, body);
    return NextResponse.json({ hotel }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
