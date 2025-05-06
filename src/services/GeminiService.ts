import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import { db } from '../firebase/config';
import { doc, setDoc, getDoc, collection } from 'firebase/firestore';

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

// Define proper types for the Firestore data
interface FirestoreData {
  [key: string]: {
    content?: unknown;
    error?: string;
    rawContent?: string;
    timestamp: Date;
  };
}

export class GeminiService {
  private model: GenerativeModel;
  private chat: ChatSession | null = null;
  private parentPrompt: string | null = null;
  private prompts: Map<string, string> = new Map();
  private promptLoadingPromise: Promise<void>;
  private conversationHistory: ChatMessage[] = [];
  private promptResponses: PromptResponse[] = [];

  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    this.promptLoadingPromise = this.loadPrompts();
    this.initializeChat();
  }

  // Simple function to test Firebase storage without using Gemini credits
  async testFirebaseStorage(userEmail: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log("Testing Firebase storage with simple data...");
      const timestamp = new Date();
      const sanitizedEmail = userEmail.replace(/\./g, ',');
      
      // Try two storage approaches
      try {
        // Approach 1: Store in user's document
        const docRef = doc(db, sanitizedEmail, "test_data");
        await setDoc(docRef, {
          testData: "This is test data",
          timestamp: timestamp.toISOString(),
          randomValue: Math.random().toString(36).substring(2)
        });
        console.log("✅ Successfully stored test data in user document");
      } catch (userDocError) {
        console.error("❌ Failed to store in user document:", userDocError);
        
        // Approach 2: Store in a general collection
        try {
          const generalRef = doc(collection(db, "test_data"), sanitizedEmail);
          await setDoc(generalRef, {
            userEmail,
            timestamp: timestamp.toISOString(),
            randomValue: Math.random().toString(36).substring(2)
          });
          console.log("✅ Successfully stored test data in general collection");
        } catch (generalError) {
          console.error("❌ Failed to store in general collection:", generalError);
          return {
            success: false,
            message: `Failed to store test data: ${generalError instanceof Error ? generalError.message : "Unknown error"}`
          };
        }
      }
      
      return {
        success: true,
        message: "Successfully stored test data in Firebase"
      };
    } catch (error) {
      console.error("Error testing Firebase storage:", error);
      return {
        success: false,
        message: `Failed to store test data: ${error instanceof Error ? error.message : "Unknown error"}`
      };
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

  getPromptResponses(): PromptResponse[] {
    return [...this.promptResponses];
  }

  clearConversationHistory() {
    this.conversationHistory = [];
    this.promptResponses = [];
    this.initializeChat();
  }

  async analyzeInsuranceDocuments(
    files: File[], 
    userEmail: string, 
    policyIndex: number = 1
  ): Promise<AnalysisResult> {
    try {
      // Wait for prompts to be loaded
      await this.promptLoadingPromise;
      
      if (!this.parentPrompt) {
        throw new Error("Parent prompt not loaded");
      }

      // Always start a fresh chat for new document analysis
      this.initializeChat();
      this.promptResponses = [];
      
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

      console.log("Starting document analysis with Gemini AI...");
      // First send the parent prompt to analyze the documents
      const result = await this.chat.sendMessage([...fileContents, { text: this.parentPrompt }]);
      await result.response;
      console.log("✅ Initial document analysis complete with parent prompt");
      
      // Create the path structure for storage once
      const sanitizedEmail = userEmail.replace(/\./g, ',');
      // Create collections and documents path segments
      const userDoc = `users/${sanitizedEmail}`;
      const policyDoc = `policies/policy${policyIndex}`;
      console.log(`Storage path: ${userDoc}/${policyDoc}`);
      
      // First try to create the parent document to ensure the path exists
      try {
        const summaryDocRef = doc(db, userDoc, 'policies', `policy${policyIndex}`, 'documents', '_summary');
        await setDoc(summaryDocRef, {
          totalPrompts: this.prompts.size,
          promptNames: Array.from(this.prompts.keys()),
          startTime: new Date().toISOString(),
          userEmail: userEmail,
          status: "in_progress"
        });
        console.log("✅ Created summary document to initialize path");
      } catch (initError) {
        console.error("❌ Failed to initialize storage path:", initError);
        // Continue anyway - we'll try individual documents
      }
      
      // Store parent analysis (optional)
      try {
        // Create the path structure for storage
        const parentDocRef = doc(db, userDoc, 'policies', `policy${policyIndex}`, 'documents', 'parent_analysis');
        
        await setDoc(parentDocRef, {
          status: "completed",
          timestamp: new Date().toISOString(),
          files: fileNames
        });
        console.log("✅ Stored parent analysis completion status");
      } catch (parentStoreError) {
        console.error("❌ Failed to store parent analysis status:", parentStoreError);
        // Continue anyway - this is just metadata
      }
      
      // Process each prompt and store responses immediately
      const allResponses: FirestoreData = {};
      
      // Log and show processing progress
      console.log(`Processing ${this.prompts.size} specialized prompts sequentially...`);
      
      for (const [promptName, promptText] of this.prompts.entries()) {
        try {
          console.log(`Sending prompt: ${promptName}`);
          
          // Send the prompt to the chat
          const promptResult = await this.chat.sendMessage(promptText);
          const promptResponse = await promptResult.response;
          let responseText = promptResponse.text();
          
          // Remove any markdown formatting if present
          responseText = responseText.replace(/```json\n?|\n?```/g, '');
          
          try {
            // Parse JSON response
            const parsedJson = JSON.parse(responseText);
            const formattedResponse = JSON.stringify(parsedJson, null, 2);
            
            // Store the response in memory
            allResponses[promptName] = {
              content: parsedJson,
              timestamp: new Date()
            };
            
            // Add to prompt responses array
            this.promptResponses.push({
              promptName,
              response: formattedResponse,
              timestamp: new Date()
            });
            
            // Immediately store this prompt response in Firestore
            try {
              const promptDocRef = doc(db, userDoc, 'policies', `policy${policyIndex}`, 'documents', promptName);
              await setDoc(promptDocRef, {
                content: parsedJson,
                timestamp: new Date().toISOString(),
                storedAt: new Date().toISOString(),
                prompt_name: promptName
              });
              console.log(`✅ Successfully stored prompt: ${promptName} immediately after processing`);
            } catch (promptStoreError) {
              console.error(`❌ Failed to store prompt ${promptName}:`, promptStoreError);
              // Continue with other prompts - don't stop analysis
            }
            
            console.log(`✅ Successfully processed prompt: ${promptName}`);
          } catch (jsonError) {
            console.error(`❌ Error parsing JSON from ${promptName} response:`, jsonError);
            allResponses[promptName] = { 
              error: "Invalid JSON response", 
              rawContent: responseText,
              timestamp: new Date()
            };
            
            this.promptResponses.push({
              promptName,
              response: JSON.stringify({ error: "Invalid JSON response", rawContent: responseText }, null, 2),
              timestamp: new Date()
            });
            
            // Still store the error in Firestore
            try {
              const promptDocRef = doc(db, userDoc, 'policies', `policy${policyIndex}`, 'documents', promptName);
              await setDoc(promptDocRef, {
                error: "Invalid JSON response",
                rawContent: responseText,
                timestamp: new Date().toISOString(),
                storedAt: new Date().toISOString(),
                prompt_name: promptName
              });
              console.log(`✅ Successfully stored error for prompt: ${promptName}`);
            } catch (errorStoreError) {
              console.error(`❌ Failed to store error for prompt ${promptName}:`, errorStoreError);
            }
          }
        } catch (promptError) {
          console.error(`❌ Error processing prompt ${promptName}:`, promptError);
          allResponses[promptName] = { 
            error: promptError instanceof Error ? promptError.message : "Unknown error",
            timestamp: new Date()
          };
          
          this.promptResponses.push({
            promptName,
            response: JSON.stringify({ error: promptError instanceof Error ? promptError.message : "Unknown error" }, null, 2),
            timestamp: new Date()
          });
          
          // Store the processing error in Firestore
          try {
            const promptDocRef = doc(db, userDoc, 'policies', `policy${policyIndex}`, 'documents', promptName);
            await setDoc(promptDocRef, {
              error: promptError instanceof Error ? promptError.message : "Unknown error",
              timestamp: new Date().toISOString(),
              storedAt: new Date().toISOString(),
              prompt_name: promptName
            });
            console.log(`✅ Successfully stored processing error for prompt: ${promptName}`);
          } catch (processingErrorStore) {
            console.error(`❌ Failed to store processing error for ${promptName}:`, processingErrorStore);
          }
        }
      }
      
      console.log("All prompts processed successfully!");
      console.log(`Total prompts processed: ${this.promptResponses.length}`);
      
      // Update summary at the end
      try {
        const summaryDocRef = doc(db, userDoc, 'policies', `policy${policyIndex}`, 'documents', '_summary');
        await setDoc(summaryDocRef, {
          totalPrompts: this.promptResponses.length,
          promptNames: this.promptResponses.map(pr => pr.promptName),
          completedAt: new Date().toISOString(),
          status: "completed"
        }, { merge: true });
        console.log("✅ Updated summary document with completion status");
      } catch (summaryUpdateError) {
        console.error("❌ Failed to update summary:", summaryUpdateError);
      }
      
      return { content: JSON.stringify(allResponses, null, 2) };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during analysis';
      console.error('Error analyzing documents:', error);
      return { content: JSON.stringify({ error: errorMessage }, null, 2) };
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