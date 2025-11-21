import OpenAI from "openai";
import { LLMProvider, AISuggestion } from "./types";

export class OpenRouterProvider implements LLMProvider {
    name = "openrouter";
    private client: OpenAI | null = null;

    constructor(apiKey: string) {
        if (apiKey) {
            this.client = new OpenAI({
                apiKey: apiKey,
                baseURL: "https://openrouter.ai/api/v1",
            });
        }
    }

    isConfigured(): boolean {
        return !!this.client;
    }

    async generateSuggestion(prompt: string): Promise<AISuggestion> {
        if (!this.client) {
            throw new Error("OpenRouter provider not configured");
        }

        try {
            const completion = await this.client.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are an expert system debugger. You must output valid JSON."
                    },
                    { role: "user", content: prompt }
                ],
                model: "openai/gpt-4-turbo", // Default model, can be changed via env or config
                response_format: { type: "json_object" },
            });

            const content = completion.choices[0].message.content;
            if (!content) throw new Error("Empty response from OpenRouter");

            return JSON.parse(content);
        } catch (error) {
            console.error("OpenRouter generation failed:", error);
            throw error;
        }
    }
}
