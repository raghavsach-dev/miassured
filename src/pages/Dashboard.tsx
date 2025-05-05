import {
  Box,
  Container,
  Card,
  CardBody,
  Text,
  HStack,
  VStack,
  Icon,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  useToast,
  Heading,
  useColorModeValue,
} from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FiLogOut, FiChevronDown } from 'react-icons/fi';
import { motion } from 'framer-motion';
import PageBackground from '../components/PageBackground';
import { FileUpload } from '../components/FileUpload';

const MotionBox = motion(Box);

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const textColor = useColorModeValue('gray.800', 'gray.100');

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const handleAnalyze = () => {
    toast({
      title: "Analysis Started",
      description: "Your documents are being processed. This may take a few minutes.",
      status: "info",
      duration: 5000,
      isClosable: true,
    });
  };

  return (
    <PageBackground>
      <Box minH="100vh" bg={bgColor} py={8}>
        <Container maxW="container.xl">
          <VStack spacing={8} align="stretch">
            <Box>
              <Heading size="lg" mb={2} color={textColor}>
                Insurance Document Analysis
              </Heading>
              <Text color={useColorModeValue('gray.600', 'gray.400')}>
                Upload your insurance documents for AI-powered analysis
              </Text>
            </Box>
            
            <Box
              bg={useColorModeValue('white', 'gray.800')}
              p={6}
              borderRadius="lg"
              shadow="base"
            >
              <FileUpload />
            </Box>
          </VStack>
        </Container>
      </Box>
    </PageBackground>
  );
} 