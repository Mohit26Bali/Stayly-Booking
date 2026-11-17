"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
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
import { useStartConversation } from "@/features/messages/hooks/use-conversations";
import { useAuthStore } from "@/features/auth/store";

export function MessageHostDialog({ hotelId, hotelName }: { hotelId: string; hotelName: string }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const startConversation = useStartConversation();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.info("Log in to message the host.");
      router.push("/login");
      return;
    }

    try {
      const result = await startConversation.mutateAsync({
        hotelId,
        subject: subject || "General question",
        message,
      });
      setOpen(false);
      setSubject("");
      setMessage("");
      router.push(`/messages?c=${result.conversation.id}`);
    } catch (error) {
      const errMessage = isAxiosError(error)
        ? (error.response?.data as { error?: string })?.error
        : undefined;
      toast.error(errMessage ?? "Couldn't send your message.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="w-full" />}>
        <MessageSquare className="size-4" />
        Message host
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Message {hotelName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="subject">Subject</FieldLabel>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Early check-in"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="message">Message</FieldLabel>
            <Textarea
              id="message"
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about availability, amenities, or anything else..."
            />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={startConversation.isPending}>
              {startConversation.isPending && <Loader2 className="size-4 animate-spin" />}
              Send message
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
