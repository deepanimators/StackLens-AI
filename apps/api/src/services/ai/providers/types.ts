export interface AISuggestion {
    rootCause: string;
    resolutionSteps: string[];
    codeExample?: string;
    preventionMeasures: string[];
    confidence: number;
}

export interface LLMProvider {
    name: string;
    generateSuggestion(prompt: string): Promise<AISuggestion>;
    isConfigured(): boolean;
}
