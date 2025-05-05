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
} from '@chakra-ui/react';
import { FiUpload, FiTrash2, FiSearch } from 'react-icons/fi';
import { geminiService, AnalysisResult } from '../services/GeminiService';

interface UploadedFile {
  file: File;
  id: string;
}

export const FileUpload = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const toast = useToast();

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
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    // Clear analysis result when files change
    setAnalysisResult(null);
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

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      toast({
        title: 'Analysis Started',
        description: `Analyzing ${uploadedFiles.length} document(s) together...`,
        status: 'info',
        duration: 3000,
        isClosable: true,
      });

      const result = await geminiService.analyzeInsuranceDocuments(
        uploadedFiles.map(f => f.file)
      );

      setAnalysisResult(result);

      if (result.error) {
        toast({
          title: 'Analysis Error',
          description: result.error,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Analysis Complete',
          description: 'Successfully analyzed all documents together',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while analyzing the files',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <VStack spacing={6} w="full">
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
            loadingText="Analyzing Policy Documents..."
          >
            Analyze Policy
          </Button>
        </VStack>
      )}

      {isAnalyzing && (
        <Box w="full">
          <Text mb={2} textAlign="center">Analyzing all documents together...</Text>
          <Progress size="xs" isIndeterminate colorScheme="blue" />
        </Box>
      )}

      {analysisResult && (
        <VStack w="full" spacing={4}>
          <Divider />
          <Text fontWeight="bold" fontSize="lg">
            Policy Analysis Result
          </Text>
          <Card w="full" bg={cardBg}>
            <CardBody>
              <Text whiteSpace="pre-wrap" fontFamily="monospace">
                {analysisResult.content}
              </Text>
            </CardBody>
          </Card>
        </VStack>
      )}
    </VStack>
  );
};