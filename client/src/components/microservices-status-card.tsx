import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authenticatedRequest } from "@/lib/auth";
import {
  Activity,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Brain,
  Search,
  Target,
  Layers,
} from "lucide-react";
import { useState } from "react";

interface MicroserviceHealth {
  service: string;
  status: string;
  healthy: boolean;
}

interface MicroservicesStatus {
  overall_status: string;
  services: MicroserviceHealth[];
  timestamp: string;
}

export default function MicroservicesStatusCard() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const {
    data: healthStatus,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ["/api/microservices/health"],
    queryFn: async (): Promise<MicroservicesStatus> => {
      const response = await authenticatedRequest(
        "GET",
        "/api/microservices/health"
      );
      return response.json();
    },
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds if enabled
    retry: 1,
  });

  const getServiceIcon = (serviceName: string) => {
    switch (serviceName) {
      case "embeddings":
        return <Brain className="h-4 w-4" />;
      case "semantic_search":
        return <Search className="h-4 w-4" />;
      case "ner":
        return <Target className="h-4 w-4" />;
      case "anomaly":
        return <AlertCircle className="h-4 w-4" />;
      case "vector_db":
        return <Layers className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (healthy: boolean) => {
    return healthy ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "bg-green-100 text-green-800 border-green-200";
      case "degraded":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "unknown":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-red-100 text-red-800 border-red-200";
    }
  };

  const healthyServicesCount =
    healthStatus?.services.filter((s) => s.healthy).length || 0;
  const totalServicesCount = healthStatus?.services.length || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          AI Microservices Status
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="text-xs"
          >
            {autoRefresh ? "Auto ON" : "Auto OFF"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {healthStatus ? (
          <div className="space-y-4">
            {/* Overall Status */}
            <div className="flex items-center justify-between">
              <Badge
                className={`${getOverallStatusColor(
                  healthStatus.overall_status
                )} border`}
              >
                {healthStatus.overall_status.toUpperCase()}
              </Badge>
              <span className="text-sm text-gray-500">
                {healthyServicesCount}/{totalServicesCount} services healthy
              </span>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {healthStatus.services.map((service) => (
                <div
                  key={service.service}
                  className={`flex items-center justify-between p-2 rounded-lg border ${
                    service.healthy
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getServiceIcon(service.service)}
                    <span className="text-xs font-medium">
                      {service.service.replace("_", " ")}
                    </span>
                  </div>
                  {getStatusIcon(service.healthy)}
                </div>
              ))}
            </div>

            {/* Last Updated */}
            <div className="text-xs text-gray-500 text-center">
              Last checked:{" "}
              {new Date(healthStatus.timestamp).toLocaleTimeString()}
            </div>

            {/* Quick Actions */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("/microservices-analysis", "_blank")}
                className="text-xs"
              >
                Open Full Analysis
              </Button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <span className="text-sm text-gray-500">
                Checking services...
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <XCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
            <span className="text-sm text-gray-500">
              Failed to check services
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
