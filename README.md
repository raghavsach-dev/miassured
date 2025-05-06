# MIAssured - AI Insurance Policy Analysis

MIAssured is an intelligent insurance policy analysis application that uses AI to extract, analyze, and interpret complex insurance policy documents. The system leverages Google's Gemini AI to provide detailed, structured insights about health insurance policies.

## Features

- **User Authentication**: Secure login and signup with Firebase
- **Document Upload**: Easy PDF upload for insurance policies
- **AI-Powered Analysis**: Comprehensive analysis of insurance documents using Google Gemini AI
- **Structured Data Extraction**: Converts complex policy language into structured JSON data
- **Multi-aspect Analysis**: Analyzes various aspects of insurance policies including:
  - Policy variants and plans
  - Policy design (sum insured, coverage types, etc.)
  - Hospitalization expense coverage
  - Permanent exclusions
  - Maternity benefits
  - Treatment coverage
  - Premium reduction options
  - And many more
- **Data Storage**: Analysis results stored in Firebase Firestore for future reference

## Technology Stack

- **Frontend**: React with TypeScript
- **UI Framework**: Chakra UI
- **Build Tool**: Vite
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore
- **AI**: Google Generative AI (Gemini 2.0)

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase account
- Google AI API key

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/miassured.git
   cd miassured
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add your API keys
   ```
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

4. Start the development server
   ```
   npm run dev
   ```

## How It Works

1. **Document Upload**: Users upload their insurance policy PDFs.
2. **Initial Analysis**: The system sends the documents to Gemini AI with a parent prompt to understand the entire document.
3. **Detailed Analysis**: The system then sends a series of specialized prompts to extract specific information about different aspects of the policy.
4. **Structured Output**: Each prompt response is parsed and stored as structured JSON data.
5. **Data Storage**: All analysis results are stored in Firestore using the structure: `/{userEmail}/Policy{Index}/{promptResponses}`.

## Prompts System

The application uses a series of specialized prompts to analyze different aspects of insurance policies:

- `parent.txt` - Initial prompt to analyze the entire document
- `policyvariants.txt` - Analyzes different policy plans and variants
- `policydesign.txt` - Examines policy structure, sum insured options, and eligibility
- `permanentexclusions.txt` - Identifies permanent exclusions
- `hospitalizationexpensecoverage.txt` - Details hospitalization coverage
- `maternityfeatures.txt` - Analyzes maternity-related benefits
- And many more topic-specific prompts

Each prompt instructs the AI to focus on a specific aspect of the policy and return a structured JSON response.

## License

[MIT License](LICENSE)

## Contact

For questions or support, please contact [your-email@example.com](mailto:your-email@example.com).
