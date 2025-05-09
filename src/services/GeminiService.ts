import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import { db } from '../firebase/config';
import { doc, setDoc, getDoc, collection, SetOptions, DocumentReference } from 'firebase/firestore';

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

export interface PromptResponse {
  promptName: string;
  response: string;
  timestamp: Date;
}

interface PromptProcessingResult {
  promptName: string;
  content?: unknown;
  error?: string;
  timestamp: Date;
}

export class GeminiService {
  private model: GenerativeModel;
  private chat: ChatSession | null = null;
  private parentPrompt: string | null = null;
  private prompts: Map<string, string> = new Map();
  private models: Map<string, GenerativeModel> = new Map();
  private chats: Map<string, ChatSession> = new Map();
  private promptLoadingPromise: Promise<void>;
  private conversationHistory: ChatMessage[] = [];
  private promptResponses: PromptResponse[] = [];
  private documentContext: any = null;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    this.promptLoadingPromise = this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      // Load prompts first
      await this.loadPrompts();
      
      // Initialize models after prompts are loaded
      this.prompts.forEach((_, promptName) => {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        this.models.set(promptName, model);
      });

      // Initialize main chat
      this.initializeChats('');
    } catch (error) {
      console.error('Failed to initialize service:', error);
      throw error;
    }
  }

  private async loadPrompts() {
    try {
      // Load the parent prompt
      const parentResponse = await fetch('/prompts/parent.txt');
      if (!parentResponse.ok) {
        throw new Error(`Failed to load parent prompt: ${parentResponse.statusText}`);
      }
      this.parentPrompt = await parentResponse.text();

      // Load all other prompts
      const promptFiles = [
        'policyvariants.txt',
        'policydesign.txt',
        'permanentexclusions.txt',
        'hospitalizationexpensecoverage.txt',
        'maternityfeatures.txt',
        'premiumreduction.txt',
        'treatmentcoverage.txt',
        'nontreatmentbenefits.txt',
        'optionalbenefits.txt',
        'policyholderobligations.txt',
        'benefitshavingsublimits.txt',
        'exclusionswithwaitingperiods.txt',
        'sienhancement.txt'
      ];

      for (const file of promptFiles) {
        const response = await fetch(`/prompts/${file}`);
        if (!response.ok) {
          console.error(`Failed to load prompt ${file}: ${response.statusText}`);
          continue;
        }
        const promptText = await response.text();
        this.prompts.set(file.replace('.txt', ''), promptText);
      }
    } catch (error) {
      console.error('Error loading prompts:', error);
      throw new Error('Failed to load analysis prompts');
    }
  }

  private initializeChats(parentContext: string) {
    // Initialize main chat for parent prompt
    this.chat = this.model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 8192,
      },
    });

    // Initialize separate chats for each prompt with shared context
    this.prompts.forEach((_, promptName) => {
      const model = this.models.get(promptName);
      if (model) {
        const chat = model.startChat({
          history: [{ role: 'user', parts: [{ text: parentContext }] }],
          generationConfig: {
            maxOutputTokens: 8192,
          },
        });
        this.chats.set(promptName, chat);
      }
    });
  }

  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  getPromptResponses(): PromptResponse[] {
    return [...this.promptResponses];
  }

  clearConversationHistory() {
    this.conversationHistory = [];
    this.promptResponses = [];
    this.initializeChats('');  // Initialize with empty context
  }

  private async retryableFirestoreOperation<T>(
    operation: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    const delayMs = 1000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if it's a client-blocked error
        if (lastError.message.includes('ERR_BLOCKED_BY_CLIENT')) {
          console.warn(`⚠️ Firestore connection blocked by client (attempt ${attempt}/${maxRetries}). This may be caused by an ad blocker or security extension.`);
        }
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
      }
    }
    
    throw lastError || new Error('Operation failed after retries');
  }

  // Modify the setDoc calls to use the retry logic
  private async safeSetDoc(
    docRef: DocumentReference,
    data: Record<string, unknown>
  ): Promise<void> {
    return this.retryableFirestoreOperation(async () => {
      try {
        const shouldMerge = '_merge' in data;
        delete data._merge; // Remove our internal flag
        
        const options: SetOptions = shouldMerge ? { merge: true } : { merge: false };
        await setDoc(docRef, {
          ...data,
          lastAttempt: new Date().toISOString()
        }, options);
      } catch (error) {
        if (error instanceof Error && error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
          console.error(`
⚠️ Firestore Connection Blocked
This error is typically caused by:
1. Ad blockers (like uBlock Origin)
2. Security extensions
3. Corporate firewalls

Please try:
- Disabling ad blockers for this site
- Adding firestore.googleapis.com to allowed domains
- Checking network security settings
          `);
        }
        throw error;
      }
    }, 3);
  }

  private async retryableGeminiOperation<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    initialDelayMs = 2000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if it's a model overload error or service unavailable
        if (lastError.message.includes('503') || 
            lastError.message.includes('overloaded') || 
            lastError.message.includes('Service Unavailable')) {
          const delayMs = initialDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
          const maxDelay = 10000; // Cap at 10 seconds
          const actualDelay = Math.min(delayMs, maxDelay);
          
          console.warn(`⚠️ Gemini model overloaded (attempt ${attempt}/${maxRetries}). Waiting ${actualDelay}ms before retry...`);
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, actualDelay));
            continue;
          }
        }
        
        // If we've exhausted retries or it's not a retryable error, throw
        if (attempt === maxRetries) {
          console.error(`❌ Failed after ${maxRetries} attempts:`, lastError);
          throw new Error(`Operation failed after ${maxRetries} retries: ${lastError.message}`);
        }
        throw lastError;
      }
    }
    
    throw lastError || new Error('Operation failed after retries');
  }

  private async processParentContext(parentResult: string): Promise<string> {
    try {
      // Try to parse any JSON content from the response
      const jsonMatch = parentResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const cleanedJson = this.cleanJsonText(jsonMatch[0]);
        // Validate the JSON structure
        const parsed = JSON.parse(cleanedJson);
        return JSON.stringify(parsed);
      }
      
      console.warn("Could not find valid JSON in parent context response");
      return JSON.stringify({
        documentType: "",
        policyDetails: {
          name: "",
          type: "",
          provider: "",
          category: ""
        },
        keyFeatures: [],
        mainCoverages: [],
        importantExclusions: [],
        waitingPeriods: {
          initial: "",
          preExisting: "",
          specificDiseases: ""
        },
        sumInsuredOptions: []
      });
    } catch (error) {
      console.error("Error processing parent context:", error);
      return JSON.stringify({
        documentType: "",
        policyDetails: {
          name: "",
          type: "",
          provider: "",
          category: ""
        },
        keyFeatures: [],
        mainCoverages: [],
        importantExclusions: [],
        waitingPeriods: {
          initial: "",
          preExisting: "",
          specificDiseases: ""
        },
        sumInsuredOptions: []
      });
    }
  }

  private cleanJsonText(text: string): string {
    try {
      // 1. Extract the largest JSON block (even if incomplete)
      let jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      let jsonContent = jsonMatch ? jsonMatch[1].trim() : text.trim();
      if (!jsonMatch) {
        // Try to find the largest {...} or [...] block
        const curly = text.lastIndexOf('{');
        const square = text.lastIndexOf('[');
        if (curly !== -1 && curly < text.length - 1) {
          jsonContent = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1 || undefined);
        } else if (square !== -1 && square < text.length - 1) {
          jsonContent = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1 || undefined);
        } else {
          jsonContent = text.trim();
        }
      }

      // 2. Remove leading/trailing junk
      jsonContent = jsonContent.replace(/^[^\[{]*(\[|\{)/, '$1');
      jsonContent = jsonContent.replace(/(\}|\])[^\]}]*$/, '$1');

      // 3. Try to fix truncated JSON (close open braces/brackets)
      const openCurly = (jsonContent.match(/\{/g) || []).length;
      const closeCurly = (jsonContent.match(/\}/g) || []).length;
      const openSquare = (jsonContent.match(/\[/g) || []).length;
      const closeSquare = (jsonContent.match(/\]/g) || []).length;
      let fixed = jsonContent;
      if (openCurly > closeCurly) fixed += '}'.repeat(openCurly - closeCurly);
      if (openSquare > closeSquare) fixed += ']'.repeat(openSquare - closeSquare);

      // 4. Remove trailing commas (common AI bug)
      fixed = fixed.replace(/,\s*([}\]])/g, '$1');

      // 5. Try to parse and re-stringify
      try {
        const parsed = JSON.parse(fixed);
        return JSON.stringify(parsed);
      } catch (e) {
        // Try to parse as an array or object if possible
        if (fixed.startsWith('[')) {
          try {
            const arr = JSON.parse(fixed + ']'.repeat(openSquare - closeSquare));
            return JSON.stringify(arr);
          } catch {}
        }
        if (fixed.startsWith('{')) {
          try {
            const obj = JSON.parse(fixed + '}'.repeat(openCurly - closeCurly));
            return JSON.stringify(obj);
          } catch {}
        }
        // Fallback: return the best effort cleaned text
        console.warn('Failed to parse JSON after cleaning');
        return fixed;
      }
    } catch (error) {
      console.warn('JSON cleaning failed:', error);
      return text;
    }
  }

  private async safeParseJSON(text: string, promptName: string): Promise<PromptProcessingResult> {
    try {
      // Clean and normalize the JSON text
      const cleanedText = this.cleanJsonText(text);
      
      // Try parsing the cleaned JSON directly
      try {
        const parsed = JSON.parse(cleanedText);
        return {
          promptName,
          content: parsed,
          timestamp: new Date()
        };
      } catch {
        // If direct parsing fails, try wrapping in an object with the prompt name
        try {
          // Ensure the content is a valid JSON object
          const wrappedContent = cleanedText.trim().startsWith('{') 
            ? `{"${promptName}":${cleanedText}}`
            : `{"${promptName}":{"content":${cleanedText}}}`;
            
          const parsed = JSON.parse(wrappedContent);
          return {
            promptName,
            content: parsed[promptName],
            timestamp: new Date()
          };
        } catch {
          // If both parsing attempts fail, store the cleaned text with error info
          return {
            promptName,
            content: {
              rawContent: cleanedText,
              parsingError: "Failed to parse JSON content",
              attemptedParse: true
            },
            error: "JSON parsing failed",
            timestamp: new Date()
          };
        }
      }
    } catch (error) {
      // Handle any unexpected errors during the entire process
      console.error(`Error processing JSON for ${promptName}:`, error);
      return {
        promptName,
        content: {
          rawContent: text,
          parsingError: error instanceof Error ? error.message : "Unknown error",
          attemptedParse: true
        },
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date()
      };
    }
  }

  async analyzeInsuranceDocuments(
    files: File[], 
    userEmail: string, 
    policyIndex: number = 1
  ): Promise<AnalysisResult> {
    try {
      // Wait for service initialization
      await this.promptLoadingPromise;
      
      if (!this.parentPrompt || !this.chat) {
        throw new Error("Service not properly initialized");
      }

      // Reset state for new analysis
      this.conversationHistory = [];
      this.promptResponses = [];

      // Convert files to base64 for Gemini
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

      console.log("Starting document analysis with Gemini AI...");
      
      // Process parent prompt with enhanced context extraction
      const parentResult = await this.retryableGeminiOperation(async () => {
        const response = await this.chat!.sendMessage([
          ...fileContents,
          { text: `Please analyze these insurance documents and provide a comprehensive summary including:
1. Document type and purpose
2. Policy name and provider
3. Key features and benefits
4. Main coverages
5. Important exclusions and limitations
6. Any special conditions or requirements

${this.parentPrompt!}` }
        ]);
        return response.response;
      });
      
      const parentContext = await this.processParentContext(await parentResult.text());
      console.log("✅ Initial document analysis complete with parent prompt");
      console.log("Parent Context:", parentContext);

      // Create the path structure for storage
      const sanitizedEmail = userEmail.replace(/\./g, ',');
      const userDoc = `users/${sanitizedEmail}`;
      const policyDoc = `policies/policy${policyIndex}`;
      console.log(`Storage path: ${userDoc}/${policyDoc}`);
      
      // Initialize summary document
      try {
        const summaryDocRef = doc(db, userDoc, 'policies', `policy${policyIndex}`, 'documents', '_summary');
        await this.safeSetDoc(summaryDocRef, {
          totalPrompts: this.prompts.size,
          promptNames: Array.from(this.prompts.keys()),
          startTime: new Date().toISOString(),
          userEmail: userEmail,
          status: "in_progress",
          parentContext: JSON.parse(parentContext) // Parse the parent context before storing
        });
        console.log("✅ Created summary document to initialize path");
      } catch (initError) {
        console.error("❌ Failed to initialize storage path:", initError);
      }

      // Process all specialized prompts in parallel with context
      console.log(`Processing ${this.prompts.size} specialized prompts in parallel...`);
      
      const promptProcessingPromises = Array.from(this.prompts.entries()).map(
        async ([promptName, promptText]) => {
          try {
            console.log(`Starting prompt: ${promptName}`);
            
            const chat = this.chats.get(promptName);
            if (!chat) {
              throw new Error(`Chat session not found for prompt: ${promptName}`);
            }

            // Send the prompt with context and files
            const promptResult = await this.retryableGeminiOperation(async () => {
              const fullPrompt = `
Context from document analysis:
${parentContext}

Based on the above context and the provided documents, ${promptText}

Please ensure your response:
1. Is in valid JSON format
2. Includes all relevant information from the documents
3. Follows the exact structure specified in the prompt
4. Uses null or empty arrays/strings if information is not available
`;
              const response = await chat.sendMessage([
                ...fileContents,
                { text: fullPrompt }
              ]);
              return response.response;
            });

            const result = await this.processPromptResponse(promptName, await promptResult.text(), userDoc, policyIndex);
            return result;
          } catch (error) {
            console.error(`❌ Error processing prompt ${promptName}:`, error);
            
            // Store error state in Firestore
            const promptDocRef = doc(db, userDoc, 'policies', `policy${policyIndex}`, 'documents', promptName);
            await this.safeSetDoc(promptDocRef, {
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
              status: 'error'
            });
            
            return {
              promptName,
              error: error instanceof Error ? error.message : "Unknown error",
              content: null,
              timestamp: new Date()
            } as PromptProcessingResult;
          }
        }
      );

      // Wait for all prompts to complete
      const results = await Promise.allSettled(promptProcessingPromises);
      
      console.log("All prompts processed!");
      console.log(`Total prompts processed: ${results.length}`);
      
      // Update summary document
      try {
        const summaryDocRef = doc(db, userDoc, 'policies', `policy${policyIndex}`, 'documents', '_summary');
        await this.safeSetDoc(summaryDocRef, {
          completedAt: new Date().toISOString(),
          status: "completed",
          _merge: true
        });
        console.log("✅ Updated summary document with completion status");
      } catch (summaryUpdateError) {
        console.error("❌ Failed to update summary:", summaryUpdateError);
      }

      // Process and return results
      const processedResults = await this.processPromptResults(results);
      console.log('Final processed results:', processedResults);
      
      return { 
        content: JSON.stringify({
          parentContext,
          results: processedResults
        }, null, 2)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during analysis';
      console.error('Error analyzing documents:', error);
      return { content: JSON.stringify({ error: errorMessage }, null, 2) };
    }
  }

  setDocumentContext(context: any) {
    this.documentContext = context;
    // Initialize a new chat session with the context
    this.chat = this.model.startChat({
      history: [{
        role: 'user',
        parts: [{ text: `Here is the analyzed insurance policy document context that you should use to answer questions:
${JSON.stringify(context, null, 2)}

Instructions for answering questions:
1. ALWAYS provide responses in clear, natural language text format
2. Use proper Markdown formatting for better readability:
   - Use **bold** for important terms and key points
   - Use bullet points or numbered lists for multiple items
   - Use ### for section headings
   - Use > for important quotes or notes
   - Use \`code\` formatting for specific policy values or limits
   - Use --- for separating different sections
3. Structure your responses for clarity:
   - Start with a direct answer
   - Follow with relevant details
   - End with any important notes or caveats
4. When citing policy details:
   - Bold the section name: **Section: Policy Benefits**
   - Use bullet points for listing features
   - Use \`code\` for specific amounts or limits
5. Keep responses concise but informative
6. If information isn't available, clearly state that
7. Use conversational, easy-to-understand language

Please confirm you understand these formatting instructions by responding with a brief acknowledgment.` }]
      }],
      generationConfig: {
        maxOutputTokens: 8192,
      },
    });

    // Get initial confirmation from the AI
    this.retryableGeminiOperation(async () => {
      const response = await this.chat!.sendMessage("Please confirm you're ready to help with questions about the insurance policy, using proper formatting.");
      return response.response.text();
    });
  }

  async followUpQuestion(question: string): Promise<AnalysisResult> {
    try {
      if (!this.documentContext) {
        return {
          content: "I don't have access to the analyzed document context. Please provide the document analysis results first."
        };
      }

      if (!this.chat) {
        this.chat = this.model.startChat({
          history: [{
            role: 'user',
            parts: [{ text: `Here is the analyzed insurance policy document context that you should use to answer questions:
${JSON.stringify(this.documentContext, null, 2)}

Instructions for answering questions:
1. ALWAYS provide responses in clear, natural language text format
2. Use proper Markdown formatting for better readability:
   - Use **bold** for important terms and key points
   - Use bullet points or numbered lists for multiple items
   - Use ### for section headings
   - Use > for important quotes or notes
   - Use \`code\` formatting for specific policy values or limits
   - Use --- for separating different sections
3. Structure your responses for clarity:
   - Start with a direct answer
   - Follow with relevant details
   - End with any important notes or caveats
4. When citing policy details:
   - Bold the section name: **Section: Policy Benefits**
   - Use bullet points for listing features
   - Use \`code\` for specific amounts or limits
5. Keep responses concise but informative
6. If information isn't available, clearly state that
7. Use conversational, easy-to-understand language` }]
          }],
          generationConfig: {
            maxOutputTokens: 8192,
          },
        });
      }

      // Format the question with context reminder
      const formattedQuestion = `Please answer the following question about the insurance policy:
${question}

Remember to use proper Markdown formatting:
- **Bold** for important terms
- Bullet points for lists
- ### for headings
- > for important notes
- \`code\` for specific values
- Clear structure and organization`;

      const result = await this.retryableGeminiOperation(async () => {
        const response = await this.chat!.sendMessage(formattedQuestion);
        const text = await response.response.text();
        return text;
      });

      return {
        content: result
      };
    } catch (error) {
      console.error('Error in followUpQuestion:', error);
      throw error;
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

  private async processPromptResponse(
    promptName: string,
    responseText: string,
    userDoc: string,
    policyIndex: number
  ): Promise<PromptProcessingResult> {
    try {
      // Log the raw response for debugging
      console.log(`Raw response for ${promptName}:`, responseText);

      const parsedResponse = await this.safeParseJSON(responseText, promptName);
      
      // Validate the parsed response
      if (!parsedResponse || (!parsedResponse.content && !parsedResponse.error)) {
        throw new Error('Invalid response structure');
      }

      // Store the response in memory with full content
      this.promptResponses.push({
        promptName,
        response: responseText, // Store raw response text
        timestamp: new Date()
      });
      
      // Store in Firestore with proper structure
      const promptDocRef = doc(db, userDoc, 'policies', `policy${policyIndex}`, 'documents', promptName);
      await this.safeSetDoc(promptDocRef, {
        content: parsedResponse.content || null,
        error: parsedResponse.error || null,
        rawResponse: responseText,
        timestamp: new Date().toISOString(),
        status: parsedResponse.error ? 'error' : 'success'
      });

      console.log(`✅ Successfully processed and stored prompt: ${promptName}`);
      
      return {
        promptName,
        content: parsedResponse.content,
        error: parsedResponse.error,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Error processing prompt ${promptName}:`, error);
      
      // Store error state in Firestore
      const promptDocRef = doc(db, userDoc, 'policies', `policy${policyIndex}`, 'documents', promptName);
      await this.safeSetDoc(promptDocRef, {
        error: error instanceof Error ? error.message : 'Unknown error',
        rawResponse: responseText,
        timestamp: new Date().toISOString(),
        status: 'error'
      });

      return {
        promptName,
        error: error instanceof Error ? error.message : 'Unknown error',
        content: null,
        timestamp: new Date()
      };
    }
  }

  private async processPromptResults(results: PromiseSettledResult<PromptProcessingResult>[]): Promise<Record<string, PromptProcessingResult>> {
    const processedResults = results.reduce((acc, result) => {
      if (result.status === 'fulfilled') {
        const promptResult = result.value;
        // Ensure we're storing the full result including any error information
        acc[promptResult.promptName] = {
          promptName: promptResult.promptName,
          content: promptResult.content,
          error: promptResult.error,
          timestamp: promptResult.timestamp
        };
      } else {
        // Handle rejected promises
        console.error('Promise rejected:', result.reason);
      }
      return acc;
    }, {} as Record<string, PromptProcessingResult>);

    // Log the final processed results for debugging
    console.log('Final processed results:', processedResults);
    
    return processedResults;
  }

  async testFirestoreConnection(userEmail: string): Promise<{ success: boolean; message: string }> {
    try {
      // Test basic authentication state
      const sanitizedEmail = userEmail.replace(/\./g, ',');
      console.log("Testing Firestore connection for:", sanitizedEmail);
      
      // Test operation 1: Write to root level collection (should be allowed)
      try {
        console.log("Testing write to public collection...");
        const publicTestRef = doc(collection(db, "connection_tests"), sanitizedEmail);
        await setDoc(publicTestRef, { 
          email: userEmail,
          timestamp: new Date().toISOString(),
          test: "public_write"
        });
        console.log("✅ Public write successful");
      } catch (publicWriteError) {
        console.error("❌ Public write failed:", publicWriteError);
        return { 
          success: false, 
          message: `Basic write test failed: ${publicWriteError instanceof Error ? publicWriteError.message : "Unknown error"}. Please check your Firebase configuration and network connection.`
        };
      }
      
      // Test operation 2: Write to user's specific path
      try {
        console.log(`Testing write to user path: ${sanitizedEmail}...`);
        const userDocRef = doc(db, sanitizedEmail, "connection_test");
        await setDoc(userDocRef, { 
          test: "user_write",
          timestamp: new Date().toISOString()
        });
        console.log("✅ User-specific write successful");
        
        // Test operation 3: Read from user's specific path
        try {
          console.log("Testing read from user path...");
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            console.log("✅ User-specific read successful");
          } else {
            console.log("❌ Document exists but content is missing");
            return {
              success: false,
              message: "Document was created but could not be read back properly. This may indicate a permission issue."
            };
          }
        } catch (readError) {
          console.error("❌ User-specific read failed:", readError);
          return {
            success: false,
            message: `Read permission test failed: ${readError instanceof Error ? readError.message : "Unknown error"}. This suggests your Firebase rules may not allow reading from the user's path.`
          };
        }
      } catch (userWriteError) {
        console.error("❌ User-specific write failed:", userWriteError);
        // Detailed error checking
        const errorMsg = userWriteError instanceof Error ? userWriteError.message : "Unknown error";
        if (errorMsg.includes("permission-denied")) {
          return {
            success: false,
            message: "Firebase security rules are preventing write access to your user path. Please check your Firestore rules configuration."
          };
        } else {
          return {
            success: false,
            message: `User-specific write test failed: ${errorMsg}. This might be due to Firebase rules or collection/document structure.`
          };
        }
      }
      
      // If we get here, all tests passed
      return { 
        success: true, 
        message: 'Successfully connected to Firestore and verified read/write permissions for your user path.' 
      };
    } catch (error) {
      console.error('Error testing Firestore connection:', error);
      const errorDetails = error instanceof Error ? error.message : 'Unknown error';
      
      // Check for common Firebase errors
      if (errorDetails.includes("quota-exceeded")) {
        return {
          success: false,
          message: "Firebase quota exceeded. Your project may have reached its usage limits."
        };
      } else if (errorDetails.includes("unavailable")) {
        return {
          success: false,
          message: "Firebase service is currently unavailable. Please try again later."
        };
      } else if (errorDetails.includes("unauthenticated")) {
        return {
          success: false,
          message: "Authentication issue with Firebase. You may need to log out and log back in."
        };
      }
      
      return { 
        success: false, 
        message: `Failed to connect to Firestore: ${errorDetails}` 
      };
    }
  }
}

export const geminiService = new GeminiService(); 