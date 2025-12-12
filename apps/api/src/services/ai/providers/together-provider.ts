import { LLMProvider, AISuggestion } from "./types";

/**
 * Together AI Provider - uses OpenAI-compatible API
 * https://docs.together.ai/docs/inference-rest
 */
export class TogetherProvider implements LLMProvider {
    name = "together";
    private apiKey: string;
    private baseURL = "https://api.together.xyz/v1";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    isConfigured(): boolean {
        return !!this.apiKey;
    }

    async generateSuggestion(prompt: string): Promise<AISuggestion> {
        if (!this.apiKey) {
            throw new Error("Together AI provider not configured");
        }

        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", // Fast and capable model
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
                throw new Error(`Together AI API error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            if (!content) {
                throw new Error("Empty response from Together AI");
            }

            return JSON.parse(content);
        } catch (error) {
            console.error("Together AI generation failed:", error);
            throw error;
        }
    }
}
