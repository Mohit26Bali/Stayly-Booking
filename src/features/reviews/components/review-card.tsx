"use client";

import { useState } from "react";
import { ThumbsUp, Star } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToggleHelpful } from "@/features/reviews/hooks/use-reviews";
import { useAuthStore } from "@/features/auth/store";
import type { Review } from "@/types/hotel";

export function ReviewCard({ review }: { review: Review }) {
  const user = useAuthStore((s) => s.user);
  const toggleHelpful = useToggleHelpful();
  const [helpful, setHelpful] = useState(false);
  const [voted, setVoted] = useState(false);

  const firstName = review.user.profile?.firstName ?? "Guest";
  const lastName = review.user.profile?.lastName ?? "";
  const initials = `${firstName[0] ?? "G"}${lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="border-b border-border pb-5 last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Avatar size="sm">
            <AvatarImage src={review.user.profile?.avatarUrl ?? undefined} alt={firstName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="font-medium">
            {firstName} {lastName}
          </span>
        </div>
        <span className="flex items-center gap-1 text-sm">
          <Star className="size-3.5 fill-current text-accent" />
          {review.rating}
        </span>
      </div>
      {review.title && <p className="mt-1 font-medium">{review.title}</p>}
      <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>

      {review.ownerReply && (
        <div className="mt-3 rounded-xl bg-muted p-3 text-sm">
          <p className="font-medium">Response from the property</p>
          <p className="mt-1 text-muted-foreground">{review.ownerReply}</p>
        </div>
      )}

      <button
        type="button"
        className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => {
          if (!user) {
            toast.info("Log in to mark reviews as helpful.");
            return;
          }
          toggleHelpful.mutate(review.id, {
            onSuccess: (isHelpful) => {
              setHelpful(isHelpful);
              setVoted(true);
            },
          });
        }}
      >
        <ThumbsUp className={`size-3.5 ${voted && helpful ? "fill-current text-primary" : ""}`} />
        Helpful
      </button>
    </div>
  );
}
