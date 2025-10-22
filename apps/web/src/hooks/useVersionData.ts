import { useState, useEffect } from 'react';

interface VersionData {
    version: string;
    releaseDate: string;
    commitHash: string;
    totalCommits: number;
    projectStart: string;
    phases: {
        [key: string]: {
            version: string;
            date: string;
            description: string;
            features: string[];
        };
    };
    roadmap: {
        [key: string]: {
            targetDate: string;
            description: string;
            features: string[];
        };
    };
    developmentMilestones: {
        date: string;
        milestone: string;
        description: string;
    }[];
    statistics: {
        totalLines: string;
        testCoverage: string;
        performanceMetrics: {
            [key: string]: string;
        };
    };
    recentChanges: {
        version: string;
        date: string;
        changes: string[];
    }[];
    changelog: {
        [key: string]: {
            date: string;
            type: string;
            title: string;
            description: string;
            changes: {
                type: string;
                description: string;
            }[];
            bugfixes: string[];
            breaking: string[];
            performance: string[];
        };
    };
    upcomingEnhancements: {
        [key: string]: {
            targetDate: string;
            title: string;
            priority: string;
            features: {
                category: string;
                items: string[];
            }[];
            techDebt?: string[];
            milestones?: string[];
        };
    };
}

export function useVersionData() {
    const [versionData, setVersionData] = useState<VersionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadVersionData() {
            try {
                setLoading(true);
                // Try to fetch from API endpoint first
                let response = await fetch('/api/version');

                if (!response.ok) {
                    // Fallback to static file
                    response = await fetch('/version-data.json');
                }

                if (!response.ok) {
                    throw new Error('Could not load version data');
                }

                const data = await response.json();
                setVersionData(data);
            } catch (err) {
                console.error('Failed to load version data:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');

                // Fallback to default data
                setVersionData({
                    version: "0.9.1",
                    releaseDate: "2025-10-22",
                    commitHash: "a6316e0a",
                    totalCommits: 118,
                    projectStart: "2025-07-12",
                    phases: {
                        current: {
                            version: "0.9.1",
                            date: "2025-10-22",
                            description: "Phase 12: Enhanced UX & Comprehensive Versioning",
                            features: [
                                "Searchable store/kiosk dropdowns with real-time filtering",
                                "Git-based comprehensive versioning system",
                                "Enhanced upload page UX and reusable components"
                            ]
                        }
                    },
                    roadmap: {
                        "0.9.5": {
                            targetDate: "2025-11-15",
                            description: "UI/UX Polish & Performance",
                            features: ["Advanced search and filtering", "Real-time analytics dashboard"]
                        },
                        "1.0.0": {
                            targetDate: "2025-12-31",
                            description: "Production Release",
                            features: ["Complete enterprise feature set", "Full security audit completion"]
                        }
                    },
                    developmentMilestones: [
                        {
                            date: "2025-07-12",
                            milestone: "Project Genesis & Initial AI Foundation",
                            description: "Initial project structure, AI/ML foundation, and basic authentication system established"
                        },
                        {
                            date: "2025-07-14",
                            milestone: "Core Platform Features Complete",
                            description: "File upload system, analysis reports, dashboard, and database features implemented"
                        },
                        {
                            date: "2025-10-22",
                            milestone: "Enhanced UX & Comprehensive Versioning",
                            description: "Searchable UI components and Git-based comprehensive version tracking system"
                        }
                    ],
                    statistics: {
                        totalLines: "~15,000+",
                        testCoverage: "85%+",
                        performanceMetrics: {
                            fileUpload: "< 2 seconds for 10MB files",
                            errorAnalysis: "< 30 seconds typical analysis",
                            dashboardLoad: "< 1 second initial load",
                            searchResponse: "< 500ms search response"
                        }
                    },
                    recentChanges: [
                        {
                            version: "0.9.1",
                            date: "2025-10-22",
                            changes: [
                                "Implemented searchable store and kiosk dropdowns",
                                "Added comprehensive versioning system",
                                "Enhanced upload page UX"
                            ]
                        }
                    ],
                    changelog: {},
                    upcomingEnhancements: {}
                });
            } finally {
                setLoading(false);
            }
        }

        loadVersionData();
    }, []);

    return { versionData, loading, error };
}