import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  Text,
  Box,
  Flex,
  Circle,
  Divider,
  useColorModeValue,
  Icon,
  Heading,
} from '@chakra-ui/react';
import { FiUpload, FiSearch, FiFileText, FiCheckCircle, FiBarChart2 } from 'react-icons/fi';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProcessStep = ({ icon, title, description, isLast = false }: { 
  icon: React.ReactElement; 
  title: string; 
  description: string;
  isLast?: boolean;
}) => {
  const lineColor = useColorModeValue('blue.100', 'blue.800');
  const circleColor = useColorModeValue('blue.500', 'blue.400');
  const bgColor = useColorModeValue('blue.50', 'blue.900');
  
  return (
    <Flex align="center" w="full">
      <Flex 
        direction="column" 
        align="center"
        position="relative"
      >
        <Circle size="40px" bg={circleColor} color="white">
          {icon}
        </Circle>
        {!isLast && (
          <Box 
            h="50px" 
            w="2px" 
            bg={lineColor} 
            mt="2"
          />
        )}
      </Flex>
      <Box ml={4} flex="1" pb={isLast ? 0 : 8}>
        <Heading size="sm" mb={1}>{title}</Heading>
        <Text fontSize="sm" color="gray.600">{description}</Text>
      </Box>
    </Flex>
  );
};

const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay backdropFilter="blur(2px)" />
      <ModalContent bg={bgColor}>
        <ModalHeader>How Our Insurance Document Analysis Works</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <Text mb={4}>
              Our advanced AI-powered system analyzes your insurance documents in multiple steps to provide comprehensive insights:
            </Text>
            
            <ProcessStep
              icon={<Icon as={FiUpload} />}
              title="Document Upload"
              description="Upload your insurance policy documents in PDF format. We accept multiple files for a single policy."
            />
            
            <ProcessStep
              icon={<Icon as={FiFileText} />}
              title="Document Processing"
              description="Our AI technology reads and processes your documents, understanding complex policy language and structure."
            />
            
            <ProcessStep
              icon={<Icon as={FiSearch} />}
              title="Detailed Analysis"
              description="Multiple specialized analysis modules examine different aspects of your policy, from coverage and benefits to exclusions and obligations."
            />
            
            <ProcessStep
              icon={<Icon as={FiBarChart2} />}
              title="Structured Results"
              description="Analysis results are converted into clear, structured data with visual charts and organized information."
            />
            
            <ProcessStep
              icon={<Icon as={FiCheckCircle} />}
              title="Interactive Review"
              description="Review your comprehensive policy analysis and ask follow-up questions through our interactive chat interface."
              isLast
            />
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default HowItWorksModal; 