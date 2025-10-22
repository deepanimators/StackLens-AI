import { authenticatedRequest } from '@/lib/auth';
import type { SearchPlugin, SearchQuery, SearchResult } from '../types';

/**
 * Fuzzy Search Plugin - Client-side fuzzy matching with caching
 * Provides tolerance for typos and partial matches
 */
export class FuzzySearchPlugin implements SearchPlugin {
    name = 'fuzzy';
    enabled = true;
    priority = 8; // High priority but lower than semantic

    private errorCache: any[] = [];
    private cacheTimestamp = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    constructor(private config: {
        threshold?: number;
        maxDistance?: number;
        cacheSize?: number;
    } = {}) {
        this.config = {
            threshold: 0.6, // Minimum similarity score (0-1)
            maxDistance: 3, // Maximum Levenshtein distance
            cacheSize: 1000,
            ...this.config
        };
    }

    async search(query: SearchQuery): Promise<SearchResult[]> {
        if (!query.options.enableFuzzy || query.query.length < 2) {
            return [];
        }

        try {
            console.log('🔍 Executing fuzzy search for:', query.query);

            // Ensure we have cached error data
            await this.ensureErrorCache();

            // Filter errors based on query filters first
            const filteredErrors = this.applyFilters(this.errorCache, query.filters);

            // Perform fuzzy matching
            const matches = this.performFuzzyMatching(filteredErrors, query.query, query.options.maxResults || 20);

            return this.mapToSearchResults(matches, query.query);

        } catch (error) {
            console.error('❌ Fuzzy search failed:', error);
            return [];
        }
    }

    async getSuggestions(query: string): Promise<string[]> {
        if (query.length < 2) return [];

        await this.ensureErrorCache();

        // Generate suggestions based on fuzzy matching
        const suggestions = new Set<string>();

        // Find similar error messages and types
        this.errorCache.forEach(error => {
            const errorMessage = error.errorMessage || error.message || '';
            const errorType = error.errorType || '';

            // Check if error message contains similar terms
            if (this.calculateSimilarity(query.toLowerCase(), errorMessage.toLowerCase()) > 0.3) {
                // Extract meaningful terms from the error message
                const words = errorMessage.split(/\s+/).filter((word: string) =>
                    word.length > 3 && !this.isCommonWord(word)
                );
                words.slice(0, 2).forEach((word: string) => suggestions.add(word));
            }

            // Check error types
            if (this.calculateSimilarity(query.toLowerCase(), errorType.toLowerCase()) > 0.5) {
                suggestions.add(errorType);
            }
        });

        return Array.from(suggestions).slice(0, 5);
    }

    supportsQuery(query: SearchQuery): boolean {
        return query.options.enableFuzzy !== false &&
            query.query.length >= 2 &&
            !this.isExactMatch(query.query);
    }

    /**
     * Ensure error cache is populated and up-to-date
     */
    private async ensureErrorCache(): Promise<void> {
        const now = Date.now();

        if (this.errorCache.length === 0 || now - this.cacheTimestamp > this.CACHE_DURATION) {
            console.log('🔄 Refreshing fuzzy search cache...');

            try {
                const response = await authenticatedRequest('GET', '/api/errors', {
                    limit: this.config.cacheSize,
                    includeResolved: true // Include all errors for better fuzzy matching
                });

                if (response.ok) {
                    const data = await response.json();
                    this.errorCache = data.errors || [];
                    this.cacheTimestamp = now;
                    console.log(`✅ Cached ${this.errorCache.length} errors for fuzzy search`);
                }
            } catch (error) {
                console.error('❌ Failed to cache errors for fuzzy search:', error);
            }
        }
    }

    /**
     * Apply search filters to error collection
     */
    private applyFilters(errors: any[], filters: any): any[] {
        let filtered = errors;

        if (filters.severity?.length > 0) {
            filtered = filtered.filter(error =>
                filters.severity.includes(error.severity)
            );
        }

        if (filters.errorType?.length > 0) {
            filtered = filtered.filter(error =>
                filters.errorType.includes(error.errorType)
            );
        }

        if (filters.dateRange) {
            const startTime = filters.dateRange.start.getTime();
            const endTime = filters.dateRange.end.getTime();

            filtered = filtered.filter(error => {
                const errorTime = new Date(error.createdAt || error.timestamp).getTime();
                return errorTime >= startTime && errorTime <= endTime;
            });
        }

        if (filters.fileNames?.length > 0) {
            filtered = filtered.filter(error =>
                filters.fileNames.some((fileName: string) =>
                    (error.fileName || '').includes(fileName)
                )
            );
        }

        return filtered;
    }

    /**
     * Perform fuzzy matching on filtered errors
     */
    private performFuzzyMatching(errors: any[], query: string, maxResults: number): Array<{ error: any; score: number }> {
        const matches: Array<{ error: any; score: number }> = [];
        const queryLower = query.toLowerCase();

        errors.forEach(error => {
            const searchableText = this.buildSearchableText(error);
            const similarity = this.calculateSimilarity(queryLower, searchableText.toLowerCase());

            if (similarity >= this.config.threshold!) {
                matches.push({ error, score: similarity });
            }
        });

        // Sort by similarity score and return top results
        return matches
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
    }

    /**
     * Build searchable text from error object
     */
    private buildSearchableText(error: any): string {
        const parts = [
            error.errorMessage || error.message || '',
            error.errorType || '',
            error.fileName || '',
            error.stackTrace || ''
        ].filter(part => part && typeof part === 'string');

        return parts.join(' ');
    }

    /**
     * Calculate similarity between two strings using multiple algorithms
     */
    private calculateSimilarity(str1: string, str2: string): number {
        // Use multiple similarity algorithms and take the best score
        const levenshteinSim = this.levenshteinSimilarity(str1, str2);
        const jaccardSim = this.jaccardSimilarity(str1, str2);
        const substringScore = this.substringScore(str1, str2);

        // Weighted combination of scores
        return (levenshteinSim * 0.4) + (jaccardSim * 0.4) + (substringScore * 0.2);
    }

    /**
     * Levenshtein distance-based similarity
     */
    private levenshteinSimilarity(str1: string, str2: string): number {
        const distance = this.levenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);

        if (maxLength === 0) return 1;
        if (distance > this.config.maxDistance!) return 0;

        return 1 - (distance / maxLength);
    }

    /**
     * Calculate Levenshtein distance
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,     // deletion
                    matrix[j - 1][i] + 1,     // insertion
                    matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Jaccard similarity based on word sets
     */
    private jaccardSimilarity(str1: string, str2: string): number {
        const set1 = new Set(str1.toLowerCase().split(/\s+/));
        const set2 = new Set(str2.toLowerCase().split(/\s+/));

        const intersection = new Set(Array.from(set1).filter(word => set2.has(word)));
        const union = new Set([...Array.from(set1), ...Array.from(set2)]);

        return union.size === 0 ? 0 : intersection.size / union.size;
    }

    /**
     * Substring matching score
     */
    private substringScore(str1: string, str2: string): number {
        const shorter = str1.length < str2.length ? str1 : str2;
        const longer = str1.length >= str2.length ? str1 : str2;

        if (longer.toLowerCase().includes(shorter.toLowerCase())) {
            return shorter.length / longer.length;
        }

        return 0;
    }

    /**
     * Check if query is likely an exact match attempt
     */
    private isExactMatch(query: string): boolean {
        // If query looks like exact syntax (quotes, specific patterns), don't use fuzzy
        return query.includes('"') || query.includes('*') || query.includes('?');
    }

    /**
     * Check if word is too common for suggestions
     */
    private isCommonWord(word: string): boolean {
        const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'error', 'exception', 'failed'];
        return commonWords.includes(word.toLowerCase());
    }

    /**
     * Map fuzzy matches to search results
     */
    private mapToSearchResults(matches: Array<{ error: any; score: number }>, query: string): SearchResult[] {
        return matches.map(({ error, score }, index) => ({
            id: error.id?.toString() || `fuzzy-${index}`,
            title: error.errorMessage || error.message || 'Fuzzy Match',
            content: error.stackTrace || error.description || '',
            metadata: {
                errorType: error.errorType || 'unknown',
                severity: error.severity || 'medium',
                fileName: error.fileName || 'unknown',
                lineNumber: error.lineNumber,
                timestamp: new Date(error.createdAt || error.timestamp || Date.now()),
                tags: error.tags || []
            },
            relevanceScore: score,
            highlights: this.generateFuzzyHighlights(error, query)
        }));
    }

    /**
     * Generate highlights for fuzzy matches
     */
    private generateFuzzyHighlights(error: any, query: string): any[] {
        const highlights: Array<{ field: string; fragments: string[] }> = [];
        const queryTerms = query.toLowerCase().split(/\s+/);

        // Highlight fuzzy matches in title
        const title = error.errorMessage || error.message || '';
        queryTerms.forEach((term: string) => {
            const words = title.split(/\s+/);
            words.forEach((word: string) => {
                if (this.calculateSimilarity(term, word.toLowerCase()) > 0.7) {
                    highlights.push({
                        field: 'title',
                        fragments: [title.replace(new RegExp(`\\b${word}\\b`, 'gi'), `<mark>${word}</mark>`)]
                    });
                }
            });
        });

        return highlights;
    }

    /**
     * Clear the error cache
     */
    public clearCache(): void {
        this.errorCache = [];
        this.cacheTimestamp = 0;
        console.log('🧹 Fuzzy search cache cleared');
    }

    /**
     * Get cache statistics
     */
    public getCacheStats(): { size: number; age: number; hitRate: number } {
        return {
            size: this.errorCache.length,
            age: Date.now() - this.cacheTimestamp,
            hitRate: 0 // TODO: Implement hit rate tracking
        };
    }
}

// Export the plugin instance
export const fuzzySearchPlugin = new FuzzySearchPlugin();