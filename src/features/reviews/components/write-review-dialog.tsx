"use client";

import { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { useCreateReview } from "@/features/reviews/hooks/use-reviews";

export function WriteReviewDialog({
  bookingId,
  hotelName,
  trigger,
}: {
  bookingId: string;
  hotelName: string;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const createReview = useCreateReview();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createReview.mutateAsync({ bookingId, rating, title: title || undefined, comment });
      toast.success("Thanks for your review!");
      setOpen(false);
      setTitle("");
      setComment("");
    } catch (error) {
      const message = isAxiosError(error)
        ? (error.response?.data as { error?: string })?.error
        : undefined;
      toast.error(message ?? "Couldn't submit your review.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review your stay at {hotelName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field>
            <FieldLabel>Rating</FieldLabel>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    className={`size-7 ${
                      star <= (hoverRating || rating)
                        ? "fill-accent text-accent"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="review-title">Title (optional)</FieldLabel>
            <Input
              id="review-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sum up your stay"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="review-comment">Your review</FieldLabel>
            <Textarea
              id="review-comment"
              rows={4}
              required
              minLength={10}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What stood out about your stay?"
            />
          </Field>

          <DialogFooter>
            <Button type="submit" disabled={createReview.isPending}>
              {createReview.isPending && <Loader2 className="size-4 animate-spin" />}
              Submit review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
