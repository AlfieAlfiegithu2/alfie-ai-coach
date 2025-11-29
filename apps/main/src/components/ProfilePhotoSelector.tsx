import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User, Camera, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AudioR2 } from '@/lib/cloudflare-r2';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ProfilePhotoSelectorProps {
  children: React.ReactNode;
  onPhotoUpdate?: () => void;
  onPhotoSelect?: (url: string) => void; // New prop for deferred saving
}

const animalPhotos = [
  { name: 'Bear', src: '/bear.png' },
// ... existing array ...
];

const ProfilePhotoSelector = ({ children, onPhotoUpdate, onPhotoSelect }: ProfilePhotoSelectorProps) => {
  const { user, refreshProfile, updateProfileAvatar } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelection = async (photoSrc: string) => {
    if (onPhotoSelect) {
      onPhotoSelect(photoSrc);
      setOpen(false);
      return;
    }
    await updateAvatar(photoSrc);
  };

  const updateAvatar = async (photoSrc: string) => {
    // ... existing implementation ...
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // ... start of existing implementation ...
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast({ 
        title: "File too large", 
        description: "Please choose an image smaller than 2MB", 
        variant: "destructive" 
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Call handleSelection instead of direct update
      await handleSelection(publicUrl);
      
    } catch (error: any) {
      // ... error handling ...
      console.error('Error uploading avatar:', error);
      toast({ 
        title: "Upload Failed", 
        description: "Failed to upload photo. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-white/95 backdrop-blur-xl border-white/20">
        {/* ... header ... */}
        
        <div className="space-y-6">
          {/* Custom Upload Section */}
          <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
               onClick={() => fileInputRef.current?.click()}>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            {/* ... upload content ... */}
          </div>

          <div className="relative">
            {/* ... divider ... */}
          </div>

          {/* Animal Photos Grid */}
          <div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-60 overflow-y-auto p-1">
              {animalPhotos.map((animal) => (
                <button
                  key={animal.name}
                  onClick={() => handleSelection(animal.src)}
                  disabled={uploading}
                  className="aspect-square rounded-lg overflow-hidden bg-slate-100 hover:bg-slate-200 transition-colors border-2 border-transparent hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed relative group"
                  title={animal.name}
                >
                  <img
                    src={animal.src}
                    alt={animal.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                  {/* ... spinner ... */}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfilePhotoSelector;