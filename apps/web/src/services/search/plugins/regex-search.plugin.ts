import { authenticatedRequest } from '@/lib/auth';
import type { SearchPlugin, SearchQuery, SearchResult } from '../types';

/**
 * Regex Search Plugin - Advanced pattern matching for power users
 * Supports regular expressions and complex pattern matching
 */
export class RegexSearchPlugin implements SearchPlugin {
    name = 'regex';
    enabled = true;
    priority = 6; // Lower priority, used for specific pattern searches

    private errorCache: any[] = [];
    private cacheTimestamp = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    constructor(private config: {
        maxComplexity?: number;
        timeout?: number;
        cacheSize?: number;
    } = {}) {
        this.config = {
            maxComplexity: 100, // Maximum regex complexity score
            timeout: 1000, // Timeout for regex execution (ms)
            cacheSize: 1000,
            ...this.config
        };
    }

    async search(query: SearchQuery): Promise<SearchResult[]> {
        if (!query.options.enableRegex || !this.isRegexQuery(query.query)) {
            return [];
        }

        try {
            console.log('🔧 Executing regex search for:', query.query);

            // Validate regex before proceeding
            const regex = this.validateAndCreateRegex(query.query);
            if (!regex) {
                return [];
            }

            // Ensure we have cached error data
            await this.ensureErrorCache();

            // Filter errors based on query filters first
            const filteredErrors = this.applyFilters(this.errorCache, query.filters);

            // Perform regex matching with timeout protection
            const matches = await this.performRegexMatching(filteredErrors, regex, query.options.maxResults || 20);

            return this.mapToSearchResults(matches, query.query, regex);

        } catch (error) {
            console.error('❌ Regex search failed:', error);
            return [];
        }
    }

    async getSuggestions(query: string): Promise<string[]> {
        if (!this.isRegexQuery(query)) return [];

        // Provide regex pattern suggestions
        const suggestions: string[] = [];        // Common regex patterns for error analysis
        const commonPatterns = [
            '\\berror\\b.*\\d+', // Error followed by number
            '\\bexception\\b.*at.*line\\s+\\d+', // Exception with line number
            '\\bfailed\\b.*\\bin\\b.*\\.\\w+', // Failed in file
            '\\btimeout\\b.*\\d+ms', // Timeout with milliseconds
            '\\bnull\\s+pointer\\b', // Null pointer errors
            '\\bmemory\\b.*\\berror\\b', // Memory errors
            '\\bstack\\s+overflow\\b', // Stack overflow
            '\\bassert\\w*\\s+failed\\b' // Assertion failures
        ];

        // If query is partial regex, suggest completions
        if (query.length >= 2) {
            commonPatterns.forEach(pattern => {
                if (pattern.includes(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))) {
                    suggestions.push(pattern);
                }
            });
        }

        return suggestions.slice(0, 5);
    }

    supportsQuery(query: SearchQuery): boolean {
        return query.options.enableRegex === true && this.isRegexQuery(query.query);
    }

    /**
     * Check if query looks like a regex pattern
     */
    private isRegexQuery(query: string): boolean {
        // Look for regex metacharacters
        const regexChars = /[.*+?^${}()|[\]\\]/;
        return regexChars.test(query) || query.startsWith('/') || query.includes('\\b') || query.includes('\\d');
    }

    /**
     * Validate and create regex with safety checks
     */
    private validateAndCreateRegex(pattern: string): RegExp | null {
        try {
            // Clean pattern if wrapped in forward slashes
            let cleanPattern = pattern;
            if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
                const lastSlash = pattern.lastIndexOf('/');
                cleanPattern = pattern.slice(1, lastSlash);
            }

            // Check complexity to prevent ReDoS attacks
            if (this.calculateRegexComplexity(cleanPattern) > this.config.maxComplexity!) {
                console.warn('⚠️ Regex pattern too complex, skipping:', cleanPattern);
                return null;
            }

            // Create regex with global and case-insensitive flags
            return new RegExp(cleanPattern, 'gi');
        } catch (error) {
            console.warn('⚠️ Invalid regex pattern:', pattern, error);
            return null;
        }
    }

    /**
     * Calculate regex complexity to prevent dangerous patterns
     */
    private calculateRegexComplexity(pattern: string): number {
        let complexity = 0;

        // Count various regex features
        complexity += (pattern.match(/\*/g) || []).length * 5; // Kleene star
        complexity += (pattern.match(/\+/g) || []).length * 3; // One or more
        complexity += (pattern.match(/\?/g) || []).length * 2; // Optional
        complexity += (pattern.match(/\{/g) || []).length * 4; // Quantifiers
        complexity += (pattern.match(/\(/g) || []).length * 3; // Groups
        complexity += (pattern.match(/\[/g) || []).length * 2; // Character classes
        complexity += (pattern.match(/\./g) || []).length * 2; // Wildcard

        // Nested quantifiers are very dangerous
        const nestedQuantifiers = pattern.match(/[\*\+\?]\s*[\*\+\?]/g);
        if (nestedQuantifiers) {
            complexity += nestedQuantifiers.length * 20;
        }

        return complexity;
    }

    /**
     * Ensure error cache is populated and up-to-date
     */
    private async ensureErrorCache(): Promise<void> {
        const now = Date.now();

        if (this.errorCache.length === 0 || now - this.cacheTimestamp > this.CACHE_DURATION) {
            console.log('🔄 Refreshing regex search cache...');

            try {
                const response = await authenticatedRequest('GET', '/api/errors', {
                    limit: this.config.cacheSize,
                    includeResolved: true
                });

                if (response.ok) {
                    const data = await response.json();
                    this.errorCache = data.errors || [];
                    this.cacheTimestamp = now;
                    console.log(`✅ Cached ${this.errorCache.length} errors for regex search`);
                }
            } catch (error) {
                console.error('❌ Failed to cache errors for regex search:', error);
            }
        }
    }

    /**
     * Apply search filters to error collection
     */
    private applyFilters(errors: any[], filters: any): any[] {
        let filtered = errors;

        if (filters.severity?.length > 0) {
            filtered = filtered.filter((error: any) =>
                filters.severity.includes(error.severity)
            );
        }

        if (filters.errorType?.length > 0) {
            filtered = filtered.filter((error: any) =>
                filters.errorType.includes(error.errorType)
            );
        }

        if (filters.dateRange) {
            const startTime = filters.dateRange.start.getTime();
            const endTime = filters.dateRange.end.getTime();

            filtered = filtered.filter((error: any) => {
                const errorTime = new Date(error.createdAt || error.timestamp).getTime();
                return errorTime >= startTime && errorTime <= endTime;
            });
        }

        if (filters.fileNames?.length > 0) {
            filtered = filtered.filter((error: any) =>
                filters.fileNames.some((fileName: string) =>
                    (error.fileName || '').includes(fileName)
                )
            );
        }

        return filtered;
    }

    /**
     * Perform regex matching with timeout protection
     */
    private async performRegexMatching(errors: any[], regex: RegExp, maxResults: number): Promise<Array<{ error: any; matches: string[]; matchCount: number }>> {
        const matches: Array<{ error: any; matches: string[]; matchCount: number }> = [];

        for (const error of errors) {
            try {
                const searchableText = this.buildSearchableText(error);
                const regexMatches = await this.executeRegexWithTimeout(regex, searchableText);

                if (regexMatches.length > 0) {
                    matches.push({
                        error,
                        matches: regexMatches,
                        matchCount: regexMatches.length
                    });

                    if (matches.length >= maxResults) {
                        break;
                    }
                }
            } catch (error) {
                console.warn('⚠️ Regex execution failed for error:', error);
                continue;
            }
        }

        // Sort by match count (more matches = higher relevance)
        return matches.sort((a, b) => b.matchCount - a.matchCount);
    }

    /**
     * Execute regex with timeout protection
     */
    private executeRegexWithTimeout(regex: RegExp, text: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Regex execution timeout'));
            }, this.config.timeout!);

            try {
                const matches: string[] = [];
                let match;

                // Reset regex to ensure global search works correctly
                regex.lastIndex = 0;

                while ((match = regex.exec(text)) !== null && matches.length < 10) {
                    matches.push(match[0]);

                    // Prevent infinite loop on zero-length matches
                    if (match.index === regex.lastIndex) {
                        regex.lastIndex++;
                    }
                }

                clearTimeout(timeout);
                resolve(matches);
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    /**
     * Build searchable text from error object
     */
    private buildSearchableText(error: any): string {
        const parts = [
            error.errorMessage || error.message || '',
            error.errorType || '',
            error.fileName || '',
            error.stackTrace || '',
            error.description || ''
        ].filter(part => part && typeof part === 'string');

        return parts.join('\n');
    }

    /**
     * Map regex matches to search results
     */
    private mapToSearchResults(matches: Array<{ error: any; matches: string[]; matchCount: number }>, query: string, regex: RegExp): SearchResult[] {
        return matches.map(({ error, matches: regexMatches, matchCount }, index) => ({
            id: error.id?.toString() || `regex-${index}`,
            title: error.errorMessage || error.message || 'Regex Match',
            content: error.stackTrace || error.description || '',
            metadata: {
                errorType: error.errorType || 'unknown',
                severity: error.severity || 'medium',
                fileName: error.fileName || 'unknown',
                lineNumber: error.lineNumber,
                timestamp: new Date(error.createdAt || error.timestamp || Date.now()),
                tags: [...(error.tags || []), `regex-${matchCount}-matches`]
            },
            relevanceScore: this.calculateRegexRelevanceScore(matchCount, regexMatches),
            highlights: this.generateRegexHighlights(error, regex, regexMatches)
        }));
    }

    /**
     * Calculate relevance score based on regex matches
     */
    private calculateRegexRelevanceScore(matchCount: number, matches: string[]): number {
        // Base score from match count
        let score = Math.min(matchCount * 0.2, 1.0);

        // Bonus for longer matches (more specific)
        const avgMatchLength = matches.reduce((sum, match) => sum + match.length, 0) / matches.length;
        if (avgMatchLength > 10) {
            score += 0.2;
        }

        // Bonus for unique matches
        const uniqueMatches = new Set(matches).size;
        if (uniqueMatches > 1) {
            score += 0.1;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Generate highlights for regex matches
     */
    private generateRegexHighlights(error: any, regex: RegExp, matches: string[]): any[] {
        const highlights: Array<{ field: string; fragments: string[] }> = [];

        // Highlight matches in different fields
        const fields = [
            { key: 'title', text: error.errorMessage || error.message || '' },
            { key: 'content', text: error.stackTrace || '' }
        ];

        fields.forEach(field => {
            if (!field.text) return;

            const fragments: string[] = [];

            // Create highlighted fragments around matches
            matches.forEach(match => {
                const index = field.text.toLowerCase().indexOf(match.toLowerCase());
                if (index >= 0) {
                    const start = Math.max(0, index - 50);
                    const end = Math.min(field.text.length, index + match.length + 50);
                    const fragment = field.text.slice(start, end);

                    // Highlight the match within the fragment
                    const highlightedFragment = fragment.replace(
                        new RegExp(`(${match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                        '<mark>$1</mark>'
                    );

                    fragments.push(highlightedFragment);
                }
            });

            if (fragments.length > 0) {
                highlights.push({
                    field: field.key,
                    fragments: fragments.slice(0, 3) // Limit to 3 fragments per field
                });
            }
        });

        return highlights;
    }

    /**
     * Clear the error cache
     */
    public clearCache(): void {
        this.errorCache = [];
        this.cacheTimestamp = 0;
        console.log('🧹 Regex search cache cleared');
    }

    /**
     * Get cache statistics
     */
    public getCacheStats(): { size: number; age: number } {
        return {
            size: this.errorCache.length,
            age: Date.now() - this.cacheTimestamp
        };
    }

    /**
     * Test regex pattern safety
     */
    public testPattern(pattern: string): { valid: boolean; complexity: number; error?: string } {
        try {
            const regex = this.validateAndCreateRegex(pattern);
            return {
                valid: regex !== null,
                complexity: this.calculateRegexComplexity(pattern),
                error: regex === null ? 'Invalid or too complex regex pattern' : undefined
            };
        } catch (error) {
            return {
                valid: false,
                complexity: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

// Export the plugin instance
export const regexSearchPlugin = new RegexSearchPlugin();