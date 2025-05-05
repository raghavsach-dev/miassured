import { Box } from '@chakra-ui/react';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

export default function PageBackground({ children }: { children: React.ReactNode }) {
  return (
    <Box
      minH="100vh"
      overflow="hidden"
      bg="#0A1929"
      position="relative"
    >
      {/* Gradient background */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bgGradient="linear(to-br, rgba(13, 71, 161, 0.1), rgba(33, 150, 243, 0.05))"
      />

      {/* Subtle grid pattern */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        opacity={0.4}
        backgroundImage={`
          linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
        `}
        backgroundSize="20px 20px"
      />

      {/* Animated gradient orbs */}
      <Box
        position="absolute"
        top="5%"
        left="10%"
        width="600px"
        height="600px"
        background="radial-gradient(circle, rgba(33, 150, 243, 0.1) 0%, transparent 70%)"
        as={MotionBox}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.4, 0.3],
        }}
        // @ts-ignore
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      <Box
        position="absolute"
        bottom="10%"
        right="5%"
        width="500px"
        height="500px"
        background="radial-gradient(circle, rgba(255, 193, 7, 0.1) 0%, transparent 70%)"
        as={MotionBox}
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.2, 0.3, 0.2],
        }}
        // @ts-ignore
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Noise texture overlay */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        opacity={0.3}
        backgroundImage="url('data:image/png;base64,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')"
        mixBlendMode="overlay"
      />

      {/* Content */}
      <Box 
        position="relative" 
        zIndex={1}
        as={MotionBox}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        // @ts-ignore
        transition={{
          duration: 0.5
        }}
      >
        {children}
      </Box>
    </Box>
  );
} 