import { Container, VStack } from '@chakra-ui/react';
import AuthForm from '../components/AuthForm';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PageBackground from '../components/PageBackground';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (email: string, password: string) => {
    await signup(email, password);
    navigate('/login');
  };

  return (
    <PageBackground>
      <Container maxW="container.lg" py={{ base: 10, md: 20 }}>
        <VStack spacing={8} align="center">
          <AuthForm
            onSubmit={handleSignup}
            buttonText="Create Account"
          />
        </VStack>
      </Container>
    </PageBackground>
  );
} 