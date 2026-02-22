// ChatbotInput: Form for sending messages, uses react-hook-form and zod
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  message: z.string().min(1, 'Type a message'),
});

type FormData = z.infer<typeof schema>;

interface ChatbotInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatbotInput: React.FC<ChatbotInputProps> = ({ onSend, disabled }) => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const submit = (data: FormData) => {
    onSend(data.message);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="flex gap-2 p-4 border-t bg-white">
      <input
        {...register('message')}
        className="flex-1 rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder="Type your message..."
        disabled={disabled || isSubmitting}
      />
      <button
        type="submit"
        className="px-4 py-2 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
        disabled={disabled || isSubmitting}
      >
        Send
      </button>
      {errors.message && <span className="text-red-500 text-xs ml-2">{errors.message.message}</span>}
    </form>
  );
};
