import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSidebar } from '@/components/ui/sidebar';
import { api } from '@/main.tsx';
import { AxiosError, type AxiosResponse } from 'axios';
import { PlusCircle, SidebarIcon } from 'lucide-react';
import { useState } from 'react';
import { type ShortenLinkInput, type ShortenLinkResponse } from '../../../lib/src/index.ts';
import { CreateLinkDialog } from './create-link-dialog';

export function SiteHeader() {
  const { toggleSidebar } = useSidebar();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreateLink = async (data: ShortenLinkInput) => {
    try {
      const result: AxiosResponse<ShortenLinkResponse> = await api.post('/links', data);
      setMessage({
        type: 'success',
        text: `Short URL created successfully: ${result.data.short_url}`,
      });
      setIsDialogOpen(false); // Close dialog on success
    } catch (error) {
      if (error instanceof AxiosError && 'status' in error && error.status === 409) {
        setMessage({
          type: 'error',
          text: 'Short URL already exists. Choose a new short URL.',
        });
      } else {
        setMessage({
          type: 'error',
          text: 'Internal server error. Please try again.',
        });
      }
    }
  };

  return (
    <header className="bg-background sticky top-0 z-50 flex h-16 w-full items-center border-b">
      <div className="flex h-full w-full items-center gap-2 px-4">
        {/* Sidebar & Title */}
        <div className="flex items-center gap-2">
          <Button className="h-8 w-8" variant="ghost" size="icon" onClick={toggleSidebar}>
            <SidebarIcon className="h-5 w-5" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="text-lg font-semibold">Shorty</div>
        </div>

        {/* Create Link Button */}
        <div className="ml-auto flex items-center">
          <Button size="sm" className="gap-1" onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="h-4 w-4" />
            Create Short Link
          </Button>

          {message && (
            <div
              className={`fixed top-20 right-4 p-4 rounded-md shadow-lg ${
                message.type === 'success'
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <span>{message.text}</span>
                <button
                  onClick={() => setMessage(null)}
                  className="ml-4 text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <CreateLinkDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            onSubmit={handleCreateLink}
          />
        </div>
      </div>
    </header>
  );
}
