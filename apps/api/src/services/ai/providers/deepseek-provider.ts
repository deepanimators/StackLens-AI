import { LLMProvider, AISuggestion } from "./types";

/**
 * DeepSeek AI Provider - uses OpenAI-compatible API
 * https://platform.deepseek.com/api-docs/
 */
export class DeepSeekProvider implements LLMProvider {
    name = "deepseek";
    private apiKey: string;
    private baseURL = "https://api.deepseek.com/v1";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    isConfigured(): boolean {
        return !!this.apiKey;
    }

    async generateSuggestion(prompt: string): Promise<AISuggestion> {
        if (!this.apiKey) {
            throw new Error("DeepSeek provider not configured");
        }

        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: "deepseek-chat", // DeepSeek's main model
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
                throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            if (!content) {
                throw new Error("Empty response from DeepSeek");
            }

            return JSON.parse(content);
        } catch (error) {
            console.error("DeepSeek generation failed:", error);
            throw error;
        }
    }
}
