import { Container, VStack } from '@chakra-ui/react';
import AuthForm from '../components/AuthForm';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PageBackground from '../components/PageBackground';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    navigate('/dashboard');
  };

  return (
    <PageBackground>
      <Container maxW="container.lg" h="100%">
        <VStack spacing={0} align="center" h="100%">
          <AuthForm
            onSubmit={handleLogin}
            buttonText="Sign In"
            isLogin
          />
        </VStack>
      </Container>
    </PageBackground>
  );
} 