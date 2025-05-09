import {
  Box,
  Container,
  Text,
  VStack,
  Button,
  Heading,
  useColorModeValue,
  Flex,
  HStack,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Image,
  useDisclosure,
} from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiInfo } from 'react-icons/fi';
import { motion } from 'framer-motion';
import PageBackground from '../components/PageBackground';
import { FileUpload } from '../components/FileUpload';
import HowItWorksModal from '../components/HowItWorksModal';

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const accentColor = useColorModeValue('blue.500', 'blue.300');
  
  return (
    <PageBackground>
      <Box minH="100vh" bg={bgColor}>
        {/* Navbar - Simplified */}
        <Flex
          as="nav"
          align="center"
          justify="center"
          w="100%"
          py={3}
          px={8}
          bg={cardBg}
          color={textColor}
          shadow="sm"
          position="sticky"
          top={0}
          zIndex={100}
        >
          <Heading size="md" fontWeight="bold" color={accentColor}>
            MIAssured
          </Heading>
        </Flex>

        {/* Main Content */}
        <Container maxW="container.xl" py={10}>
          <VStack spacing={12} align="stretch">
            {/* Header Section */}
            <MotionBox
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={8} alignItems="center">
                <GridItem>
                  <VStack align="flex-start" spacing={4}>
                    <Heading size="xl" color={textColor}>
                      Insurance Document Analysis
                    </Heading>
                    <Text fontSize="lg" color={useColorModeValue('gray.600', 'gray.400')}>
                      Upload your insurance documents for AI-powered analysis and get comprehensive insights about your policy.
                    </Text>
                    <HStack spacing={4} pt={2}>
                      <Button 
                        as="a" 
                        href="#upload-section"
                        colorScheme="blue"
                        size="md"
                        leftIcon={<FiUpload />}
                      >
                        Upload Documents
                      </Button>
                      <Button
                        variant="outline"
                        colorScheme="blue"
                        size="md"
                        leftIcon={<FiInfo />}
                        onClick={onOpen}
                      >
                        How It Works
                      </Button>
                    </HStack>
                  </VStack>
                </GridItem>
                <GridItem display={{ base: "none", md: "block" }}>
                  <Flex justify="center">
                    <Image 
                      src="/illustration.svg" 
                      alt="AI Insurance Analysis" 
                      fallbackSrc="https://via.placeholder.com/400x300?text=AI+Insurance+Analysis"
                      maxH="300px"
                      objectFit="contain"
                    />
                  </Flex>
                </GridItem>
              </Grid>
            </MotionBox>

            {/* Stats Section */}
            <MotionBox
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Grid 
                templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} 
                gap={6}
                p={4}
                bg={cardBg}
                borderRadius="lg"
                shadow="md"
              >
                <Stat p={4} borderRadius="md" bg={useColorModeValue('blue.50', 'blue.900')} borderLeft="4px solid" borderColor="blue.400">
                  <StatLabel fontSize="sm" color={useColorModeValue('gray.600', 'gray.400')}>Supported Insurance Types</StatLabel>
                  <StatNumber fontSize="2xl" fontWeight="bold">10+</StatNumber>
                  <StatHelpText fontSize="xs">Health, Life, Auto & more</StatHelpText>
                </Stat>
                <Stat p={4} borderRadius="md" bg={useColorModeValue('green.50', 'green.900')} borderLeft="4px solid" borderColor="green.400">
                  <StatLabel fontSize="sm" color={useColorModeValue('gray.600', 'gray.400')}>Analysis Speed</StatLabel>
                  <StatNumber fontSize="2xl" fontWeight="bold">~2 Minutes</StatNumber>
                  <StatHelpText fontSize="xs">For typical policy documents</StatHelpText>
                </Stat>
                <Stat p={4} borderRadius="md" bg={useColorModeValue('purple.50', 'purple.900')} borderLeft="4px solid" borderColor="purple.400">
                  <StatLabel fontSize="sm" color={useColorModeValue('gray.600', 'gray.400')}>AI Confidence Level</StatLabel>
                  <StatNumber fontSize="2xl" fontWeight="bold">95%+</StatNumber>
                  <StatHelpText fontSize="xs">Advanced AI Technology</StatHelpText>
                </Stat>
              </Grid>
            </MotionBox>

            {/* Upload Section */}
            <MotionBox
              id="upload-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              bg={cardBg}
              p={8}
              borderRadius="lg"
              shadow="md"
              borderTop="4px solid"
              borderColor={accentColor}
            >
              <Heading size="md" mb={6} color={textColor}>
                Upload Your Insurance Documents
              </Heading>
              <FileUpload />
            </MotionBox>
          </VStack>
        </Container>

        {/* How It Works Modal */}
        <HowItWorksModal isOpen={isOpen} onClose={onClose} />
      </Box>
    </PageBackground>
  );
}; 