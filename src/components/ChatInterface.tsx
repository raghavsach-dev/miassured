import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  Input,
  Button,
  Text,
  useToast,
  Flex,
  IconButton,
  Divider,
  Card,
  CardBody,
  Avatar,
  Spinner,
  Heading,
  UnorderedList,
  OrderedList,
  ListItem,
  Code,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { FiSend, FiUser } from 'react-icons/fi';
import { geminiService } from '../services/GeminiService';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  documentContext: any;
  isOpen: boolean;
  messages: Message[];
  onMessagesChange: (messages: Message[]) => void;
}

// Custom renderer components for Markdown with color-aware styling
const MarkdownComponents = {
  h3: (props: any) => <Heading size="md" mt={4} mb={2} color="inherit" {...props} />,
  h4: (props: any) => <Heading size="sm" mt={3} mb={2} color="inherit" {...props} />,
  p: (props: any) => <Text mb={2} color="inherit" {...props} />,
  ul: (props: any) => <UnorderedList mb={2} color="inherit" {...props} />,
  ol: (props: any) => <OrderedList mb={2} color="inherit" {...props} />,
  li: (props: any) => <ListItem color="inherit" {...props} />,
  code: (props: any) => (
    <Code
      px={2}
      py={0.5}
      borderRadius="md"
      bg={props.isUserMessage ? "whiteAlpha.300" : "blue.50"}
      color={props.isUserMessage ? "white" : "blue.800"}
      {...props}
    />
  ),
  hr: () => <Divider my={4} borderColor="inherit" opacity={0.3} />,
  blockquote: (props: any) => (
    <Alert
      status="info"
      variant="left-accent"
      my={2}
      bg={props.isUserMessage ? "whiteAlpha.200" : "blue.50"}
      color={props.isUserMessage ? "white" : "inherit"}
    >
      <AlertIcon />
      <Text color="inherit" {...props} />
    </Alert>
  ),
  strong: (props: any) => (
    <Text
      as="strong"
      fontWeight="bold"
      color={props.isUserMessage ? "white" : "blue.800"}
      {...props}
    />
  ),
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  documentContext, 
  isOpen, 
  messages, 
  onMessagesChange 
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Set document context when component mounts or when context changes
  useEffect(() => {
    if (documentContext) {
      geminiService.setDocumentContext(documentContext);
    }
  }, [documentContext]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add welcome message when chat opens
  useEffect(() => {
    if (messages.length === 0 && documentContext) {
      onMessagesChange([{
        role: 'assistant',
        content: "### Welcome to Policy Assistant! 👋\n\nI've analyzed your insurance policy and I'm ready to help you understand it better. You can ask me anything about:\n\n- Policy coverage and benefits\n- Exclusions and limitations\n- Waiting periods\n- Premium details\n- Claims procedures\n\nI'll provide clear, structured answers based on your policy document.",
        timestamp: new Date()
      }]);
    }
  }, [documentContext, messages.length, onMessagesChange]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    onMessagesChange([...messages, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await geminiService.followUpQuestion(inputMessage);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
      };

      onMessagesChange([...messages, userMessage, assistantMessage]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get response from AI',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <VStack h="100vh" spacing={0}>

      
      <VStack
        flex={1}
        w="100%"
        overflowY="auto"
        p={4}
        spacing={4}
        alignItems="stretch"
        bg="gray.50"
      >
        {messages.map((message, index) => (
          <Flex
            key={index}
            justifyContent={message.role === 'user' ? 'flex-end' : 'flex-start'}
          >
            <Card
              maxW="90%"
              bg={message.role === 'user' ? 'blue.600' : 'white'}
              color={message.role === 'user' ? 'white' : 'gray.800'}
              shadow="md"
              borderRadius="lg"
              borderWidth={message.role === 'assistant' ? "1px" : "0"}
              borderColor="gray.200"
            >
              <CardBody py={3} px={4}>
                {message.role === 'user' ? (
                  <Text fontSize="sm">{message.content}</Text>
                ) : (
                  <Box fontSize="sm">
                    <ReactMarkdown
                      components={{
                        ...MarkdownComponents,
                        code: (props) => MarkdownComponents.code({ ...props, isUserMessage: false }),
                        blockquote: (props) => MarkdownComponents.blockquote({ ...props, isUserMessage: false }),
                        strong: (props) => MarkdownComponents.strong({ ...props, isUserMessage: false })
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </Box>
                )}
              </CardBody>
            </Card>
          </Flex>
        ))}
        {isLoading && (
          <Flex justify="flex-start">
            <Card maxW="90%" bg="white" shadow="md" borderWidth="1px" borderColor="gray.200">
              <CardBody py={3} px={4}>
                <Spinner size="sm" color="blue.500" />
              </CardBody>
            </Card>
          </Flex>
        )}
        <div ref={messagesEndRef} />
      </VStack>

      <Box p={4} width="100%" borderTop="1px" borderColor="gray.200" bg="white">
        <Flex>
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your policy..."
            mr={2}
            borderColor="gray.300"
            _hover={{ borderColor: "blue.400" }}
            _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)" }}
          />
          <IconButton
            colorScheme="blue"
            aria-label="Send message"
            icon={<FiSend />}
            onClick={handleSendMessage}
            isLoading={isLoading}
          />
        </Flex>
      </Box>
    </VStack>
  );
}; 