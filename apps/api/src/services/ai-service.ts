interface AISuggestion {
  rootCause: string;
  resolutionSteps: string[];
  codeExample?: string;
  preventionMeasures: string[];
  confidence: number;
}

export class AIService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
  }

  async generateSuggestion(errorText: string, errorType: string, severity: string): Promise<AISuggestion> {
    if (!this.apiKey) {
      return this.getFallbackSuggestion(errorText, errorType, severity);
    }

    try {
      const prompt = this.buildPrompt(errorText, errorType, severity);
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + this.apiKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.candidates[0]?.content?.parts[0]?.text || '';
      
      return this.parseAIResponse(generatedText);
    } catch (error) {
      console.error('AI Service Error:', error);
      return this.getFallbackSuggestion(errorText, errorType, severity);
    }
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

  private parseAIResponse(response: string): AISuggestion {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          rootCause: parsed.rootCause || "AI analysis unavailable",
          resolutionSteps: parsed.resolutionSteps || ["Review the error context and application logs"],
          codeExample: parsed.codeExample,
          preventionMeasures: parsed.preventionMeasures || ["Implement proper error handling"],
          confidence: parsed.confidence || 0.7
        };
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
    }

    // Fallback parsing
    return {
      rootCause: "AI analysis could not be parsed",
      resolutionSteps: ["Review the error message and stack trace", "Check application logs for context"],
      preventionMeasures: ["Implement proper error handling and logging"],
      confidence: 0.5
    };
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
}
