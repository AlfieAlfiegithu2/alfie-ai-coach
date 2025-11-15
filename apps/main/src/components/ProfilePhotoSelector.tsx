import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AudioR2 } from '@/lib/cloudflare-r2';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ProfilePhotoSelectorProps {
  children: React.ReactNode;
  onPhotoUpdate?: () => void;
}

const animalPhotos = [
  { name: 'Bear', src: '/bear.png' },
  { name: 'Cat', src: '/cat.png' },
  { name: 'Chick', src: '/chick.png' },
  { name: 'Dear', src: '/dear.png' },
  { name: 'Duck', src: '/duck.png' },
  { name: 'Fox', src: '/fox.png' },
  { name: 'Hamster', src: '/Hamster.png' },
  { name: 'Hedgehog', src: '/hedgehog.png' },
  { name: 'Koala', src: '/koala.png' },
  { name: 'Monkey', src: '/Monkey.png' },
  { name: 'Otter', src: '/otter.png' },
  { name: 'Panda', src: '/panda.png' },
  { name: 'Penguin', src: '/Penguine.png' },
  { name: 'Piglet', src: '/piglet.png' },
  { name: 'Polar Bear', src: '/polar bear.png' },
  { name: 'Puppy', src: '/puppy.png' },
  { name: 'Rabbit', src: '/rabbit.png' },
  { name: 'Seal', src: '/seal.png' },
  { name: 'Squirrel', src: '/squerrel.png' },
];

const ProfilePhotoSelector = ({ children, onPhotoUpdate }: ProfilePhotoSelectorProps) => {
  const { user, refreshProfile, updateProfileAvatar } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const selectAnimalPhoto = async (photoSrc: string) => {
    if (!user) return;

    setUploading(true);
    try {
      // Optimistically update profile state IMMEDIATELY for instant UI feedback
      // This ensures the photo displays right away in SettingsModal before DB update completes
      updateProfileAvatar(photoSrc);
      
      // Update profile with selected animal photo in database
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: photoSrc })
        .eq('id', user.id);

      if (error) {
        // If DB update fails, revert the optimistic update
        await refreshProfile();
        throw error;
      }

      console.log('✅ Animal photo selected successfully');
      
      // Refresh profile to sync with database (with retry on network errors)
      // This ensures we have the latest data, but UI already shows the new photo
      try {
        await refreshProfile();
      } catch (refreshError) {
        // If refresh fails due to network, the optimistic update already shows the photo
        console.warn('Profile refresh failed, but photo was updated:', refreshError);
      }
      
      toast({
        title: "Success!",
        description: "Profile photo updated successfully!"
      });
      
      setOpen(false);
      onPhotoUpdate?.();
    } catch (error: any) {
      console.error('Error updating photo:', error);
      
      // Revert optimistic update on error
      try {
        await refreshProfile();
      } catch (e) {
        console.warn('Error reverting profile:', e);
      }
      
      // Check if it's a network error
      const isNetworkError = error?.message?.includes('ERR_CONNECTION_CLOSED') ||
                            error?.message?.includes('Failed to fetch') ||
                            error?.message?.includes('NetworkError');
      
      if (isNetworkError) {
        // For network errors, try to refresh profile after a delay
        setTimeout(async () => {
          try {
            await refreshProfile();
          } catch (e) {
            console.warn('Retry refresh failed:', e);
          }
        }, 2000);
        
        toast({
          title: "Photo Updated",
          description: "Your photo is being saved. It may take a moment to appear.",
        });
      } else {
        toast({
          title: "Update Failed",
          description: "Failed to update profile photo. Please try again.",
          variant: "destructive"
        });
      }
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
        <DialogHeader className="items-center">
          <DialogTitle className="text-slate-800 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Choose Profile Photo
          </DialogTitle>
          <DialogDescription className="sr-only">
            Select one of the animal avatars to use as your profile photo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Animal Photos Grid */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3 text-center">Choose an Animal Avatar</h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-60 overflow-y-auto">
              {animalPhotos.map((animal) => (
                <button
                  key={animal.name}
                  onClick={() => selectAnimalPhoto(animal.src)}
                  disabled={uploading}
                  className="aspect-square rounded-lg overflow-hidden bg-slate-100 hover:bg-slate-200 transition-colors border-2 border-transparent hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={animal.name}
                >
                  <img
                    src={animal.src}
                    alt={animal.name}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Other actions removed for a cleaner experience */}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfilePhotoSelector;