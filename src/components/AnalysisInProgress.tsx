import { 
  Box, 
  VStack, 
  Text, 
  Heading, 
  CircularProgress, 
  CircularProgressLabel,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue
} from "@chakra-ui/react";
import { motion } from "framer-motion";

const MotionBox = motion(Box);

// Animation sequences for the different phases
const phaseAnimations = {
  initial: {
    x: [-3, 3, -3],
    transition: { repeat: Infinity, duration: 1.5 }
  },
  understanding: {
    scale: [1, 1.05, 1],
    transition: { repeat: Infinity, duration: 2 }
  },
  extracting: {
    rotate: [-2, 2, -2],
    transition: { repeat: Infinity, duration: 2 }
  },
  analyzing: {
    y: [-3, 3, -3],
    transition: { repeat: Infinity, duration: 1.5 }
  },
  finalizing: {
    opacity: [0.8, 1, 0.8],
    transition: { repeat: Infinity, duration: 1.5 }
  }
};

type AnalysisPhase = 'initial' | 'understanding' | 'extracting' | 'analyzing' | 'finalizing';

// Phase descriptions displayed to the user
const phaseDescriptions = {
  initial: "Initializing document analysis...",
  understanding: "Understanding document structure...",
  extracting: "Extracting policy details...",
  analyzing: "Analyzing policy features and benefits...",
  finalizing: "Finalizing comprehensive analysis..."
};

type AnalysisInProgressProps = {
  progress: number;
  phase: AnalysisPhase;
  promptsProcessed: number;
  totalPrompts: number;
};

const AnalysisInProgress = ({ 
  progress, 
  phase, 
  promptsProcessed, 
  totalPrompts 
}: AnalysisInProgressProps) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const currentAnimation = phaseAnimations[phase];
  const progressTrackColor = useColorModeValue("gray.100", "gray.700");
  const progressColor = useColorModeValue("blue.400", "blue.300");
  const progressTextColor = useColorModeValue("blue.600", "blue.200");
  
  return (
    <MotionBox
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      w="full"
      py={10}
      borderRadius="lg"
      overflow="hidden"
    >
      <VStack spacing={8} w="full" align="center">
        <Heading size="md" textAlign="center" mb={2}>Analyzing Your Insurance Documents</Heading>
        
        <Box position="relative" w={200} h={200}>
          <CircularProgress 
            value={progress} 
            color={progressColor}
            size="200px" 
            thickness="8px"
            trackColor={progressTrackColor}
            capIsRound
          >
            <CircularProgressLabel fontSize="2xl" fontWeight="bold" color={progressTextColor}>
              {progress}%
            </CircularProgressLabel>
          </CircularProgress>
        </Box>
        
        <MotionBox
          animate={currentAnimation}
          maxW="md"
        >
          <VStack spacing={2} textAlign="center">
            <Text fontSize="lg" fontWeight="bold">{phaseDescriptions[phase]}</Text>
            <Text fontSize="sm" color="gray.500">
              {promptsProcessed > 0 
                ? `Processing ${promptsProcessed} of ${totalPrompts} analysis modules` 
                : "Understanding document structure and context"}
            </Text>
          </VStack>
        </MotionBox>
        
        <Alert status="info" w="full" maxW="md" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Insurance Policy Analysis in Progress</AlertTitle>
            <AlertDescription>
              Our AI is thoroughly analyzing your documents. This may take several minutes depending on document complexity.
            </AlertDescription>
          </Box>
        </Alert>
      </VStack>
    </MotionBox>
  );
};

export default AnalysisInProgress; 