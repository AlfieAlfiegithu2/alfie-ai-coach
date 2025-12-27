import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User, Camera, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ProfilePhotoSelectorProps {
  children: React.ReactNode;
  onPhotoUpdate?: () => void;
  onPhotoSelect?: (url: string) => void;
}

export const animalPhotos = [
  { name: 'Bear', src: '/bear.png' },
  { name: 'Rabbit', src: '/rabbit.png' },
  { name: 'Duck', src: '/duck.png' },
  { name: 'Panda', src: '/panda.png' },
  { name: 'Polar Bear', src: '/polar%20bear.png' },
  { name: 'Hamster', src: '/Hamster.png' },
  { name: 'Deer', src: '/dear.png' },
  { name: 'Piglet', src: '/piglet.png' },
  { name: 'Monkey', src: '/Monkey.png' },
  { name: 'Seal', src: '/seal.png' },
  { name: 'Fox', src: '/fox.png' },
  { name: 'Puppy', src: '/puppy.png' },
  { name: 'Otter', src: '/otter.png' },
  { name: 'Koala', src: '/koala.png' },
  { name: 'Chick', src: '/chick.png' },
  { name: 'Hedgehog', src: '/hedgehog.png' },
];

const ProfilePhotoSelector = ({ children, onPhotoUpdate, onPhotoSelect }: ProfilePhotoSelectorProps) => {
  const { user, refreshProfile, updateProfileAvatar } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSelection = async (photoSrc: string) => {
    if (onPhotoSelect) {
      onPhotoSelect(photoSrc);
      setOpen(false);
      return;
    }
    // Fallback if no specific handler (direct update)
    if (!user) return;
    try {
      updateProfileAvatar(photoSrc);
      onPhotoUpdate?.();
      setOpen(false);
    } catch (error) {
      console.error('Error updating avatar:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl bg-white/95 backdrop-blur-xl border-white/20">
        <DialogHeader>
          <DialogTitle>Choose Profile Photo</DialogTitle>
          <DialogDescription>
            Select one of our friendly avatars.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Animal Photos Grid */}
          <div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-4 max-h-[60vh] overflow-y-auto p-1">
              {animalPhotos.map((animal) => (
                <button
                  key={animal.name}
                  onClick={() => handleSelection(animal.src)}
                  disabled={uploading}
                  className="aspect-square rounded-full overflow-hidden bg-slate-100 hover:bg-slate-200 transition-all border-4 border-transparent hover:border-primary/20 hover:scale-105 active:scale-95 relative group shadow-sm"
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfilePhotoSelector;
