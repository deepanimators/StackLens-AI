import { useState, useEffect, useCallback, useRef } from 'react';
import ErrorIntelligenceService, { ErrorEvent, MLModelResults, PatternDetectionConfig } from '@/services/error-intelligence';
import { ErrorPattern, RootCauseAnalysis, ErrorPrediction } from '@/components/error-intelligence/error-intelligence-analyzer';

export interface UseErrorIntelligenceOptions {
    config?: PatternDetectionConfig;
    autoAnalyze?: boolean;
    analysisInterval?: number; // minutes
    onAnalysisComplete?: (results: MLModelResults) => void;
    onNewPattern?: (pattern: ErrorPattern) => void;
    onHighRiskError?: (error: ErrorEvent, riskScore: number) => void;
}

export interface ErrorIntelligenceHookReturn {
    // Service state
    isAnalyzing: boolean;
    isInitialized: boolean;
    analysisProgress: number;
    lastAnalysis: Date | null;
    error: Error | null;

    // Analysis results
    patterns: ErrorPattern[];
    rootCauses: RootCauseAnalysis[];
    predictions: ErrorPrediction[];
    confidence: number;
    processingTime: number;

    // Actions
    analyzeErrors: (errors: ErrorEvent[]) => Promise<MLModelResults>;
    analyzeNewError: (error: ErrorEvent) => Promise<void>;
    runAnalysis: () => Promise<void>;
    clearResults: () => void;

    // Real-time processing
    processErrorStream: (errorStream: ErrorEvent[]) => void;

    // Statistics
    stats: {
        totalErrorsProcessed: number;
        patternsDetected: number;
        averageConfidence: number;
        highRiskAlertsGenerated: number;
    };
}

export function useErrorIntelligence(options: UseErrorIntelligenceOptions = {}): ErrorIntelligenceHookReturn {
    const {
        config,
        autoAnalyze = false,
        analysisInterval = 30,
        onAnalysisComplete,
        onNewPattern,
        onHighRiskError
    } = options;

    // State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState(0);
    const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);
    const [error, setError] = useState<Error | null>(null);

    // Analysis results
    const [patterns, setPatterns] = useState<ErrorPattern[]>([]);
    const [rootCauses, setRootCauses] = useState<RootCauseAnalysis[]>([]);
    const [predictions, setPredictions] = useState<ErrorPrediction[]>([]);
    const [confidence, setConfidence] = useState(0);
    const [processingTime, setProcessingTime] = useState(0);

    // Statistics
    const [stats, setStats] = useState({
        totalErrorsProcessed: 0,
        patternsDetected: 0,
        averageConfidence: 0,
        highRiskAlertsGenerated: 0
    });

    // Service instance ref
    const serviceRef = useRef<ErrorIntelligenceService | null>(null);
    const errorBufferRef = useRef<ErrorEvent[]>([]);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize service
    useEffect(() => {
        try {
            serviceRef.current = new ErrorIntelligenceService(config);
            setIsInitialized(true);
            setError(null);
        } catch (err) {
            setError(err as Error);
            setIsInitialized(false);
        }
    }, [config]);

    // Setup auto-analysis
    useEffect(() => {
        if (!autoAnalyze || !isInitialized) return;

        const interval = setInterval(() => {
            if (errorBufferRef.current.length > 0 && !isAnalyzing) {
                runAnalysis();
            }
        }, analysisInterval * 60 * 1000);

        intervalRef.current = interval;
        return () => clearInterval(interval);
    }, [autoAnalyze, isInitialized, analysisInterval, isAnalyzing]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    // Main analysis function
    const analyzeErrors = useCallback(async (errors: ErrorEvent[]): Promise<MLModelResults> => {
        if (!serviceRef.current) {
            throw new Error('Error intelligence service not initialized');
        }

        setIsAnalyzing(true);
        setAnalysisProgress(0);
        setError(null);

        try {
            // Simulate progress updates
            const progressInterval = setInterval(() => {
                setAnalysisProgress(prev => Math.min(90, prev + Math.random() * 20));
            }, 500);

            const results = await serviceRef.current.analyzeErrors(errors);

            clearInterval(progressInterval);
            setAnalysisProgress(100);

            // Update state with results
            setPatterns(results.patterns);
            setRootCauses(results.rootCauses);
            setPredictions(results.predictions);
            setConfidence(results.confidence);
            setProcessingTime(results.processingTime);
            setLastAnalysis(new Date());

            // Update statistics
            setStats(prevStats => ({
                totalErrorsProcessed: prevStats.totalErrorsProcessed + errors.length,
                patternsDetected: prevStats.patternsDetected + results.patterns.length,
                averageConfidence: (prevStats.averageConfidence + results.confidence) / 2,
                highRiskAlertsGenerated: prevStats.highRiskAlertsGenerated + results.predictions.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical').length
            }));

            // Notify callbacks
            onAnalysisComplete?.(results);

            // Check for new patterns
            results.patterns.forEach(pattern => {
                if (pattern.confidence > 80) {
                    onNewPattern?.(pattern);
                }
            });

            return results;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsAnalyzing(false);
            setTimeout(() => setAnalysisProgress(0), 1000);
        }
    }, [onAnalysisComplete, onNewPattern]);

    // Analyze single new error
    const analyzeNewError = useCallback(async (error: ErrorEvent): Promise<void> => {
        if (!serviceRef.current) return;

        try {
            const analysis = await serviceRef.current.analyzeNewError(error);

            // Check risk score
            if (analysis.riskScore > 70) {
                setStats(prev => ({
                    ...prev,
                    highRiskAlertsGenerated: prev.highRiskAlertsGenerated + 1
                }));

                onHighRiskError?.(error, analysis.riskScore);
            }

            // Add to buffer for batch processing
            errorBufferRef.current.push(error);

            // Keep buffer size manageable
            if (errorBufferRef.current.length > 1000) {
                errorBufferRef.current = errorBufferRef.current.slice(-500);
            }

            // Update stats
            setStats(prev => ({
                ...prev,
                totalErrorsProcessed: prev.totalErrorsProcessed + 1
            }));

        } catch (err) {
            console.error('Failed to analyze new error:', err);
            setError(err as Error);
        }
    }, [onHighRiskError]);

    // Run analysis on buffered errors
    const runAnalysis = useCallback(async (): Promise<void> => {
        const errors = [...errorBufferRef.current];
        if (errors.length === 0) return;

        try {
            await analyzeErrors(errors);
            // Clear processed errors from buffer
            errorBufferRef.current = [];
        } catch (err) {
            console.error('Analysis failed:', err);
        }
    }, [analyzeErrors]);

    // Clear all results
    const clearResults = useCallback(() => {
        setPatterns([]);
        setRootCauses([]);
        setPredictions([]);
        setConfidence(0);
        setProcessingTime(0);
        setLastAnalysis(null);
        errorBufferRef.current = [];
    }, []);

    // Process error stream for real-time analysis
    const processErrorStream = useCallback((errorStream: ErrorEvent[]) => {
        errorStream.forEach(error => {
            analyzeNewError(error);
        });
    }, [analyzeNewError]);

    return {
        // Service state
        isAnalyzing,
        isInitialized,
        analysisProgress,
        lastAnalysis,
        error,

        // Analysis results
        patterns,
        rootCauses,
        predictions,
        confidence,
        processingTime,

        // Actions
        analyzeErrors,
        analyzeNewError,
        runAnalysis,
        clearResults,

        // Real-time processing
        processErrorStream,

        // Statistics
        stats
    };
}

// Mock hook for development and testing
export function useMockErrorIntelligence(): ErrorIntelligenceHookReturn {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState(0);
    const [patterns, setPatterns] = useState<ErrorPattern[]>([
        {
            id: 'mock-pattern-1',
            pattern: 'Database connection timeout during peak hours',
            errorType: 'connection_timeout',
            severity: 'high',
            frequency: 45,
            firstOccurrence: new Date(Date.now() - 24 * 60 * 60 * 1000),
            lastOccurrence: new Date(Date.now() - 2 * 60 * 60 * 1000),
            affectedUsers: 234,
            confidence: 89,
            tags: ['database', 'timeout', 'performance'],
            description: 'Recurring pattern of database timeouts during high traffic periods',
            suggestedActions: [
                'Optimize database connection pooling',
                'Implement query optimization',
                'Add database monitoring alerts'
            ]
        }
    ]);

    const mockAnalyzeErrors = async (errors: ErrorEvent[]): Promise<MLModelResults> => {
        setIsAnalyzing(true);
        setAnalysisProgress(0);

        // Simulate analysis progress
        for (let i = 0; i <= 100; i += 20) {
            await new Promise(resolve => setTimeout(resolve, 200));
            setAnalysisProgress(i);
        }

        setIsAnalyzing(false);

        return {
            patterns,
            rootCauses: [],
            predictions: [],
            impactAssessments: [],
            confidence: 85,
            processingTime: 1200
        };
    };

    return {
        isAnalyzing,
        isInitialized: true,
        analysisProgress,
        lastAnalysis: new Date(),
        error: null,
        patterns,
        rootCauses: [],
        predictions: [],
        confidence: 85,
        processingTime: 1200,
        analyzeErrors: mockAnalyzeErrors,
        analyzeNewError: async () => { },
        runAnalysis: async () => {
            await mockAnalyzeErrors([]);
        },
        clearResults: () => setPatterns([]),
        processErrorStream: () => { },
        stats: {
            totalErrorsProcessed: 156,
            patternsDetected: 8,
            averageConfidence: 82,
            highRiskAlertsGenerated: 3
        }
    };
}

export default useErrorIntelligence;