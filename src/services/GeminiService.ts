import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export interface AnalysisResult {
  content: string;
  error?: string;
}

export class GeminiService {
  private model: GenerativeModel;
  private chat: ChatSession | null = null;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    this.initializeChat();
  }

  private initializeChat() {
    this.chat = this.model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 8192,
      },
    });
  }

  async analyzeInsuranceDocuments(files: File[]): Promise<AnalysisResult> {
    try {
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

      const fileNames = files.map(f => f.name).join(", ");
      
      const prompt = `I'm providing you with multiple documents (${fileNames}) that are part of the same insurance policy. Please analyze all these documents together and provide a comprehensive analysis including:

1. Coverage Details: 
   - List all coverage provided
   - Specific conditions, procedures, and services covered
   - Coverage limits and sublimits
   - Any special features or benefits

2. Exclusions:
   - List all conditions, procedures, or services explicitly not covered
   - Any specific circumstances where coverage doesn't apply
   - Notable limitations

3. Key Terms and Conditions:
   - Important definitions
   - General conditions and requirements
   - Claim procedures
   - Policy modifications or cancellation terms

4. Waiting Periods:
   - Initial waiting period
   - Disease-specific waiting periods
   - Pre-existing condition waiting periods
   - Any special waiting period conditions

5. Premium Details:
   - Premium calculation factors
   - Payment options and frequencies
   - Grace periods
   - Premium adjustment conditions

Consider all documents together to provide the most accurate and complete analysis. If there are any contradictions between documents, please highlight them. Format the response as a clean JSON object with these exact sections as keys. Do not include any markdown formatting.

Use your chat history to identify any changes or updates in policy terms if these documents are newer versions of previously analyzed policies.`;

      // Send files and prompt to the chat
      const result = await this.chat.sendMessage([...fileContents, { text: prompt }]);
      const response = await result.response;
      let fullText = response.text();

      // Remove any markdown formatting if present
      fullText = fullText.replace(/```json\n?|\n?```/g, '');

      try {
        // Parse and format the JSON response
        const parsedJson = JSON.parse(fullText);
        return { content: JSON.stringify(parsedJson, null, 2) };
      } catch (e) {
        return {
          content: JSON.stringify({
            error: "Invalid JSON response",
            rawContent: fullText
          }, null, 2)
        };
      }
    } catch (error) {
      console.error('Error analyzing documents:', error);
      return {
        content: JSON.stringify({
          error: error instanceof Error ? error.message : 'An error occurred during analysis'
        }, null, 2)
      };
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