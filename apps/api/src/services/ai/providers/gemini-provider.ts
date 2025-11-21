import { GoogleGenerativeAI } from "@google/generative-ai";
import { LLMProvider, AISuggestion } from "./types";

export class GeminiProvider implements LLMProvider {
    name = "gemini";
    private client: GoogleGenerativeAI | null = null;
    private model: any = null;

    constructor(apiKey: string) {
        if (apiKey) {
            this.client = new GoogleGenerativeAI(apiKey);
            this.model = this.client.getGenerativeModel({ model: "gemini-pro" });
        }
    }

    isConfigured(): boolean {
        return !!this.client;
    }

    async generateSuggestion(prompt: string): Promise<AISuggestion> {
        if (!this.client || !this.model) {
            throw new Error("Gemini provider not configured");
        }

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            return this.parseResponse(text);
        } catch (error) {
            console.error("Gemini generation failed:", error);
            throw error;
        }
    }

    private parseResponse(text: string): AISuggestion {
        try {
            // Try to find JSON block
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error("No JSON found in response");
        } catch (error) {
            // Fallback if parsing fails
            console.warn("Failed to parse Gemini response as JSON:", error);
            return {
                rootCause: "Could not parse AI response",
                resolutionSteps: ["Review raw logs", "Check system status"],
                preventionMeasures: [],
                confidence: 0.5
            };
        }
    }
}
