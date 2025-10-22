import { ErrorPattern, RootCauseAnalysis, ErrorPrediction, ErrorImpactAssessment } from '@/components/error-intelligence/error-intelligence-analyzer';

// Types for ML/AI processing
export interface ErrorEvent {
    id: string;
    timestamp: Date;
    errorType: string;
    message: string;
    stackTrace: string;
    userId?: string;
    sessionId?: string;
    userAgent?: string;
    url?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    context: Record<string, any>;
    tags: string[];
}

export interface PatternDetectionConfig {
    timeWindow: number; // hours
    minOccurrences: number;
    similarityThreshold: number;
    confidenceThreshold: number;
}

export interface MLModelResults {
    patterns: ErrorPattern[];
    rootCauses: RootCauseAnalysis[];
    predictions: ErrorPrediction[];
    impactAssessments: ErrorImpactAssessment[];
    confidence: number;
    processingTime: number;
}

// AI/ML algorithms for pattern detection
class PatternDetectionEngine {
    private config: PatternDetectionConfig;

    constructor(config: PatternDetectionConfig = {
        timeWindow: 24,
        minOccurrences: 5,
        similarityThreshold: 0.8,
        confidenceThreshold: 0.7
    }) {
        this.config = config;
    }

    // Detect error patterns using clustering algorithms
    public detectPatterns(errors: ErrorEvent[]): ErrorPattern[] {
        const patterns: ErrorPattern[] = [];

        // Group errors by similarity
        const clusters = this.clusterErrors(errors);

        clusters.forEach((cluster, index) => {
            if (cluster.length >= this.config.minOccurrences) {
                const pattern = this.createPatternFromCluster(cluster, `pattern-${Date.now()}-${index}`);
                if (pattern.confidence >= this.config.confidenceThreshold) {
                    patterns.push(pattern);
                }
            }
        });

        return patterns.sort((a, b) => b.frequency - a.frequency);
    }

    // Cluster errors based on similarity
    private clusterErrors(errors: ErrorEvent[]): ErrorEvent[][] {
        const clusters: ErrorEvent[][] = [];
        const processed = new Set<string>();

        errors.forEach(error => {
            if (processed.has(error.id)) return;

            const cluster = [error];
            processed.add(error.id);

            // Find similar errors
            errors.forEach(otherError => {
                if (processed.has(otherError.id)) return;

                const similarity = this.calculateSimilarity(error, otherError);
                if (similarity >= this.config.similarityThreshold) {
                    cluster.push(otherError);
                    processed.add(otherError.id);
                }
            });

            if (cluster.length > 1) {
                clusters.push(cluster);
            }
        });

        return clusters;
    }

    // Calculate similarity between two errors
    private calculateSimilarity(error1: ErrorEvent, error2: ErrorEvent): number {
        let score = 0;
        let factors = 0;

        // Error type similarity
        if (error1.errorType === error2.errorType) {
            score += 0.4;
        }
        factors += 0.4;

        // Message similarity using Levenshtein distance
        const messageSimilarity = this.calculateTextSimilarity(error1.message, error2.message);
        score += messageSimilarity * 0.3;
        factors += 0.3;

        // Stack trace similarity
        const stackSimilarity = this.calculateTextSimilarity(error1.stackTrace, error2.stackTrace);
        score += stackSimilarity * 0.2;
        factors += 0.2;

        // Context similarity
        const contextSimilarity = this.calculateContextSimilarity(error1.context, error2.context);
        score += contextSimilarity * 0.1;
        factors += 0.1;

        return factors > 0 ? score / factors : 0;
    }

    // Calculate text similarity using normalized Levenshtein distance
    private calculateTextSimilarity(text1: string, text2: string): number {
        if (!text1 || !text2) return 0;

        const maxLength = Math.max(text1.length, text2.length);
        if (maxLength === 0) return 1;

        const distance = this.levenshteinDistance(text1, text2);
        return (maxLength - distance) / maxLength;
    }

    // Levenshtein distance implementation
    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) {
            matrix[0][i] = i;
        }

        for (let j = 0; j <= str2.length; j++) {
            matrix[j][0] = j;
        }

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1, // deletion
                    matrix[j - 1][i] + 1, // insertion
                    matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    // Calculate context similarity
    private calculateContextSimilarity(context1: Record<string, any>, context2: Record<string, any>): number {
        const keys1 = Object.keys(context1);
        const keys2 = Object.keys(context2);
        const allKeys = new Set([...keys1, ...keys2]);

        if (allKeys.size === 0) return 1;

        let matches = 0;
        allKeys.forEach(key => {
            if (context1[key] === context2[key]) {
                matches++;
            }
        });

        return matches / allKeys.size;
    }

    // Create pattern from error cluster
    private createPatternFromCluster(cluster: ErrorEvent[], patternId: string): ErrorPattern {
        const firstError = cluster[0];
        const lastError = cluster[cluster.length - 1];

        // Determine common pattern elements
        const commonMessage = this.findCommonPattern(cluster.map(e => e.message));
        const commonStackTrace = this.findCommonPattern(cluster.map(e => e.stackTrace));
        const allTags = cluster.flatMap(e => e.tags);
        const uniqueTags = Array.from(new Set(allTags));

        // Calculate severity based on cluster
        const severities = cluster.map(e => e.severity);
        const avgSeverity = this.calculateAverageSeverity(severities);

        // Calculate confidence based on cluster consistency
        const confidence = this.calculatePatternConfidence(cluster);

        return {
            id: patternId,
            pattern: commonMessage || `${firstError.errorType} pattern`,
            errorType: firstError.errorType,
            severity: avgSeverity,
            frequency: cluster.length,
            firstOccurrence: new Date(Math.min(...cluster.map(e => e.timestamp.getTime()))),
            lastOccurrence: new Date(Math.max(...cluster.map(e => e.timestamp.getTime()))),
            affectedUsers: new Set(cluster.map(e => e.userId).filter(Boolean)).size,
            confidence,
            tags: uniqueTags,
            description: `Detected pattern with ${cluster.length} occurrences`,
            suggestedActions: this.generateSuggestedActions(firstError.errorType, cluster)
        };
    }

    // Find common pattern in text array
    private findCommonPattern(texts: string[]): string {
        if (texts.length === 0) return '';
        if (texts.length === 1) return texts[0];

        // Find longest common substring
        let commonPattern = texts[0];

        for (let i = 1; i < texts.length; i++) {
            commonPattern = this.longestCommonSubstring(commonPattern, texts[i]);
        }

        return commonPattern.trim();
    }

    // Find longest common substring
    private longestCommonSubstring(str1: string, str2: string): string {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(0));
        let maxLength = 0;
        let endPosition = 0;

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2[i - 1] === str1[j - 1]) {
                    matrix[i][j] = matrix[i - 1][j - 1] + 1;
                    if (matrix[i][j] > maxLength) {
                        maxLength = matrix[i][j];
                        endPosition = j;
                    }
                }
            }
        }

        return str1.substring(endPosition - maxLength, endPosition);
    }

    // Calculate average severity
    private calculateAverageSeverity(severities: string[]): 'low' | 'medium' | 'high' | 'critical' {
        const severityMap = { low: 1, medium: 2, high: 3, critical: 4 };
        const reverseMap = { 1: 'low', 2: 'medium', 3: 'high', 4: 'critical' } as const;

        const avgScore = severities.reduce((sum, severity) => sum + severityMap[severity as keyof typeof severityMap], 0) / severities.length;
        const roundedScore = Math.round(avgScore) as 1 | 2 | 3 | 4;

        return reverseMap[roundedScore];
    }

    // Calculate pattern confidence
    private calculatePatternConfidence(cluster: ErrorEvent[]): number {
        // Factors that increase confidence:
        // 1. Frequency (more occurrences = higher confidence)
        // 2. Consistency in error type
        // 3. Time distribution
        // 4. Similar contexts

        let confidence = 0;

        // Frequency factor (max 40 points)
        const frequencyScore = Math.min(40, cluster.length * 2);
        confidence += frequencyScore;

        // Consistency factor (max 30 points)
        const errorTypes = new Set(cluster.map(e => e.errorType));
        const consistencyScore = errorTypes.size === 1 ? 30 : Math.max(0, 30 - (errorTypes.size - 1) * 10);
        confidence += consistencyScore;

        // Time distribution factor (max 20 points)
        const timestamps = cluster.map(e => e.timestamp.getTime());
        const timeSpread = Math.max(...timestamps) - Math.min(...timestamps);
        const timeScore = timeSpread > 0 ? Math.min(20, timeSpread / (1000 * 60 * 60) * 2) : 20; // Hours to score
        confidence += timeScore;

        // Context similarity factor (max 10 points)
        const avgContextSimilarity = this.calculateAverageContextSimilarity(cluster);
        const contextScore = avgContextSimilarity * 10;
        confidence += contextScore;

        return Math.min(100, Math.max(0, confidence));
    }

    // Calculate average context similarity
    private calculateAverageContextSimilarity(cluster: ErrorEvent[]): number {
        if (cluster.length < 2) return 1;

        let totalSimilarity = 0;
        let comparisons = 0;

        for (let i = 0; i < cluster.length - 1; i++) {
            for (let j = i + 1; j < cluster.length; j++) {
                totalSimilarity += this.calculateContextSimilarity(cluster[i].context, cluster[j].context);
                comparisons++;
            }
        }

        return comparisons > 0 ? totalSimilarity / comparisons : 0;
    }

    // Generate suggested actions based on error type and patterns
    private generateSuggestedActions(errorType: string, cluster: ErrorEvent[]): string[] {
        const actions: string[] = [];

        // Generic actions based on error type
        switch (errorType.toLowerCase()) {
            case 'timeout':
            case 'connection_timeout':
                actions.push('Increase connection timeout values');
                actions.push('Implement connection retry logic');
                actions.push('Monitor network latency');
                break;

            case 'memory_leak':
            case 'out_of_memory':
                actions.push('Review memory usage patterns');
                actions.push('Implement proper cleanup in component lifecycle');
                actions.push('Monitor heap size and garbage collection');
                break;

            case 'database_error':
            case 'sql_error':
                actions.push('Optimize database queries');
                actions.push('Check database connection pool settings');
                actions.push('Review database indexes');
                break;

            case 'authentication_error':
            case 'auth_error':
                actions.push('Review authentication flow');
                actions.push('Check token expiration handling');
                actions.push('Validate user session management');
                break;

            default:
                actions.push('Investigate error root cause');
                actions.push('Add additional logging for debugging');
                actions.push('Review related code changes');
        }

        // Add frequency-based actions
        if (cluster.length > 10) {
            actions.push('Consider implementing circuit breaker pattern');
        }

        if (cluster.length > 50) {
            actions.push('Implement rate limiting');
            actions.push('Add error tracking alerts');
        }

        return actions;
    }
}

// Root cause analysis using decision trees and pattern matching
class RootCauseAnalyzer {
    public analyzeRootCause(pattern: ErrorPattern, relatedErrors: ErrorEvent[]): RootCauseAnalysis {
        const possibleCauses = this.identifyPossibleCauses(pattern, relatedErrors);
        const recommendations = this.generateRecommendations(possibleCauses, pattern);

        return {
            id: `rca-${Date.now()}`,
            errorId: pattern.id,
            possibleCauses,
            recommendations,
            confidence: this.calculateAnalysisConfidence(possibleCauses),
            analysisTimestamp: new Date()
        };
    }

    private identifyPossibleCauses(pattern: ErrorPattern, errors: ErrorEvent[]): Array<{
        cause: string;
        probability: number;
        evidence: string[];
        category: string;
    }> {
        const causes = [];

        // Analyze temporal patterns
        const temporalCause = this.analyzeTemporalPatterns(errors);
        if (temporalCause) causes.push(temporalCause);

        // Analyze user patterns
        const userCause = this.analyzeUserPatterns(errors);
        if (userCause) causes.push(userCause);

        // Analyze technical patterns
        const techCause = this.analyzeTechnicalPatterns(pattern, errors);
        if (techCause) causes.push(techCause);

        // Analyze environmental factors
        const envCause = this.analyzeEnvironmentalFactors(errors);
        if (envCause) causes.push(envCause);

        return causes.sort((a, b) => b.probability - a.probability);
    }

    private analyzeTemporalPatterns(errors: ErrorEvent[]) {
        // Analyze if errors occur at specific times
        const hours = errors.map(e => e.timestamp.getHours());
        const hourCounts = hours.reduce((acc, hour) => {
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        const peakHour = Object.entries(hourCounts).reduce((max, [hour, count]) =>
            count > max.count ? { hour: parseInt(hour), count } : max,
            { hour: 0, count: 0 }
        );

        if (peakHour.count > errors.length * 0.3) {
            return {
                cause: `Peak error occurrence during hour ${peakHour.hour}`,
                probability: Math.min(90, (peakHour.count / errors.length) * 100),
                evidence: [
                    `${peakHour.count} out of ${errors.length} errors occur at hour ${peakHour.hour}`,
                    `Possible correlation with high traffic or batch processing`
                ],
                category: 'temporal'
            };
        }

        return null;
    }

    private analyzeUserPatterns(errors: ErrorEvent[]) {
        const userIds = errors.map(e => e.userId).filter(Boolean);
        const uniqueUsers = new Set(userIds);

        if (uniqueUsers.size < userIds.length * 0.5) {
            // Many errors from same users
            return {
                cause: 'Specific user group or behavior pattern',
                probability: 75,
                evidence: [
                    `${uniqueUsers.size} unique users affected by ${errors.length} errors`,
                    'Possible user-specific configuration or usage pattern'
                ],
                category: 'user_behavior'
            };
        }

        return null;
    }

    private analyzeTechnicalPatterns(pattern: ErrorPattern, errors: ErrorEvent[]) {
        // Analyze stack traces for common technical issues
        const stackTraces = errors.map(e => e.stackTrace).filter(Boolean);
        const commonFrames = this.findCommonStackFrames(stackTraces);

        if (commonFrames.length > 0) {
            return {
                cause: 'Common code path or library issue',
                probability: 80,
                evidence: [
                    `Common stack frames: ${commonFrames.join(', ')}`,
                    'Possible bug in shared code or third-party library'
                ],
                category: 'technical'
            };
        }

        return null;
    }

    private analyzeEnvironmentalFactors(errors: ErrorEvent[]) {
        // Analyze user agents, URLs, etc.
        const userAgents = errors.map(e => e.userAgent).filter(Boolean);
        const uniqueAgents = new Set(userAgents);

        if (uniqueAgents.size === 1 && userAgents.length > 1) {
            return {
                cause: 'Browser or client-specific issue',
                probability: 70,
                evidence: [
                    `All errors from same user agent: ${Array.from(uniqueAgents)[0]}`,
                    'Possible browser compatibility issue'
                ],
                category: 'environment'
            };
        }

        return null;
    }

    private findCommonStackFrames(stackTraces: string[]): string[] {
        // Simple implementation - find common function names
        const allFrames = stackTraces.flatMap(trace =>
            trace.split('\n').map(line => line.trim()).filter(Boolean)
        );

        const frameCounts = allFrames.reduce((acc, frame) => {
            acc[frame] = (acc[frame] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(frameCounts)
            .filter(([, count]) => count > stackTraces.length * 0.5)
            .map(([frame]) => frame)
            .slice(0, 3); // Top 3 common frames
    }

    private generateRecommendations(causes: any[], pattern: ErrorPattern) {
        const recommendations = [];

        causes.forEach(cause => {
            switch (cause.category) {
                case 'temporal':
                    recommendations.push({
                        action: 'Implement load balancing during peak hours',
                        priority: 'high' as const,
                        effort: 'moderate' as const,
                        impact: 'high' as const
                    });
                    break;

                case 'technical':
                    recommendations.push({
                        action: 'Review and test common code paths',
                        priority: 'high' as const,
                        effort: 'moderate' as const,
                        impact: 'high' as const
                    });
                    break;

                case 'user_behavior':
                    recommendations.push({
                        action: 'Analyze user journey and add input validation',
                        priority: 'medium' as const,
                        effort: 'easy' as const,
                        impact: 'medium' as const
                    });
                    break;

                case 'environment':
                    recommendations.push({
                        action: 'Add browser compatibility testing',
                        priority: 'medium' as const,
                        effort: 'moderate' as const,
                        impact: 'medium' as const
                    });
                    break;
            }
        });

        // Add general recommendations
        if (pattern.frequency > 20) {
            recommendations.push({
                action: 'Implement comprehensive error monitoring',
                priority: 'high' as const,
                effort: 'moderate' as const,
                impact: 'high' as const
            });
        }

        return recommendations;
    }

    private calculateAnalysisConfidence(causes: any[]): number {
        if (causes.length === 0) return 20;

        const avgProbability = causes.reduce((sum, cause) => sum + cause.probability, 0) / causes.length;
        return Math.min(95, avgProbability + (causes.length * 5));
    }
}

// Error prediction engine using time series analysis
class ErrorPredictionEngine {
    public predictErrors(historicalPatterns: ErrorPattern[], currentMetrics: any): ErrorPrediction[] {
        const predictions: ErrorPrediction[] = [];

        // Analyze trends for each pattern
        historicalPatterns.forEach(pattern => {
            const prediction = this.predictPatternRecurrence(pattern, currentMetrics);
            if (prediction && prediction.probability > 30) {
                predictions.push(prediction);
            }
        });

        return predictions.sort((a, b) => b.probability - a.probability);
    }

    private predictPatternRecurrence(pattern: ErrorPattern, metrics: any): ErrorPrediction | null {
        // Simple prediction based on frequency and recency
        const hoursSinceLastOccurrence = (Date.now() - pattern.lastOccurrence.getTime()) / (1000 * 60 * 60);
        const avgFrequencyPerHour = pattern.frequency / 24; // Assume 24 hour window

        let probability = 0;

        // If pattern is recent and frequent
        if (hoursSinceLastOccurrence < 6 && avgFrequencyPerHour > 1) {
            probability = Math.min(90, 60 + (avgFrequencyPerHour * 10));
        } else if (hoursSinceLastOccurrence < 24) {
            probability = Math.min(70, 40 + (avgFrequencyPerHour * 5));
        } else {
            probability = Math.min(50, avgFrequencyPerHour * 10);
        }

        if (probability < 30) return null;

        const timeframe = this.estimateTimeframe(probability, avgFrequencyPerHour);
        const riskLevel = this.calculateRiskLevel(pattern.severity, probability);

        return {
            id: `pred-${pattern.id}-${Date.now()}`,
            predictedErrorType: pattern.errorType,
            probability,
            timeframe,
            triggerConditions: this.identifyTriggerConditions(pattern, metrics),
            preventiveActions: this.generatePreventiveActions(pattern),
            confidence: this.calculatePredictionConfidence(pattern, probability),
            riskLevel
        };
    }

    private estimateTimeframe(probability: number, frequency: number): string {
        if (probability > 80) return 'Next 2-4 hours';
        if (probability > 60) return 'Next 8-12 hours';
        if (probability > 40) return 'Next 24 hours';
        return 'Next 48-72 hours';
    }

    private calculateRiskLevel(severity: string, probability: number): 'low' | 'medium' | 'high' | 'critical' {
        const severityScore = { low: 1, medium: 2, high: 3, critical: 4 }[severity] || 1;
        const riskScore = (severityScore * probability) / 100;

        if (riskScore >= 3) return 'critical';
        if (riskScore >= 2) return 'high';
        if (riskScore >= 1) return 'medium';
        return 'low';
    }

    private identifyTriggerConditions(pattern: ErrorPattern, metrics: any): string[] {
        const conditions = [];

        if (pattern.tags.includes('database')) {
            conditions.push('High database connection utilization');
        }

        if (pattern.tags.includes('auth')) {
            conditions.push('Peak user authentication period');
        }

        if (pattern.frequency > 20) {
            conditions.push('Sustained high error frequency detected');
        }

        return conditions;
    }

    private generatePreventiveActions(pattern: ErrorPattern): string[] {
        return pattern.suggestedActions.map(action => `Preemptively ${action.toLowerCase()}`);
    }

    private calculatePredictionConfidence(pattern: ErrorPattern, probability: number): number {
        // Base confidence on pattern confidence and data quality
        const baseConfidence = pattern.confidence;
        const probabilityFactor = probability / 100;
        const frequencyFactor = Math.min(1, pattern.frequency / 10);

        return Math.min(95, baseConfidence * probabilityFactor * frequencyFactor);
    }
}

// Main service class that orchestrates all AI/ML components
export class ErrorIntelligenceService {
    private patternEngine: PatternDetectionEngine;
    private rootCauseAnalyzer: RootCauseAnalyzer;
    private predictionEngine: ErrorPredictionEngine;

    constructor(config?: PatternDetectionConfig) {
        this.patternEngine = new PatternDetectionEngine(config);
        this.rootCauseAnalyzer = new RootCauseAnalyzer();
        this.predictionEngine = new ErrorPredictionEngine();
    }

    // Main analysis method
    public async analyzeErrors(errors: ErrorEvent[]): Promise<MLModelResults> {
        const startTime = Date.now();

        try {
            // Step 1: Detect patterns
            const patterns = this.patternEngine.detectPatterns(errors);

            // Step 2: Analyze root causes for significant patterns
            const rootCauses = [];
            for (const pattern of patterns.slice(0, 5)) { // Top 5 patterns
                const relatedErrors = this.getRelatedErrors(pattern, errors);
                const analysis = this.rootCauseAnalyzer.analyzeRootCause(pattern, relatedErrors);
                rootCauses.push(analysis);
            }

            // Step 3: Generate predictions
            const predictions = this.predictionEngine.predictErrors(patterns, {});

            // Step 4: Calculate impact assessments (placeholder)
            const impactAssessments: ErrorImpactAssessment[] = [];

            const processingTime = Date.now() - startTime;
            const confidence = this.calculateOverallConfidence(patterns, rootCauses, predictions);

            return {
                patterns,
                rootCauses,
                predictions,
                impactAssessments,
                confidence,
                processingTime
            };
        } catch (error) {
            console.error('Error intelligence analysis failed:', error);
            throw new Error('Failed to complete error intelligence analysis');
        }
    }

    private getRelatedErrors(pattern: ErrorPattern, allErrors: ErrorEvent[]): ErrorEvent[] {
        return allErrors.filter(error =>
            error.errorType === pattern.errorType ||
            pattern.tags.some(tag => error.tags.includes(tag))
        );
    }

    private calculateOverallConfidence(patterns: ErrorPattern[], rootCauses: RootCauseAnalysis[], predictions: ErrorPrediction[]): number {
        const patternConfidence = patterns.length > 0 ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length : 0;
        const rootCauseConfidence = rootCauses.length > 0 ? rootCauses.reduce((sum, r) => sum + r.confidence, 0) / rootCauses.length : 0;
        const predictionConfidence = predictions.length > 0 ? predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length : 0;

        return (patternConfidence + rootCauseConfidence + predictionConfidence) / 3;
    }

    // Utility methods for external integration
    public async analyzeNewError(error: ErrorEvent): Promise<{
        matchingPatterns: ErrorPattern[];
        riskScore: number;
        recommendations: string[];
    }> {
        // Quick analysis for real-time error processing
        const patterns = this.patternEngine.detectPatterns([error]);
        const riskScore = this.calculateErrorRiskScore(error);
        const recommendations = this.generateImmediateRecommendations(error);

        return {
            matchingPatterns: patterns,
            riskScore,
            recommendations
        };
    }

    private calculateErrorRiskScore(error: ErrorEvent): number {
        let score = 0;

        // Severity factor
        const severityScores = { low: 10, medium: 30, high: 60, critical: 100 };
        score += severityScores[error.severity];

        // Frequency factor (if this error type has been seen before)
        // This would require historical data lookup

        // Context factor
        if (error.userId) score += 10; // Affects identified user
        if (error.url?.includes('/api/')) score += 20; // API error
        if (error.tags.includes('security')) score += 50; // Security-related

        return Math.min(100, score);
    }

    private generateImmediateRecommendations(error: ErrorEvent): string[] {
        const recommendations = [];

        if (error.severity === 'critical') {
            recommendations.push('Alert on-call engineer immediately');
        }

        if (error.tags.includes('security')) {
            recommendations.push('Review security implications');
            recommendations.push('Check for potential breach indicators');
        }

        if (error.message.includes('timeout')) {
            recommendations.push('Check network connectivity and service health');
        }

        return recommendations;
    }
}

export default ErrorIntelligenceService;