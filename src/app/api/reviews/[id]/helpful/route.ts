import { NextRequest, NextResponse } from "next/server";
import { toggleHelpfulVote } from "@/server/reviews/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = requireUser(request);
    const { id } = await params;
    const result = await toggleHelpfulVote(id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
