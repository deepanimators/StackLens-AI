import { AISuggestion, LLMProvider } from "./ai/providers/types";
import { GeminiProvider } from "./ai/providers/gemini-provider";
import { OpenAIProvider } from "./ai/providers/openai-provider";
import { AnthropicProvider } from "./ai/providers/anthropic-provider";
import { OpenRouterProvider } from "./ai/providers/openrouter-provider";
import { GroqProvider } from "./ai/providers/groq-provider";
import { GrokProvider } from "./ai/providers/grok-provider";
import { DeepSeekProvider } from "./ai/providers/deepseek-provider";
import { TogetherProvider } from "./ai/providers/together-provider";
import { PerplexityProvider } from "./ai/providers/perplexity-provider";
import { MistralProvider } from "./ai/providers/mistral-provider";
import { CohereProvider } from "./ai/providers/cohere-provider";
import { credentialService } from "./credential-service";

export class AIService {
  private providers: LLMProvider[] = [];
  private initialized: boolean = false;

  constructor() {
    // Initialization is async, will be called on first use
  }

  private async initializeProviders() {
    if (this.initialized) return;

    try {
      // Try to load credentials from database first
      const credentials = await this.loadCredentialsFromDatabase();

      if (credentials.length > 0) {
        console.log('🔐 Loading AI credentials from database...');
        await this.initializeFromDatabase(credentials);
      } else {
        console.log('⚠️  No database credentials found, falling back to environment variables...');
        this.initializeFromEnvironment();
      }

      this.initialized = true;
      console.log(`🤖 AI Service initialized with ${this.providers.length} providers: ${this.providers.map(p => p.name).join(", ")}`);
    } catch (error) {
      console.error('❌ Error initializing AI providers from database, using environment fallback:', error);
      this.initializeFromEnvironment();
      this.initialized = true;
    }
  }

  private async loadCredentialsFromDatabase() {
    try {
      // Load all global active credentials
      const credentials = await credentialService.listCredentials();
      return credentials.filter(c => c.isActive);
    } catch (error) {
      console.error('Error loading credentials from database:', error);
      return [];
    }
  }

  private async initializeFromDatabase(credentials: any[]) {
    const providers = [
      'gemini', 'google', 'openai', 'anthropic', 'openrouter',
      'groq', 'grok', 'deepseek', 'together', 'perplexity', 'mistral', 'cohere'
    ];

    for (const providerName of providers) {
      try {
        const cred = await credentialService.getCredentialByProvider(providerName);

        if (!cred?.apiKey) continue;

        switch (providerName.toLowerCase()) {
          case 'gemini':
          case 'google':
            this.providers.push(new GeminiProvider(cred.apiKey));
            break;
          case 'openai':
            this.providers.push(new OpenAIProvider(cred.apiKey));
            break;
          case 'anthropic':
            this.providers.push(new AnthropicProvider(cred.apiKey));
            break;
          case 'openrouter':
            this.providers.push(new OpenRouterProvider(cred.apiKey));
            break;
          case 'groq':
            this.providers.push(new GroqProvider(cred.apiKey));
            break;
          case 'grok':
            this.providers.push(new GrokProvider(cred.apiKey));
            break;
          case 'deepseek':
            this.providers.push(new DeepSeekProvider(cred.apiKey));
            break;
          case 'together':
            this.providers.push(new TogetherProvider(cred.apiKey));
            break;
          case 'perplexity':
            this.providers.push(new PerplexityProvider(cred.apiKey));
            break;
          case 'mistral':
            this.providers.push(new MistralProvider(cred.apiKey));
            break;
          case 'cohere':
            this.providers.push(new CohereProvider(cred.apiKey));
            break;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to initialize ${providerName} from database:`, error);
      }
    }
  }

  private initializeFromEnvironment() {
    // Initialize providers in priority order from environment variables
    // 1. Gemini (Primary)
    if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) {
      this.providers.push(new GeminiProvider(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || ""));
    }

    // 2. OpenAI (Secondary)
    if (process.env.OPENAI_API_KEY) {
      this.providers.push(new OpenAIProvider(process.env.OPENAI_API_KEY));
    }

    // 3. Anthropic (Tertiary)
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.push(new AnthropicProvider(process.env.ANTHROPIC_API_KEY));
    }

    // 4. OpenRouter (Quaternary)
    if (process.env.OPENROUTER_API_KEY) {
      this.providers.push(new OpenRouterProvider(process.env.OPENROUTER_API_KEY));
    }

    // 5. Groq (Quinary)
    if (process.env.GROQ_API_KEY) {
      this.providers.push(new GroqProvider(process.env.GROQ_API_KEY));
    }

    // 6. Grok/xAI (Senary)
    if (process.env.GROK_API_KEY) {
      this.providers.push(new GrokProvider(process.env.GROK_API_KEY));
    }

    // 7. DeepSeek AI
    if (process.env.DEEPSEEK_API_KEY) {
      this.providers.push(new DeepSeekProvider(process.env.DEEPSEEK_API_KEY));
    }

    // 8. Together AI
    if (process.env.TOGETHER_API_KEY) {
      this.providers.push(new TogetherProvider(process.env.TOGETHER_API_KEY));
    }

    // 9. Perplexity AI
    if (process.env.PERPLEXITY_API_KEY) {
      this.providers.push(new PerplexityProvider(process.env.PERPLEXITY_API_KEY));
    }

    // 10. Mistral AI
    if (process.env.MISTRAL_API_KEY) {
      this.providers.push(new MistralProvider(process.env.MISTRAL_API_KEY));
    }

    // 11. Cohere AI
    if (process.env.COHERE_API_KEY) {
      this.providers.push(new CohereProvider(process.env.COHERE_API_KEY));
    }
  }

  async generateSuggestion(errorText: string, errorType: string, severity: string): Promise<AISuggestion> {
    // Ensure providers are initialized
    await this.initializeProviders();

    if (this.providers.length === 0) {
      console.log('⚠️ No AI providers configured, using fallback suggestion');
      return this.getFallbackSuggestion(errorText, errorType, severity);
    }

    const prompt = this.buildPrompt(errorText, errorType, severity);

    for (const provider of this.providers) {
      try {
        console.log(`🤖 Attempting generation with ${provider.name}...`);
        const suggestion = await provider.generateSuggestion(prompt);
        console.log(`✅ ${provider.name} generated suggestion successfully`);
        return suggestion;
      } catch (error) {
        console.warn(`⚠️ ${provider.name} failed:`, error);
        // Continue to next provider
      }
    }

    console.error('❌ All AI providers failed. Falling back to static suggestions.');
    return this.getFallbackSuggestion(errorText, errorType, severity);
  }

  private buildPrompt(errorText: string, errorType: string, severity: string): string {
    return `As an expert software engineer, analyze this ${severity} ${errorType} error and provide a structured solution:

Error: ${errorText}

Please provide a response in the following JSON format:
{
  "rootCause": "Brief explanation of what caused this error",
  "resolutionSteps": ["Step 1", "Step 2", "Step 3", "..."],
  "codeExample": "Code snippet or configuration example if applicable",
  "preventionMeasures": ["Prevention step 1", "Prevention step 2", "..."],
  "confidence": 0.95
}

Focus on practical, actionable solutions that a developer can implement immediately.`;
  }

  private getFallbackSuggestion(errorText: string, errorType: string, severity: string): AISuggestion {
    const suggestions: Record<string, AISuggestion> = {
      'Memory': {
        rootCause: "Memory allocation exceeded available heap space",
        resolutionSteps: [
          "Increase JVM heap size using -Xmx parameter",
          "Review memory usage patterns in the application",
          "Implement memory profiling to identify leaks",
          "Optimize data structures and algorithms"
        ],
        codeExample: "// JVM configuration\n-Xmx4g -XX:+UseG1GC -XX:MaxGCPauseMillis=200",
        preventionMeasures: [
          "Implement memory monitoring alerts",
          "Regular memory profiling in development",
          "Use memory-efficient data structures",
          "Implement proper resource cleanup"
        ],
        confidence: 0.8
      },
      'Database': {
        rootCause: "Database connection or query execution failure",
        resolutionSteps: [
          "Check database connection parameters",
          "Verify database server availability",
          "Review SQL query syntax and performance",
          "Implement connection pooling and retry logic"
        ],
        codeExample: "// Connection pool configuration\nspring.datasource.hikari.maximum-pool-size=10\nspring.datasource.hikari.connection-timeout=30000",
        preventionMeasures: [
          "Implement database monitoring",
          "Use connection pooling",
          "Add query timeout configurations",
          "Regular database maintenance"
        ],
        confidence: 0.8
      },
      'Network': {
        rootCause: "Network connectivity or timeout issues",
        resolutionSteps: [
          "Check network connectivity to target service",
          "Verify firewall and security group settings",
          "Review timeout configurations",
          "Implement retry mechanisms with exponential backoff"
        ],
        preventionMeasures: [
          "Implement circuit breaker patterns",
          "Monitor network latency",
          "Configure appropriate timeouts",
          "Add health checks for dependencies"
        ],
        confidence: 0.7
      },
      'Hardware': {
        rootCause: "Physical hardware or peripheral malfunction",
        resolutionSteps: [
          "Check power and cable connections",
          "Restart the peripheral device",
          "Verify device drivers are up to date",
          "Check for physical damage or obstructions"
        ],
        preventionMeasures: [
          "Regular hardware maintenance",
          "Secure cable management",
          "Keep spare peripherals for critical components"
        ],
        confidence: 0.7
      }
    };

    return suggestions[errorType] || {
      rootCause: "Generic error requiring investigation",
      resolutionSteps: [
        "Review the error message and stack trace",
        "Check application logs for additional context",
        "Verify system resources and dependencies",
        "Consult documentation for specific error codes"
      ],
      preventionMeasures: [
        "Implement comprehensive error handling",
        "Add proper logging and monitoring",
        "Regular system health checks",
        "Maintain up-to-date documentation"
      ],
      confidence: 0.6
    };
  }

  async analyzeLogBatch(errors: any[]): Promise<any> {
    try {
      const analysis = {
        totalErrors: errors.length,
        errorsByType: {} as Record<string, number>,
        errorsBySeverity: {} as Record<string, number>,
        suggestions: [] as any[],
        commonPatterns: [] as string[],
        recommendation: 'Review errors by severity and apply suggested fixes',
      };

      // Count errors by type and severity
      for (const error of errors) {
        analysis.errorsByType[error.errorType] = (analysis.errorsByType[error.errorType] || 0) + 1;
        analysis.errorsBySeverity[error.severity] = (analysis.errorsBySeverity[error.severity] || 0) + 1;
      }

      // Generate suggestions for the first few critical errors
      const criticalErrors = errors.filter(e => e.severity === 'critical').slice(0, 3);
      for (const error of criticalErrors) {
        try {
          const suggestion = await this.generateSuggestion(error.message, error.errorType, error.severity);
          analysis.suggestions.push({
            errorId: error.id,
            errorMessage: error.message.substring(0, 100) + '...',
            suggestion
          });
        } catch (err) {
          console.warn('Failed to generate suggestion for error:', error.id);
        }
      }

      // Extract common patterns
      const messageWords = errors.flatMap(e => e.message.toLowerCase().split(/\s+/));
      const wordCounts = messageWords.reduce((acc, word) => {
        if (word.length > 3) {
          acc[word] = (acc[word] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      analysis.commonPatterns = Object.entries(wordCounts)
        .filter(([_, count]) => (count as number) > 1)
        .sort(([_, a], [__, b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([word]) => word);

      return analysis;
    } catch (error) {
      console.error('Batch analysis error:', error);
      return {
        totalErrors: errors.length,
        errorsByType: {},
        errorsBySeverity: {},
        suggestions: [],
        commonPatterns: [],
        recommendation: 'Unable to complete batch analysis. Review errors manually.',
      };
    }
  }

  /**
   * Generate analytics insights for realtime monitoring
   * Uses ONLY the first available provider (no fallback)
   * Returns raw response from AI with metadata (response time, provider used)
   */
  async generateAnalyticsInsight(prompt: string): Promise<{
    analysis: any;
    responseTimeMs: number;
    provider: string;
  } | null> {
    // Ensure providers are initialized
    await this.initializeProviders();

    if (this.providers.length === 0) {
      console.log('⚠️ No AI providers configured for analytics');
      return null;
    }

    // Use ONLY the first available provider (no fallback to other providers)
    const provider = this.providers[0];

    try {
      console.log(`🤖 Using ${provider.name} for analytics generation...`);
      const startTime = Date.now();

      const result = await provider.generateSuggestion(prompt);

      const responseTimeMs = Date.now() - startTime;
      console.log(`✅ ${provider.name} generated analytics insight in ${responseTimeMs}ms`);
      console.log('📊 AI Response:', JSON.stringify(result, null, 2));

      // Return analysis with metadata
      return {
        analysis: result,
        responseTimeMs,
        provider: provider.name
      };
    } catch (error) {
      console.error(`❌ ${provider.name} failed for analytics:`, error);
      throw error; // Don't try other providers, just fail
    }
  }
}

// Export a singleton instance
export const aiService = new AIService();

