import { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  Text,
  useToast,
  Card,
  CardBody,
  Icon,
  useColorModeValue,
  HStack,
  IconButton,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
  Badge,
  Tooltip,
} from '@chakra-ui/react';
import { FiUpload, FiTrash2, FiSearch, FiDatabase } from 'react-icons/fi';
import { geminiService, AnalysisResult } from '../services/GeminiService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AnalysisInProgress from './AnalysisInProgress';

const MotionBox = motion(Box);

interface UploadedFile {
  file: File;
  id: string;
}

// Analysis status phases
type AnalysisPhase = 'initial' | 'understanding' | 'extracting' | 'analyzing' | 'finalizing';

export const FileUpload = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promptsProcessed, setPromptsProcessed] = useState(0);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase>('initial');
  const toast = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Total number of prompts to process
  const TOTAL_PROMPTS = 13;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      file,
      id: `${file.name}-${Date.now()}`
    }));

    // Validate file types
    const invalidFiles = newFiles.filter(f => f.file.type !== 'application/pdf');
    if (invalidFiles.length > 0) {
      invalidFiles.forEach(f => {
        toast({
          title: 'Invalid file type',
          description: `${f.file.name} is not a PDF file`,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      });
    }

    // Add only valid PDF files
    const validFiles = newFiles.filter(f => f.file.type === 'application/pdf');
    setUploadedFiles(prev => [...prev, ...validFiles]);
    
    // Clear any previous errors
    setError(null);
    setPromptsProcessed(0);
    setTestResult(null);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    // Clear analysis result when files change
    setAnalysisResult(null);
    setError(null);
    setPromptsProcessed(0);
    setTestResult(null);
  };

  const clearErrors = () => {
    setError(null);
    setTestResult(null);
  };

  // Setup a progress tracker for the prompts
  const updatePromptProgress = () => {
    const processedPrompts = geminiService.getPromptResponses().length;
    setPromptsProcessed(processedPrompts);
    
    // Update analysis phase based on progress
    if (processedPrompts === 0) {
      setAnalysisPhase('initial');
    } else if (processedPrompts < 3) {
      setAnalysisPhase('understanding');
    } else if (processedPrompts < 7) {
      setAnalysisPhase('extracting');
    } else if (processedPrompts < 11) {
      setAnalysisPhase('analyzing');
    } else {
      setAnalysisPhase('finalizing');
    }
  };

  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (promptsProcessed === 0) return 5; // Show minimal progress at start
    return Math.round((promptsProcessed / TOTAL_PROMPTS) * 100);
  };

  // Test Firebase storage without using Gemini
  const testFirebaseStorage = async () => {
    if (!user || !user.email) {
      toast({
        title: 'Authentication required',
        description: 'You must be logged in to test Firebase storage.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const result = await geminiService.testFirestoreConnection(user.email);
      
      if (result.success) {
        setTestResult(`SUCCESS: ${result.message}`);
        toast({
          title: 'Firebase Storage Test Successful',
          description: result.message,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        setTestResult(`ERROR: ${result.message}`);
        setError(result.message);
        toast({
          title: 'Firebase Storage Test Failed',
          description: result.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while testing Firebase storage';
      setTestResult(`ERROR: ${errorMessage}`);
      setError(errorMessage);
      toast({
        title: 'Firebase Test Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const analyzeFiles = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: 'No files to analyze',
        description: 'Please upload at least one PDF file first.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!user || !user.email) {
      toast({
        title: 'Authentication required',
        description: 'You must be logged in to analyze documents.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setError(null);
    setPromptsProcessed(0);
    setTestResult(null);
    setAnalysisPhase('initial');

    // Setup progress tracking interval
    const progressInterval = setInterval(() => {
      updatePromptProgress();
    }, 1000);

    try {
      toast({
        title: 'Analysis Started',
        description: `Analyzing your insurance documents...`,
        status: 'info',
        duration: 3000,
        isClosable: true,
      });

      const result = await geminiService.analyzeInsuranceDocuments(
        uploadedFiles.map(f => f.file),
        user.email
      );

      // Clear interval and update one last time
      clearInterval(progressInterval);
      updatePromptProgress();
      
      setAnalysisResult(result);

      if (result.error) {
        setError(result.error);
        toast({
          title: 'Analysis Error',
          description: result.error,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } else {
        // Navigate to results page with the result
        navigate('/results', { state: { result } });
        return;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while analyzing the files';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      clearInterval(progressInterval);
      setIsAnalyzing(false);
    }
  };

  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Render different UI based on analysis state
  if (isAnalyzing) {
    return (
      <AnalysisInProgress 
        progress={getProgressPercentage()}
        phase={analysisPhase}
        promptsProcessed={promptsProcessed}
        totalPrompts={TOTAL_PROMPTS}
      />
    );
  }

  return (
    <VStack spacing={6} w="full">
      {error && (
        <Alert status="error">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle mr={2}>Analysis Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Box>
          <CloseButton 
            position="absolute" 
            right="8px" 
            top="8px" 
            onClick={clearErrors}
          />
        </Alert>
      )}

      {testResult && (
        <Alert status={testResult.startsWith('SUCCESS') ? 'success' : testResult.startsWith('WARNING') ? 'warning' : 'error'}>
          <AlertIcon />
          <Box flex="1">
            <AlertTitle mr={2}>Firebase Storage Test</AlertTitle>
            <AlertDescription>{testResult}</AlertDescription>
          </Box>
          <CloseButton 
            position="absolute" 
            right="8px" 
            top="8px" 
            onClick={() => setTestResult(null)}
          />
        </Alert>
      )}
      
      
      <MotionBox
        w="full"
        p={10}
        border="2px dashed"
        borderColor={borderColor}
        borderRadius="lg"
        textAlign="center"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Button
          as="label"
          leftIcon={<Icon as={FiUpload} />}
          colorScheme="blue"
          size="lg"
          cursor="pointer"
          mb={4}
        >
          Upload Insurance Documents
          <input
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </Button>
        <Text color="gray.500" fontSize="sm">
          Select all PDF documents related to the insurance policy
        </Text>
      </MotionBox>

      {uploadedFiles.length > 0 && (
        <MotionBox
          w="full"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <VStack w="full" spacing={4}>
            <HStack w="full" justify="space-between">
              <Text fontWeight="bold" fontSize="lg">
                Policy Documents ({uploadedFiles.length})
              </Text>
              <Badge colorScheme="blue" p={1} borderRadius="md">
                {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} ready
              </Badge>
            </HStack>
            
            {uploadedFiles.map(({ file, id }) => (
              <Card key={id} w="full" bg={cardBg}>
                <CardBody>
                  <HStack justify="space-between">
                    <Text>{file.name}</Text>
                    <IconButton
                      icon={<FiTrash2 />}
                      aria-label="Remove file"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => removeFile(id)}
                    />
                  </HStack>
                </CardBody>
              </Card>
            ))}
            
            <Button
              leftIcon={<Icon as={FiSearch} />}
              colorScheme="green"
              size="lg"
              w="full"
              onClick={analyzeFiles}
              isLoading={isAnalyzing}
              loadingText="Preparing Analysis..."
              mt={2}
            >
              Analyze Insurance Policy
            </Button>
          </VStack>
        </MotionBox>
      )}
    </VStack>
  );
};