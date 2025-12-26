import { motion } from 'framer-motion';
import LoadingAnimation from '@/components/animations/LoadingAnimation';

interface LoadingOverlayProps {
    backgroundColor?: string;
    size?: 'sm' | 'md' | 'lg';
}

/**
 * Standardized full-screen loading overlay for page transitions.
 * Uses the 120px cat animation and a cream backdrop by default.
 */
const LoadingOverlay = ({
    backgroundColor = '#FEF9E7',
    size = 'md'
}: LoadingOverlayProps) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm"
        style={{ backgroundColor }}
    >
        <div className="flex flex-col items-center">
            <LoadingAnimation size={size} className="opacity-100" />
        </div>
    </motion.div>
);

export default LoadingOverlay;
