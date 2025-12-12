import { credentialService } from "../services/credential-service.js";

/**
 * Helper function to get API credentials from database or environment
 * Falls back to environment variables if no database credential is found
 * 
 * @param provider - Provider name (gemini, openai, anthropic, etc.)
 * @param envVarName - Environment variable name to use as fallback
 * @returns API key or null if not found
 */
export async function getAPICredential(
    provider: string,
    envVarName: string
): Promise<string | null> {
    try {
        // Try to get from database first
        const credential = await credentialService.getCredentialByProvider(provider.toLowerCase());

        if (credential?.apiKey) {
            console.log(`✅ Using ${provider} credential from database`);
            return credential.apiKey;
        }

        // Fallback to environment variable
        const envKey = process.env[envVarName];
        if (envKey) {
            console.log(`⚠️  Using ${provider} credential from environment (${envVarName})`);
            return envKey;
        }

        console.warn(`❌ No ${provider} credential found in database or environment`);
        return null;
    } catch (error) {
        console.error(`Error fetching ${provider} credential:`, error);
        // Fallback to environment on error
        return process.env[envVarName] || null;
    }
}

/**
 * Get Gemini API key from database or environment
 */
export async function getGeminiKey(): Promise<string | null> {
    // Try Gemini provider first
    let key = await getAPICredential("gemini", "GEMINI_API_KEY");
    if (key) return key;

    // Try Google provider as fallback
    key = await getAPICredential("google", "GOOGLE_API_KEY");
    if (key) return key;

    return null;
}

/**
 * Get OpenAI API key from database or environment
 */
export async function getOpenAIKey(): Promise<string | null> {
    return getAPICredential("openai", "OPENAI_API_KEY");
}

/**
 * Get Anthropic API key from database or environment
 */
export async function getAnthropicKey(): Promise<string | null> {
    return getAPICredential("anthropic", "ANTHROPIC_API_KEY");
}

/**
 * Get OpenRouter API key from database or environment
 */
export async function getOpenRouterKey(): Promise<string | null> {
    return getAPICredential("openrouter", "OPENROUTER_API_KEY");
}

/**
 * Get Groq API key from database or environment
 */
export async function getGroqKey(): Promise<string | null> {
    return getAPICredential("groq", "GROQ_API_KEY");
}

/**
 * Get Grok (xAI) API key from database or environment
 */
export async function getGrokKey(): Promise<string | null> {
    return getAPICredential("grok", "GROK_API_KEY");
}

/**
 * Get DeepSeek AI API key from database or environment
 */
export async function getDeepSeekKey(): Promise<string | null> {
    return getAPICredential("deepseek", "DEEPSEEK_API_KEY");
}

/**
 * Get Together AI API key from database or environment
 */
export async function getTogetherKey(): Promise<string | null> {
    return getAPICredential("together", "TOGETHER_API_KEY");
}

/**
 * Get Perplexity AI API key from database or environment
 */
export async function getPerplexityKey(): Promise<string | null> {
    return getAPICredential("perplexity", "PERPLEXITY_API_KEY");
}

/**
 * Get Mistral AI API key from database or environment
 */
export async function getMistralKey(): Promise<string | null> {
    return getAPICredential("mistral", "MISTRAL_API_KEY");
}

/**
 * Get Cohere AI API key from database or environment
 */
export async function getCohereKey(): Promise<string | null> {
    return getAPICredential("cohere", "COHERE_API_KEY");
}
