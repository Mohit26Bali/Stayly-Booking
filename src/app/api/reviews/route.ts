import { NextRequest, NextResponse } from "next/server";
import { createReviewSchema } from "@/features/reviews/schemas/review.schema";
import { createReview } from "@/server/reviews/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    const body = createReviewSchema.parse(await request.json());
    const review = await createReview(user.id, body);
    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
