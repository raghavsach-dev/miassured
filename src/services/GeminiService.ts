import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export interface AnalysisResult {
  content: string;
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: string[];
}

export class GeminiService {
  private model: GenerativeModel;
  private chat: ChatSession | null = null;
  private prompt: string | null = null;
  private promptLoadingPromise: Promise<void>;
  private conversationHistory: ChatMessage[] = [];

  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    this.promptLoadingPromise = this.loadPrompt();
    this.initializeChat();
  }

  private async loadPrompt() {
    try {
      const response = await fetch('/prompts/parent.txt');
      if (!response.ok) {
        throw new Error(`Failed to load prompt: ${response.statusText}`);
      }
      this.prompt = await response.text();
    } catch (error) {
      console.error('Error loading prompt:', error);
      throw new Error('Failed to load analysis prompt');
    }
  }

  private initializeChat() {
    this.chat = this.model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 8192,
      },
    });
  }

  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  clearConversationHistory() {
    this.conversationHistory = [];
    this.initializeChat();
  }

  async analyzeInsuranceDocuments(files: File[]): Promise<AnalysisResult> {
    try {
      // Wait for prompt to be loaded
      await this.promptLoadingPromise;
      
      if (!this.prompt) {
        throw new Error("Prompt not loaded");
      }

      // Always start a fresh chat for new document analysis
      this.initializeChat();
      
      if (!this.chat) {
        throw new Error("Failed to initialize chat session");
      }

      // Convert all files to base64 and prepare them for analysis
      const fileContents = await Promise.all(files.map(async file => ({
        inlineData: {
          data: await this.fileToBase64(file),
          mimeType: file.type
        }
      })));

      const fileNames = files.map(f => f.name);

      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: 'Please analyze these insurance documents: ' + fileNames.join(', '),
        timestamp: new Date(),
        files: fileNames
      });

      // Send files and prompt to the chat
      const result = await this.chat.sendMessage([...fileContents, { text: this.prompt }]);
      const response = await result.response;
      let fullText = response.text();

      // Remove any markdown formatting if present
      fullText = fullText.replace(/```json\n?|\n?```/g, '');

      try {
        // Parse and format the JSON response
        const parsedJson = JSON.parse(fullText);
        const formattedResponse = JSON.stringify(parsedJson, null, 2);
        
        // Add assistant response to history
        this.conversationHistory.push({
          role: 'assistant',
          content: formattedResponse,
          timestamp: new Date()
        });

        return { content: formattedResponse };
      } catch (e) {
        const errorResponse = JSON.stringify({
          error: "Invalid JSON response",
          rawContent: fullText
        }, null, 2);

        // Add error response to history
        this.conversationHistory.push({
          role: 'assistant',
          content: errorResponse,
          timestamp: new Date()
        });

        return { content: errorResponse };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during analysis';
      const errorResponse = JSON.stringify({ error: errorMessage }, null, 2);

      // Add error response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: errorResponse,
        timestamp: new Date()
      });

      console.error('Error analyzing documents:', error);
      return { content: errorResponse };
    }
  }

  async followUpQuestion(question: string): Promise<AnalysisResult> {
    try {
      if (!this.chat) {
        throw new Error("Chat session not initialized");
      }

      // Add user question to history
      this.conversationHistory.push({
        role: 'user',
        content: question,
        timestamp: new Date()
      });

      const result = await this.chat.sendMessage(question);
      const response = await result.response;
      const responseText = response.text();

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: responseText,
        timestamp: new Date()
      });

      return { content: responseText };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred processing your question';
      
      // Add error response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      });

      return { content: JSON.stringify({ error: errorMessage }, null, 2) };
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}

export const geminiService = new GeminiService(); 