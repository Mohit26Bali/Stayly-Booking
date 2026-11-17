import { NextRequest, NextResponse } from "next/server";
import { replyReviewSchema } from "@/features/reviews/schemas/review.schema";
import { replyToReview } from "@/server/reviews/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = requireUser(request, ["HOTEL_OWNER", "ADMIN"]);
    const { id } = await params;
    const { reply } = replyReviewSchema.parse(await request.json());
    const review = await replyToReview(id, user.id, reply);
    return NextResponse.json({ review });
  } catch (error) {
    return errorResponse(error);
  }
}
