'use client';

import React from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { trpc } from '@/utils/trpc';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  systemPrompt: z.string().min(1, 'System prompt is required'),
});

type FormData = z.infer<typeof schema>;

interface EditAgentFormProps {
  agentId: string;
  defaultValues: FormData;
  onDeleted?: () => void;
}

export function EditAgentForm({
  agentId,
  defaultValues,
  onDeleted,
}: EditAgentFormProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const utils = trpc.useUtils();
  const update = trpc.agents.update.useMutation({
    onSuccess: () => {
      utils.agents.list.invalidate();
      utils.agents.getById.invalidate({ id: agentId });
    },
    onError: (err) => setServerError(err.message),
  });

  const deleteMutation = trpc.agents.delete.useMutation({
    onSuccess: () => {
      onDeleted?.();
    },
    onError: (err) => setServerError(err.message),
  });

  const onSubmit = (data: FormData) => {
    setServerError(null);
    update.mutate({ id: agentId, ...data });
  };

  const onDelete = () => {
    setServerError(null);
    deleteMutation.mutate({ id: agentId });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agent name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="systemPrompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>System prompt</FormLabel>
              <FormControl>
                <Textarea
                  className="resize-none min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting || update.isPending}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive">
                Delete agent
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete agent?</AlertDialogTitle>
                <AlertDialogDescription>
                  This cannot be undone. Conversations using this agent may be affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </form>
    </Form>
  );
}
