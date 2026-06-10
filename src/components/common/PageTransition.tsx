import { motion } from "framer-motion";
import { ReactNode } from "react";

const animations = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const PageTransition = ({ children }: { children: ReactNode }) => {
  return (
    <motion.div
      variants={animations}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ 
        duration: 0.2, 
        ease: "linear"
      }}
      className="w-full h-full min-h-screen"
    >
      {children}
    </motion.div>
  );
};
