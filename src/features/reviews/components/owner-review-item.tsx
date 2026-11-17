"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useReplyToReview } from "@/features/reviews/hooks/use-reviews";
import type { OwnerReviewSummary } from "@/features/dashboard/hooks/use-owner-dashboard";

export function OwnerReviewItem({ review }: { review: OwnerReviewSummary }) {
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const replyToReview = useReplyToReview();

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">
            {review.user.profile?.firstName ?? review.user.email} · {review.hotel.name}
          </p>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="size-3.5 fill-current text-accent" />
            {review.rating} · {format(new Date(review.createdAt), "MMM d, yyyy")}
          </p>
        </div>
      </div>

      {review.title && <p className="mt-2 font-medium">{review.title}</p>}
      <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>

      {review.ownerReply ? (
        <div className="mt-3 rounded-xl bg-muted p-3 text-sm">
          <p className="font-medium">Your reply</p>
          <p className="mt-1 text-muted-foreground">{review.ownerReply}</p>
        </div>
      ) : replying ? (
        <div className="mt-3 space-y-2">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Thank the guest or address their feedback..."
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={replyToReview.isPending || !reply.trim()}
              onClick={() =>
                replyToReview.mutate(
                  { id: review.id, reply },
                  {
                    onSuccess: () => {
                      toast.success("Reply posted");
                      setReplying(false);
                    },
                    onError: () => toast.error("Couldn't post your reply"),
                  },
                )
              }
            >
              {replyToReview.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Post reply
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setReplying(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="mt-3" onClick={() => setReplying(true)}>
          Reply
        </Button>
      )}
    </div>
  );
}
