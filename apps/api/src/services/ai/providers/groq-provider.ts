import Groq from "groq-sdk";
import { LLMProvider, AISuggestion } from "./types";

export class GroqProvider implements LLMProvider {
    name = "groq";
    private client: Groq | null = null;

    constructor(apiKey: string) {
        if (apiKey) {
            this.client = new Groq({ apiKey });
        }
    }

    isConfigured(): boolean {
        return !!this.client;
    }

    async generateSuggestion(prompt: string): Promise<AISuggestion> {
        if (!this.client) {
            throw new Error("Groq provider not configured");
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
                model: "llama-3.3-70b-versatile", // Updated to current Groq model
                response_format: { type: "json_object" },
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) throw new Error("Empty response from Groq");

            return JSON.parse(content);
        } catch (error) {
            console.error("Groq generation failed:", error);
            throw error;
        }
    }
}
