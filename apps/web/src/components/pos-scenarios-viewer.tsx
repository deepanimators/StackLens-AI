import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { authenticatedRequest } from "@/lib/auth";
import {
  Search,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Filter,
  Grid3x3,
  List,
} from "lucide-react";

interface Scenario {
  errorCode: string;
  errorDescription?: string;
  description?: string;
  errorType?: string;
  severity: string;
  category: string;
  resolutionSteps: string[];
  preventionMeasures: string[];
  keywords?: string[];
  systemMetrics?: Record<string, any>;
  businessContext?: Record<string, any>;
  confidence?: number;
}

interface ScenariosResponse {
  success: boolean;
  total: number;
  scenarios: Scenario[];
  categoryDistribution: Record<string, number>;
  filters: {
    category: string;
    severity: string;
    search: string;
  };
}

const CATEGORIES = [
  "PAYMENT",
  "INVENTORY",
  "TAX",
  "HARDWARE",
  "AUTHENTICATION",
  "DATA_QUALITY",
];

const SEVERITIES = ["critical", "high", "medium", "low"];

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-300",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  low: "bg-blue-100 text-blue-800 border-blue-300",
};

const CATEGORY_COLORS: Record<string, string> = {
  PAYMENT: "bg-purple-50",
  INVENTORY: "bg-green-50",
  TAX: "bg-amber-50",
  HARDWARE: "bg-indigo-50",
  AUTHENTICATION: "bg-pink-50",
  DATA_QUALITY: "bg-cyan-50",
};

const CATEGORY_ICONS: Record<string, any> = {
  PAYMENT: "💳",
  INVENTORY: "📦",
  TAX: "📊",
  HARDWARE: "🖥️",
  AUTHENTICATION: "🔐",
  DATA_QUALITY: "✓",
};

export default function POSScenariosViewer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  // Fetch scenarios
  const { data: scenariosData, isLoading, error } = useQuery({
    queryKey: [
      "/api/ai/train-suggestion-model/scenarios",
      selectedCategory,
      selectedSeverity,
      searchQuery,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.append("category", selectedCategory);
      if (selectedSeverity !== "all") params.append("severity", selectedSeverity);
      if (searchQuery) params.append("search", searchQuery);

      const response = await authenticatedRequest(
        "GET",
        `/api/ai/train-suggestion-model/scenarios?${params.toString()}`
      );
      return response.json() as Promise<ScenariosResponse>;
    },
  });

  const filteredScenarios = useMemo(() => {
    return scenariosData?.scenarios || [];
  }, [scenariosData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">POS Error Scenarios</h1>
        <p className="text-muted-foreground mt-2">
          Browse and understand all {scenariosData?.total || 0} POS error scenarios used in ML model training
        </p>
      </div>

      {/* Statistics Cards */}
      {scenariosData && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(scenariosData.categoryDistribution).map(
            ([category, count]) => (
              <Card key={category} className={`${CATEGORY_COLORS[category] || "bg-gray-50"}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">{category}</p>
                      <p className="text-2xl font-bold">{count}</p>
                    </div>
                    <div className="text-2xl">{CATEGORY_ICONS[category]}</div>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Search</label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search error codes, descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_ICONS[cat]} {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Severity Filter */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Severity</label>
              <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  {SEVERITIES.map((sev) => (
                    <SelectItem key={sev} value={sev}>
                      {sev.charAt(0).toUpperCase() + sev.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View Mode */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">View Mode</label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="w-full"
                >
                  <Grid3x3 className="h-4 w-4 mr-2" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="w-full"
                >
                  <List className="h-4 w-4 mr-2" />
                  List
                </Button>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-semibold">{filteredScenarios.length}</span> of{" "}
              <span className="font-semibold">{scenariosData?.total || 0}</span> scenarios
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Scenarios Grid/List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Failed to load scenarios. Please try again.</AlertDescription>
        </Alert>
      ) : filteredScenarios.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No scenarios found matching your filters.</p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScenarios.map((scenario) => (
            <Card
              key={scenario.errorCode}
              className={`cursor-pointer hover:shadow-lg transition-all ${
                CATEGORY_COLORS[scenario.category] || "bg-gray-50"
              }`}
              onClick={() =>
                setExpandedScenario(
                  expandedScenario === scenario.errorCode ? null : scenario.errorCode
                )
              }
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-base">{scenario.errorCode}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {scenario.errorDescription || scenario.description}
                    </CardDescription>
                  </div>
                  <div className="text-lg">{CATEGORY_ICONS[scenario.category]}</div>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={SEVERITY_COLORS[scenario.severity]}
                  >
                    {scenario.severity}
                  </Badge>
                  <Badge variant="secondary">{scenario.category}</Badge>
                  {scenario.confidence && (
                    <Badge variant="outline" className="bg-green-50">
                      {(scenario.confidence * 100).toFixed(0)}% confidence
                    </Badge>
                  )}
                </div>

                {expandedScenario === scenario.errorCode && (
                  <div className="pt-4 space-y-3 border-t">
                    {/* Resolution Steps */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Resolution Steps:</h4>
                      <ul className="text-sm space-y-1">
                        {scenario.resolutionSteps?.slice(0, 3).map((step, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-muted-foreground">{i + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                        {scenario.resolutionSteps?.length > 3 && (
                          <li className="text-xs text-muted-foreground italic">
                            +{scenario.resolutionSteps.length - 3} more steps
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Prevention Measures */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Prevention:</h4>
                      <ul className="text-sm space-y-1">
                        {scenario.preventionMeasures?.slice(0, 2).map((measure, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-green-600">✓</span>
                            <span>{measure}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => setShowDetails(scenario.errorCode)}
                    >
                      View Full Details
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {filteredScenarios.map((scenario) => (
            <Card
              key={scenario.errorCode}
              className="cursor-pointer hover:shadow-md transition-all"
              onClick={() =>
                setExpandedScenario(
                  expandedScenario === scenario.errorCode ? null : scenario.errorCode
                )
              }
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="text-3xl">{CATEGORY_ICONS[scenario.category]}</div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{scenario.errorCode}</h3>
                      <Badge
                        variant="outline"
                        className={SEVERITY_COLORS[scenario.severity]}
                      >
                        {scenario.severity}
                      </Badge>
                      <Badge variant="secondary">{scenario.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {scenario.errorDescription || scenario.description}
                    </p>

                    {/* Expanded Details */}
                    {expandedScenario === scenario.errorCode && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div>
                          <p className="text-sm font-medium mb-2">Resolution Steps:</p>
                          <ol className="text-sm space-y-1 list-decimal list-inside">
                            {scenario.resolutionSteps?.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ol>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Prevention Measures:</p>
                          <ul className="text-sm space-y-1">
                            {scenario.preventionMeasures?.map((measure, i) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-green-600">✓</span>
                                <span>{measure}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDetails(scenario.errorCode)}
                        >
                          View Full Details
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Expand Icon */}
                  <div className="mt-1">
                    {expandedScenario === scenario.errorCode ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {showDetails && (
        <ScenarioDetailsModal
          errorCode={showDetails}
          onClose={() => setShowDetails(null)}
        />
      )}
    </div>
  );
}

/**
 * Scenario Details Modal
 */
function ScenarioDetailsModal({
  errorCode,
  onClose,
}: {
  errorCode: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: [`/api/ai/train-suggestion-model/scenarios/${errorCode}`],
    queryFn: async () => {
      const response = await authenticatedRequest(
        "GET",
        `/api/ai/train-suggestion-model/scenarios/${errorCode}`
      );
      return response.json();
    },
  });

  const scenario: Scenario = data?.scenario;

  return (
    <Dialog open={!!scenario} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : scenario ? (
          <>
            <DialogHeader>
              <div className="flex items-start gap-3">
                <div className="text-4xl">{CATEGORY_ICONS[scenario.category]}</div>
                <div className="flex-1">
                  <DialogTitle>{scenario.errorCode}</DialogTitle>
                  <DialogDescription className="mt-2">
                    {scenario.errorDescription || scenario.description}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={SEVERITY_COLORS[scenario.severity]}
                >
                  {scenario.severity}
                </Badge>
                <Badge variant="secondary">{scenario.category}</Badge>
                {scenario.confidence && (
                  <Badge variant="outline" className="bg-green-50">
                    {(scenario.confidence * 100).toFixed(0)}% confidence
                  </Badge>
                )}
              </div>

              {/* Tabs */}
              <Tabs defaultValue="resolution" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="resolution">Resolution</TabsTrigger>
                  <TabsTrigger value="prevention">Prevention</TabsTrigger>
                  <TabsTrigger value="metrics">Metrics</TabsTrigger>
                  <TabsTrigger value="context">Context</TabsTrigger>
                </TabsList>

                <TabsContent value="resolution" className="space-y-3">
                  <h3 className="font-semibold">Steps to Resolve:</h3>
                  <ol className="space-y-2">
                    {scenario.resolutionSteps?.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </TabsContent>

                <TabsContent value="prevention" className="space-y-3">
                  <h3 className="font-semibold">Prevention Measures:</h3>
                  <ul className="space-y-2">
                    {scenario.preventionMeasures?.map((measure, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex-shrink-0 text-green-600 font-bold">✓</span>
                        <span>{measure}</span>
                      </li>
                    ))}
                  </ul>
                </TabsContent>

                <TabsContent value="metrics" className="space-y-3">
                  <h3 className="font-semibold">System Metrics:</h3>
                  {scenario.systemMetrics ? (
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(scenario.systemMetrics).map(([key, value]) => (
                        <div key={key} className="bg-muted p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, " $1")}
                          </p>
                          <p className="font-semibold">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No metrics available</p>
                  )}
                </TabsContent>

                <TabsContent value="context" className="space-y-3">
                  <h3 className="font-semibold">Business Context:</h3>
                  {scenario.businessContext ? (
                    <div className="space-y-2">
                      {Object.entries(scenario.businessContext).map(([key, value]) => (
                        <div key={key} className="border rounded-lg p-3">
                          <p className="text-xs text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, " $1")}
                          </p>
                          <p className="font-semibold">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No context available</p>
                  )}
                </TabsContent>
              </Tabs>

              {/* Keywords */}
              {scenario.keywords && scenario.keywords.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Keywords:</h4>
                  <div className="flex flex-wrap gap-2">
                    {scenario.keywords.map((keyword) => (
                      <Badge key={keyword} variant="outline">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
