import OpenAI from "openai";
import { LLMProvider, AISuggestion } from "./types";

export class OpenAIProvider implements LLMProvider {
    name = "openai";
    private client: OpenAI | null = null;

    constructor(apiKey: string) {
        if (apiKey) {
            this.client = new OpenAI({ apiKey });
        }
    }

    isConfigured(): boolean {
        return !!this.client;
    }

    async generateSuggestion(prompt: string): Promise<AISuggestion> {
        if (!this.client) {
            throw new Error("OpenAI provider not configured");
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
                model: "gpt-4-turbo-preview",
                response_format: { type: "json_object" },
            });

            const content = completion.choices[0].message.content;
            if (!content) throw new Error("Empty response from OpenAI");

            return JSON.parse(content);
        } catch (error) {
            console.error("OpenAI generation failed:", error);
            throw error;
        }
    }
}
