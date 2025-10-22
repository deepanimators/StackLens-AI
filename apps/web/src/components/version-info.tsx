"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Info,
  GitBranch,
  Calendar,
  GitCommit,
  TrendingUp,
  Code,
  Zap,
  Clock,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVersionData } from "@/hooks/useVersionData";

interface VersionInfoProps {
  trigger?: React.ReactNode;
  className?: string;
}

export function VersionInfoModal({ trigger, className }: VersionInfoProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const { versionData, loading, error } = useVersionData();

  if (loading) {
    return (
      <Button variant="outline" size="sm" className={className} disabled>
        <Info className="w-4 h-4 mr-2" />
        Loading...
      </Button>
    );
  }

  if (error || !versionData) {
    return (
      <Button variant="outline" size="sm" className={className} disabled>
        <Info className="w-4 h-4 mr-2" />
        v0.8.5
      </Button>
    );
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm" className={className}>
      <Info className="w-4 h-4 mr-2" />
      v{versionData.version}
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            StackLens AI Platform - Version {versionData.version}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="phases">Development</TabsTrigger>
            <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[70vh] mt-4">
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitCommit className="w-5 h-5" />
                    Current Release
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-lg px-3 py-1">
                        v{versionData.version}
                      </Badge>
                      <span className="text-sm text-muted-foreground">Beta Release</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{versionData.releaseDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GitCommit className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{versionData.totalCommits} commits</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-blue-200 dark:border-blue-800">
                      <CardContent className="p-4 text-center">
                        <Code className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold text-blue-600">
                          {versionData.totalCommits}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Commits
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-green-200 dark:border-green-800">
                      <CardContent className="p-4 text-center">
                        <Calendar className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        <div className="text-2xl font-bold text-green-600">
                          {Math.floor((new Date().getTime() - new Date(versionData.projectStart).getTime()) / (1000 * 60 * 60 * 24))}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Days in Development
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Recent Changes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {versionData.recentChanges.slice(0, 3).map((change, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{change.version}</Badge>
                          <span className="text-sm text-muted-foreground">{change.date}</span>
                        </div>
                        <ul className="space-y-1">
                          {change.changes.map((changeItem, changeIndex) => (
                            <li key={changeIndex} className="text-sm text-muted-foreground">
                              • {changeItem}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="phases" className="space-y-4">
              {Object.entries(versionData.phases).map(([phaseKey, phase]) => (
                <Card key={phaseKey}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GitBranch className="w-5 h-5" />
                      {phase.version} - {phase.description}
                      <Badge variant="outline" className="ml-auto">
                        {phase.date}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground mb-3">
                        Commit Range: {phase.commitRange}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {phase.features.map((feature, index) => (
                          <div key={index} className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                            <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="roadmap" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Upcoming Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {versionData.upcomingFeatures.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {Object.entries(versionData.roadmap).map(([version, roadmapItem]) => (
                <Card key={version} className="border-orange-200 dark:border-orange-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-orange-600" />
                      Version {version}
                      <Badge variant="outline" className="ml-auto text-orange-600">
                        Target: {roadmapItem.targetDate}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3 text-sm text-muted-foreground">
                      {roadmapItem.description}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {roadmapItem.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-2 p-2 rounded-md bg-orange-50 dark:bg-orange-950/20">
                          <Target className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Performance Benchmarks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(versionData.statistics.performanceMetrics).map(([metric, value]) => (
                      <div key={metric} className="p-4 rounded-lg bg-muted/50">
                        <div className="text-sm text-muted-foreground capitalize mb-1">
                          {metric.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </div>
                        <div className="text-lg font-semibold">{value}</div>
                      </div>
                    ))}
                  </div>
                  
                  <Separator className="my-6" />
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                      <div className="text-2xl font-bold text-green-600">{versionData.statistics.testCoverage}</div>
                      <div className="text-sm text-muted-foreground">Test Coverage</div>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                      <div className="text-2xl font-bold text-blue-600">{versionData.statistics.totalLines}</div>
                      <div className="text-sm text-muted-foreground">Lines of Code</div>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                      <div className="text-2xl font-bold text-purple-600">{versionData.totalCommits}</div>
                      <div className="text-sm text-muted-foreground">Git Commits</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Compact version info component for display in footers/headers
export function VersionInfoBadge({ className }: { className?: string }) {
  const { versionData, loading } = useVersionData();
  
  if (loading || !versionData) {
    return (
      <Badge variant="outline" className={cn("cursor-pointer hover:bg-muted", className)}>
        <GitBranch className="w-3 h-3 mr-1" />
        Loading...
      </Badge>
    );
  }

  return (
    <VersionInfoModal
      className={className}
      trigger={
        <Badge variant="outline" className={cn("cursor-pointer hover:bg-muted", className)}>
          <GitBranch className="w-3 h-3 mr-1" />
          v{versionData.version}
        </Badge>
      }
    />
  );
}