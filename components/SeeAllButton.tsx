import { motion } from 'framer-motion';

interface SeeAllButtonProps {
  type: 'featured' | 'new' | 'trending' | 'artists';
  onClick: (type: 'featured' | 'new' | 'trending' | 'artists') => void;
}

export default function SeeAllButton({ type, onClick }: SeeAllButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick(type)}
      className="text-purple-400 hover:text-purple-300 font-medium"
    >
      Voir tout
    </motion.button>
  );
}
