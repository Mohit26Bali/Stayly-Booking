"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { createTicketSchema, type CreateTicketInput } from "@/features/support/schemas/ticket.schema";
import { useCreateTicket } from "@/features/support/hooks/use-tickets";

export function NewTicketDialog() {
  const [open, setOpen] = useState(false);
  const createTicket = useCreateTicket();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { priority: "MEDIUM" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createTicket.mutateAsync(values);
      toast.success("Ticket created — our team will respond soon.");
      setOpen(false);
      reset();
    } catch {
      toast.error("Couldn't create the ticket. Please try again.");
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        New ticket
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact support</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field data-invalid={!!errors.subject}>
              <FieldLabel htmlFor="subject">Subject</FieldLabel>
              <Input id="subject" {...register("subject")} placeholder="What's this about?" />
              <FieldError errors={[errors.subject]} />
            </Field>

            <Field>
              <FieldLabel>Priority</FieldLabel>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field data-invalid={!!errors.description}>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                id="description"
                rows={5}
                {...register("description")}
                placeholder="Describe the issue in detail..."
              />
              <FieldError errors={[errors.description]} />
            </Field>

            <DialogFooter>
              <Button type="submit" disabled={createTicket.isPending}>
                {createTicket.isPending && <Loader2 className="size-4 animate-spin" />}
                Submit ticket
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
