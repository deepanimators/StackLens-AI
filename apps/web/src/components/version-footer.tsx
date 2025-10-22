"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  GitBranch,
  Calendar,
  GitCommit,
  Clock,
  Milestone,
  TrendingUp,
  Code2,
  Zap,
  Shield,
  Database,
  Brain,
  Activity,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVersionData } from "@/hooks/useVersionData";

interface VersionFooterProps {
  className?: string;
}

export function VersionFooter({ className }: VersionFooterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { versionData, loading, error } = useVersionData();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in-development':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'planned':
        return <Circle className="w-4 h-4 text-gray-400" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const features = [
    { name: 'AI/ML Services Foundation', status: 'completed', progress: 100 },
    { name: 'Production Infrastructure', status: 'completed', progress: 100 },
    { name: 'Comprehensive Testing (675+ tests)', status: 'completed', progress: 100 },
    { name: 'Firebase Authentication & 2FA', status: 'completed', progress: 100 },
    { name: 'Searchable UI Components', status: 'completed', progress: 100 },
    { name: 'Git-based Versioning System', status: 'completed', progress: 100 },
    { name: 'Admin Settings & Security', status: 'completed', progress: 95 },
    { name: 'Advanced Analytics Dashboard', status: 'in-development', progress: 75 },
    { name: 'Mobile Responsiveness', status: 'in-development', progress: 60 },
    { name: 'Enterprise Security Audit', status: 'planned', progress: 25 },
    { name: 'Production Deployment', status: 'planned', progress: 35 }
  ];

  const technologies = [
    {
      category: "Frontend",
      items: [
        { name: "React 18", icon: <Code2 className="w-4 h-4" /> },
        { name: "TypeScript", icon: <Code2 className="w-4 h-4" /> },
        { name: "Vite", icon: <Zap className="w-4 h-4" /> },
        { name: "Tailwind CSS", icon: <Code2 className="w-4 h-4" /> },
        { name: "Radix UI", icon: <Code2 className="w-4 h-4" /> }
      ]
    },
    {
      category: "Backend", 
      items: [
        { name: "Node.js + Express", icon: <Code2 className="w-4 h-4" /> },
        { name: "Python AI Services", icon: <Brain className="w-4 h-4" /> },
        { name: "Firebase Auth", icon: <Shield className="w-4 h-4" /> },
        { name: "Drizzle ORM", icon: <Database className="w-4 h-4" /> },
        { name: "PostgreSQL", icon: <Database className="w-4 h-4" /> }
      ]
    },
    {
      category: "DevOps",
      items: [
        { name: "GitHub Actions CI/CD", icon: <Activity className="w-4 h-4" /> },
        { name: "Playwright Testing", icon: <Activity className="w-4 h-4" /> },
        { name: "Docker", icon: <Activity className="w-4 h-4" /> },
        { name: "ESLint + Prettier", icon: <Activity className="w-4 h-4" /> },
        { name: "Windows Deployment", icon: <Activity className="w-4 h-4" /> }
      ]
    }
  ];

  if (loading || !versionData) {
    return (
      <footer className={cn("border-t bg-muted/50 py-4 px-6", className)}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="text-sm text-muted-foreground">
            Loading version info...
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className={cn("border-t bg-muted/50 py-4 px-6", className)}>
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            StackLens AI Platform
          </div>
          <Separator orientation="vertical" className="h-4" />
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-auto p-1">
                <Badge variant="secondary" className="gap-1">
                  <GitBranch className="w-3 h-3" />
                  v{versionData.version}
                </Badge>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  StackLens AI Platform - Version {versionData.version}
                </DialogTitle>
              </DialogHeader>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="milestones">Milestones</TabsTrigger>
                  <TabsTrigger value="features">Features</TabsTrigger>
                  <TabsTrigger value="technology">Technology</TabsTrigger>
                  <TabsTrigger value="changelog">Changelog</TabsTrigger>
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="changes">Recent</TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[500px] mt-4">
                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <GitCommit className="w-4 h-4" />
                            Version
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-2xl font-bold">{versionData.version}</div>
                          <p className="text-xs text-muted-foreground">
                            Released {versionData.releaseDate}
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Project Age
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-2xl font-bold">
                            {Math.ceil((new Date().getTime() - new Date(versionData.projectStart).getTime()) / (1000 * 60 * 60 * 24 * 7))} weeks
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Since {versionData.projectStart}
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <GitCommit className="w-4 h-4" />
                            Commits
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-2xl font-bold">{versionData.totalCommits}</div>
                          <p className="text-xs text-muted-foreground">
                            Hash: {versionData.commitHash}
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Test Coverage
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-2xl font-bold">{versionData.statistics?.testCoverage || '85%+'}</div>
                          <p className="text-xs text-muted-foreground">
                            675+ tests passing
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {versionData.statistics?.performanceMetrics && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5" />
                            Performance Metrics
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {Object.entries(versionData.statistics.performanceMetrics).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-sm font-medium capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}:
                              </span>
                              <Badge variant="secondary">{value}</Badge>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="milestones" className="space-y-4">
                    {versionData.developmentMilestones && versionData.developmentMilestones.length > 0 ? (
                      <div className="space-y-4">
                        {versionData.developmentMilestones.map((milestone, index) => (
                          <Card key={index}>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Milestone className="w-4 h-4" />
                                {milestone.milestone}
                              </CardTitle>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                {milestone.date}
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm">{milestone.description}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-center text-muted-foreground">Development milestone data will be loaded...</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="features" className="space-y-4">
                    <div className="grid gap-3">
                      {features.map((feature, index) => (
                        <Card key={index}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getStatusIcon(feature.status)}
                                <div>
                                  <h4 className="font-medium">{feature.name}</h4>
                                  <p className="text-sm text-muted-foreground capitalize">
                                    {feature.status.replace('-', ' ')}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right min-w-[60px]">
                                <div className="text-sm font-medium">{feature.progress}%</div>
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${feature.progress}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="technology" className="space-y-4">
                    <div className="grid gap-4">
                      {technologies.map((tech) => (
                        <Card key={tech.category}>
                          <CardHeader>
                            <CardTitle>{tech.category}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-3">
                              {tech.items.map((item) => (
                                <div key={item.name} className="flex items-center gap-2">
                                  {item.icon}
                                  <span className="text-sm">{item.name}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="changes" className="space-y-4">
                    {versionData.recentChanges && versionData.recentChanges.length > 0 ? (
                      <div className="space-y-4">
                        {versionData.recentChanges.map((change, index) => (
                          <Card key={index}>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <GitCommit className="w-4 h-4" />
                                Version {change.version}
                              </CardTitle>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                {change.date}
                              </div>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                {change.changes.map((item, idx) => (
                                  <li key={idx} className="text-sm flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-center text-muted-foreground">Recent changes data will be loaded...</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Changelog Tab */}
                  <TabsContent value="changelog" className="space-y-4">
                    {versionData.changelog && Object.keys(versionData.changelog).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(versionData.changelog)
                          .sort(([,a], [,b]) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map(([version, log]) => (
                          <Card key={version}>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <GitCommit className="w-4 h-4" />
                                {version} - {log.title}
                              </CardTitle>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  {log.date}
                                </div>
                                <Badge variant={log.type === 'Enhancement' ? 'default' : log.type === 'Security' ? 'destructive' : 'secondary'}>
                                  {log.type}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground mb-4">{log.description}</p>
                              
                              {/* All changes in a unified list */}
                              <ul className="space-y-2">
                                {/* New Features & Enhancements */}
                                {log.changes && log.changes.map((change, idx) => (
                                  <li key={`change-${idx}`} className="text-sm flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <span className="font-medium text-blue-600">{change.type}</span>
                                      <span className="ml-2">{change.description}</span>
                                    </div>
                                  </li>
                                ))}
                                
                                {/* Bug Fixes */}
                                {log.bugfixes && log.bugfixes.map((fix, idx) => (
                                  <li key={`bugfix-${idx}`} className="text-sm flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                    <span>🐛 {fix}</span>
                                  </li>
                                ))}
                                
                                {/* Performance Improvements */}
                                {log.performance && log.performance.map((perf, idx) => (
                                  <li key={`perf-${idx}`} className="text-sm flex items-start gap-2">
                                    <Zap className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span>⚡ {perf}</span>
                                  </li>
                                ))}
                                
                                {/* Breaking Changes */}
                                {log.breaking && log.breaking.map((breaking, idx) => (
                                  <li key={`breaking-${idx}`} className="text-sm flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-red-600">⚠️ BREAKING: {breaking}</span>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-center text-muted-foreground">Changelog data will be loaded...</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Upcoming Features Tab */}
                  <TabsContent value="upcoming" className="space-y-4">
                    {versionData.upcomingEnhancements && Object.keys(versionData.upcomingEnhancements).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(versionData.upcomingEnhancements).map(([version, enhancement]) => (
                          <Card key={version}>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                {version} - {enhancement.title}
                              </CardTitle>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  Target: {enhancement.targetDate}
                                </div>
                                <Badge variant={enhancement.priority === 'Critical' ? 'destructive' : enhancement.priority === 'High' ? 'default' : 'secondary'}>
                                  {enhancement.priority} Priority
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {/* Features by category */}
                              {enhancement.features && enhancement.features.map((featureGroup, idx) => (
                                <div key={idx}>
                                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-blue-500" />
                                    {featureGroup.category}
                                  </h4>
                                  <ul className="space-y-1 ml-6">
                                    {featureGroup.items.map((item, itemIdx) => (
                                      <li key={itemIdx} className="text-sm text-muted-foreground">• {item}</li>
                                    ))}
                                  </ul>
                                </div>
                              ))}

                              {/* Tech Debt */}
                              {enhancement.techDebt && enhancement.techDebt.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                    <Code2 className="w-4 h-4 text-orange-500" />
                                    Technical Improvements
                                  </h4>
                                  <ul className="space-y-1 ml-6">
                                    {enhancement.techDebt.map((debt, idx) => (
                                      <li key={idx} className="text-sm text-muted-foreground">• {debt}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Milestones */}
                              {enhancement.milestones && enhancement.milestones.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                    <Milestone className="w-4 h-4 text-purple-500" />
                                    Key Milestones
                                  </h4>
                                  <ul className="space-y-1 ml-6">
                                    {enhancement.milestones.map((milestone, idx) => (
                                      <li key={idx} className="text-sm text-muted-foreground">🎯 {milestone}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-center text-muted-foreground">Upcoming features data will be loaded...</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="text-xs text-muted-foreground">
          © 2025 StackLens AI Platform
        </div>
      </div>
    </footer>
  );
}