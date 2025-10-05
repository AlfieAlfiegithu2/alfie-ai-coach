import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User, Upload, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const uploadCustomPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      console.log('✅ Custom photo uploaded successfully');

      // Refresh profile to show new photo
      await refreshProfile();
      
      toast({
        title: "Success!",
        description: "Profile photo updated successfully!"
      });
      
      setOpen(false);
      onPhotoUpdate?.();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload profile photo. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const selectAnimalPhoto = async (photoSrc: string) => {
    if (!user) return;

    setUploading(true);
    try {
      // Update profile with selected animal photo
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: photoSrc })
        .eq('id', user.id);

      if (error) throw error;

        console.log('✅ Animal photo selected successfully');
        
        // Refresh profile to show new photo
        await refreshProfile();
        
        toast({
          title: "Success!",
          description: "Profile photo updated successfully!"
        });
        
        setOpen(false);
        onPhotoUpdate?.();
    } catch (error) {
      console.error('Error updating photo:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile photo. Please try again.",
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
        <DialogHeader>
          <DialogTitle className="text-slate-800 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Choose Profile Photo
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Upload Custom Photo */}
          <div className="text-center">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Upload Your Own Photo</h3>
            <Button
              onClick={() => document.getElementById('custom-photo-upload')?.click()}
              disabled={uploading}
              className="bg-slate-800 hover:bg-slate-700 text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </Button>
            <input
              id="custom-photo-upload"
              type="file"
              accept="image/*"
              onChange={uploadCustomPhoto}
              className="hidden"
            />
          </div>

          {/* Animal Photos Grid */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3">Or Choose an Animal Avatar</h3>
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

          {/* Other Actions */}
          <div className="pt-2 border-t border-slate-200/60">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Other Actions</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="border-slate-300"
                onClick={() => {
                  setOpen(false);
                  navigate('/onboarding/assessment');
                }}
              >
                Retake Level Assessment
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfilePhotoSelector;