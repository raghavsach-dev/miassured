import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  Link as ChakraLink,
  useToast,
  InputGroup,
  InputRightElement,
  IconButton,
  Heading,
  Image,
  Container,
} from '@chakra-ui/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);
const MotionContainer = motion(Container);

interface AuthFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  buttonText: string;
  isLogin?: boolean;
}

export default function AuthForm({ onSubmit, buttonText, isLogin = false }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onSubmit(email, password);
      if (!isLogin) {
        toast({
          title: 'Verification email sent',
          description: 'Please check your email to verify your account',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MotionContainer
      maxW="container.sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <MotionBox
        as="form"
        onSubmit={handleSubmit}
        p={{ base: 6, md: 8 }}
        rounded="2xl"
        shadow="2xl"
        borderWidth="1px"
        borderColor="whiteAlpha.200"
        bg="rgba(0, 0, 0, 0.8)"
        backdropFilter="blur(10px)"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <VStack spacing={8}>
          <Box width="100%" display="flex" justifyContent="center">
            <Image
              src="/logo.png"
              alt="MIAssured"
              fallbackSrc="https://via.placeholder.com/400x120?text=MIAssured"
              height="100px"
              width="600px"
              objectFit="contain"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              as={motion.img}
            />
          </Box>

          <VStack spacing={3} align="center" w="100%">
            <Heading 
              size="xl" 
              color="white"
              fontWeight="bold"
              letterSpacing="tight"
              textAlign="center"
            >
              {isLogin ? "Welcome Back" : "Create Account"}
            </Heading>
            <Text 
              color="whiteAlpha.700" 
              fontSize="lg"
              textAlign="center"
            >
              {isLogin 
                ? "Sign in to access your account" 
                : "Join MIAssured to get started"}
            </Text>
          </VStack>

          <VStack spacing={4} w="100%">
            <FormControl isRequired>
              <FormLabel color="whiteAlpha.900">Email</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                size="lg"
                _placeholder={{ color: 'whiteAlpha.500' }}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel color="whiteAlpha.900">Password</FormLabel>
              <InputGroup size="lg">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  _placeholder={{ color: 'whiteAlpha.500' }}
                />
                <InputRightElement>
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                    onClick={() => setShowPassword(!showPassword)}
                    variant="ghost"
                    color="whiteAlpha.700"
                    _hover={{ color: 'white' }}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <Button
              type="submit"
              size="lg"
              width="100%"
              isLoading={isLoading}
              loadingText="Please wait..."
              fontSize="md"
              py={6}
            >
              {buttonText}
            </Button>
          </VStack>

          <Text color="whiteAlpha.700" fontSize="md" textAlign="center">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <ChakraLink 
              as={Link} 
              to={isLogin ? "/signup" : "/login"} 
              color="brand.400"
              fontWeight="semibold"
              _hover={{ 
                color: 'brand.300',
                textDecoration: "none"
              }}
            >
              {isLogin ? "Sign up" : "Log in"}
            </ChakraLink>
          </Text>
        </VStack>
      </MotionBox>
    </MotionContainer>
  );
} 