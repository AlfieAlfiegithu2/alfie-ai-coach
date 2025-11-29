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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateAvatar = async (photoSrc: string) => {
    if (!user) return;

    setUploading(true);
    try {
      // Optimistically update profile state IMMEDIATELY for instant UI feedback
      updateProfileAvatar(photoSrc);

      // Update profile with selected photo in database
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: photoSrc })
        .eq('id', user.id);

      if (error) {
        // If DB update fails, revert the optimistic update
        await refreshProfile();
        throw error;
      }

      console.log('✅ Profile photo updated successfully');

      // Refresh profile to sync with database
      try {
        await refreshProfile();
      } catch (refreshError) {
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
      
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile photo. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

      await updateAvatar(publicUrl);
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({ 
        title: "Upload Failed", 
        description: "Failed to upload photo. Please try again.", 
        variant: "destructive" 
      });
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
            Select one of the animal avatars or upload your own photo.
          </DialogDescription>
        </DialogHeader>

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
            <div className="flex flex-col items-center gap-2 text-slate-600">
              <div className="p-3 bg-white rounded-full shadow-sm">
                <Upload className="w-6 h-6 text-blue-500" />
              </div>
              <span className="font-medium">Upload Custom Photo</span>
              <span className="text-xs text-slate-400">Max 2MB (JPG, PNG, GIF)</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/95 px-2 text-slate-500 font-medium">Or choose an avatar</span>
            </div>
          </div>

          {/* Animal Photos Grid */}
          <div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-60 overflow-y-auto p-1">
              {animalPhotos.map((animal) => (
                <button
                  key={animal.name}
                  onClick={() => updateAvatar(animal.src)}
                  disabled={uploading}
                  className="aspect-square rounded-lg overflow-hidden bg-slate-100 hover:bg-slate-200 transition-colors border-2 border-transparent hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed relative group"
                  title={animal.name}
                >
                  <img
                    src={animal.src}
                    alt={animal.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
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