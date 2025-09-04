import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CreateLinkForm } from './create-link-form.tsx';
import { type ShortenLinkInput } from '../../../lib/src/index.ts';

interface CreateLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ShortenLinkInput) => void;
}

export function CreateLinkDialog({ open, onOpenChange, onSubmit }: CreateLinkDialogProps) {
  const handleSubmit = (data: ShortenLinkInput) => {
    onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a new short link</DialogTitle>
          <DialogDescription>
            Enter your long URL below. You can also add an optional custom alias.
          </DialogDescription>
        </DialogHeader>
        <CreateLinkForm onSubmit={handleSubmit} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
