import { LLMProvider, AISuggestion } from "./types";

/**
 * Grok (xAI) Provider - uses OpenAI-compatible API
 * https://docs.x.ai/api
 */
export class GrokProvider implements LLMProvider {
    name = "grok";
    private apiKey: string;
    private baseURL = "https://api.x.ai/v1";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    isConfigured(): boolean {
        return !!this.apiKey;
    }

    async generateSuggestion(prompt: string): Promise<AISuggestion> {
        if (!this.apiKey) {
            throw new Error("Grok provider not configured");
        }

        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: "grok-beta", // Grok's main model
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
                    response_format: { type: "json_object" },
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Grok API error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            if (!content) {
                throw new Error("Empty response from Grok");
            }

            return JSON.parse(content);
        } catch (error) {
            console.error("Grok generation failed:", error);
            throw error;
        }
    }
}
