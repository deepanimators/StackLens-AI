import { LLMProvider, AISuggestion } from "./types";

/**
 * Perplexity AI Provider - uses OpenAI-compatible API
 * https://docs.perplexity.ai/reference/post_chat_completions
 */
export class PerplexityProvider implements LLMProvider {
    name = "perplexity";
    private apiKey: string;
    private baseURL = "https://api.perplexity.ai";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    isConfigured(): boolean {
        return !!this.apiKey;
    }

    async generateSuggestion(prompt: string): Promise<AISuggestion> {
        if (!this.apiKey) {
            throw new Error("Perplexity provider not configured");
        }

        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: "llama-3.1-sonar-large-128k-online", // Perplexity's main model
                    messages: [
                        {
                            role: "system",
                            content: "You are an expert system debugger. You must output valid JSON."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Perplexity API error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            if (!content) {
                throw new Error("Empty response from Perplexity");
            }

            // Parse JSON from response
            return JSON.parse(content);
        } catch (error) {
            console.error("Perplexity generation failed:", error);
            throw error;
        }
    }
}
