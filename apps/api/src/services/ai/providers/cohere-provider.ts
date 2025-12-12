import { LLMProvider, AISuggestion } from "./types";

/**
 * Cohere AI Provider
 * https://docs.cohere.com/reference/chat
 */
export class CohereProvider implements LLMProvider {
    name = "cohere";
    private apiKey: string;
    private baseURL = "https://api.cohere.ai/v1";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    isConfigured(): boolean {
        return !!this.apiKey;
    }

    async generateSuggestion(prompt: string): Promise<AISuggestion> {
        if (!this.apiKey) {
            throw new Error("Cohere provider not configured");
        }

        try {
            const response = await fetch(`${this.baseURL}/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: "command-r-plus", // Cohere's most capable model
                    message: prompt,
                    preamble: "You are an expert system debugger. You must output valid JSON.",
                    temperature: 0.7,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Cohere API error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            const content = data.text;

            if (!content) {
                throw new Error("Empty response from Cohere");
            }

            // Parse JSON from response
            return JSON.parse(content);
        } catch (error) {
            console.error("Cohere generation failed:", error);
            throw error;
        }
    }
}
