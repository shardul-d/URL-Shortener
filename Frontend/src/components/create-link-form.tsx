import { Input } from '@/components/ui/input';
import { ShortenLinkInputSchema, type ShortenLinkInput } from '../../../lib/src/index.ts';
import { DateTimePicker } from './ui/datetime-picker.tsx';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';

interface CreateLinkFormProps {
  onSubmit: (data: ShortenLinkInput) => void;
  onCancel?: () => void;
}

export function CreateLinkForm({ onSubmit, onCancel }: CreateLinkFormProps) {
  const form = useForm<ShortenLinkInput>({
    resolver: zodResolver(ShortenLinkInputSchema),
    defaultValues: {
      original_url: '',
      short_url: undefined,
      expires_at: undefined,
    },
    mode: 'onSubmit',
  });

  const handleSubmit = (data: ShortenLinkInput) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-4">
        {/* Long URL */}
        <FormField
          control={form.control}
          name="original_url"
          render={({ field }) => (
            <FormItem className="grid grid-cols-4 items-center gap-4">
              <FormLabel className="text-right col-span-1">Long URL</FormLabel>
              <FormControl className="col-span-3">
                <Input {...field} placeholder="https://example.com/…" autoComplete="off" />
              </FormControl>
              <FormMessage className="col-span-4 text-red-600 ml-[25%]" />
            </FormItem>
          )}
        />

        {/* Custom Alias */}
        <FormField
          control={form.control}
          name="short_url"
          render={({ field }) => (
            <FormItem className="grid grid-cols-4 items-center gap-4">
              <FormLabel className="text-right col-span-1 whitespace-nowrap">
                Custom Alias
              </FormLabel>
              <FormControl className="col-span-3">
                <Input {...field} placeholder="my-campaign (optional)" autoComplete="off" />
              </FormControl>
              <FormMessage className="col-span-4 text-red-600 ml-[25%]" />
            </FormItem>
          )}
        />

        {/* Expiry */}
        <FormField
          control={form.control}
          name="expires_at"
          render={({ field }) => (
            <FormItem className="grid grid-cols-4 items-center gap-4">
              <FormLabel className="text-right col-span-1">Expires At</FormLabel>
              <FormControl className="col-span-3">
                <DateTimePicker
                  date={field.value}
                  setDate={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  className="w-full"
                  placeholder="Select expiry date and time"
                />
              </FormControl>
              <FormMessage className="col-span-4 text-red-600 ml-[25%]" />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end mt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit">Create Link</Button>
        </div>
      </form>
    </Form>
  );
}
