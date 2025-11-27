import Anthropic from "@anthropic-ai/sdk";
import { LLMProvider, AISuggestion } from "./types";

export class AnthropicProvider implements LLMProvider {
    name = "anthropic";
    private client: Anthropic | null = null;

    constructor(apiKey: string) {
        if (apiKey) {
            this.client = new Anthropic({ apiKey });
        }
    }

    isConfigured(): boolean {
        return !!this.client;
    }

    async generateSuggestion(prompt: string): Promise<AISuggestion> {
        if (!this.client) {
            throw new Error("Anthropic provider not configured");
        }

        try {
            const message = await this.client.messages.create({
                max_tokens: 1024,
                messages: [{ role: "user", content: prompt }],
                model: "claude-3-opus-20240229",
            });

            // Handle ContentBlock which might not be text directly
            const textBlock = message.content[0];
            if (textBlock.type !== 'text') {
                throw new Error("Unexpected response type from Anthropic");
            }

            return this.parseResponse(textBlock.text);
        } catch (error) {
            console.error("Anthropic generation failed:", error);
            throw error;
        }
    }

    private parseResponse(text: string): AISuggestion {
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error("No JSON found in response");
        } catch (error) {
            console.warn("Failed to parse Anthropic response as JSON:", error);
            return {
                rootCause: "Could not parse AI response",
                resolutionSteps: ["Review raw logs"],
                preventionMeasures: [],
                confidence: 0.5
            };
        }
    }
}
