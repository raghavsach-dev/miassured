import { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  Text,
  useToast,
  Progress,
  Card,
  CardBody,
  Icon,
  useColorModeValue,
  HStack,
  IconButton,
  Divider,
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

interface UploadedFile {
  file: File;
  id: string;
}

export const FileUpload = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promptsProcessed, setPromptsProcessed] = useState(0);
  const [testResult, setTestResult] = useState<string | null>(null);
  const toast = useToast();
  const { user } = useAuth();

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
      const result = await geminiService.testFirebaseStorage(user.email);
      
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

    // Setup progress tracking interval
    const progressInterval = setInterval(() => {
      updatePromptProgress();
    }, 1000);

    try {
      toast({
        title: 'Analysis Started',
        description: `Analyzing ${uploadedFiles.length} document(s) together...`,
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
      
      // Debug logs
      console.log("Analysis Result:", result);
      console.log("Prompt Responses:", geminiService.getPromptResponses());
      
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
        const sanitizedEmail = user.email.replace(/\./g, ',');
        const storagePath = `users/${sanitizedEmail}/policies/policy1/documents/{prompt_responses}`;
        console.log("Storage Path:", storagePath);
        setTestResult(`SUCCESS: Analysis data stored at: /${storagePath}`);
        toast({
          title: 'Analysis Complete',
          description: `Successfully analyzed and stored all documents with ${geminiService.getPromptResponses().length} specialized prompts at path /${storagePath}`,
          status: 'success',
          duration: 8000,
          isClosable: true,
        });
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
      
      <HStack w="full" justifyContent="flex-end">
        <Tooltip label="Test Firebase storage without using Gemini">
          <Button
            leftIcon={<Icon as={FiDatabase} />}
            colorScheme="teal"
            size="sm"
            onClick={testFirebaseStorage}
            isLoading={isTesting}
            loadingText="Testing..."
          >
            Test Firebase Storage
          </Button>
        </Tooltip>
      </HStack>
      
      <Box
        w="full"
        p={10}
        border="2px dashed"
        borderColor={borderColor}
        borderRadius="lg"
        textAlign="center"
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
      </Box>

      {uploadedFiles.length > 0 && (
        <VStack w="full" spacing={4}>
          <Text fontWeight="bold" fontSize="lg">
            Policy Documents ({uploadedFiles.length})
          </Text>
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
            loadingText={promptsProcessed > 0 ? `Analyzing... (${promptsProcessed} prompts processed)` : "Analyzing Policy Documents..."}
          >
            Analyze Policy
          </Button>
        </VStack>
      )}

      {isAnalyzing && (
        <Box w="full">
          <HStack mb={2} justify="center">
            <Text textAlign="center">
              {promptsProcessed === 0 
                ? "Analyzing documents with parent prompt..." 
                : `Processing specialized prompts: ${promptsProcessed} complete`}
            </Text>
            {promptsProcessed > 0 && (
              <Badge colorScheme="green" fontSize="0.8em" borderRadius="full" px="2">
                {promptsProcessed}
              </Badge>
            )}
          </HStack>
          <Progress size="xs" isIndeterminate={promptsProcessed === 0} value={promptsProcessed} max={13} colorScheme="blue" />
        </Box>
      )}

      {analysisResult && !error && (
        <VStack w="full" spacing={4}>
          <Divider />
          <HStack justify="space-between" w="full">
            <Text fontWeight="bold" fontSize="lg">
              Policy Analysis Result
            </Text>
            <Badge colorScheme="blue" p={2} borderRadius="md">
              {promptsProcessed} prompts processed
            </Badge>
          </HStack>
          <Card w="full" bg={cardBg}>
            <CardBody>
              <Text whiteSpace="pre-wrap" fontFamily="monospace">
                {(() => {
                  try {
                    // Try to parse and pretty print if it's JSON
                    const parsed = JSON.parse(analysisResult.content);
                    return JSON.stringify(parsed, null, 2);
                  } catch {
                    // If not JSON, display as is
                    return analysisResult.content || '';
                  }
                })()}
              </Text>
            </CardBody>
          </Card>
        </VStack>
      )}
    </VStack>
  );
};