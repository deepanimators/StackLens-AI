import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Bot, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { SEVERITY_COLORS } from "@/lib/constants";

interface ErrorLog {
  id: number;
  fileId?: number;
  lineNumber: number;
  timestamp: string | null;
  severity: string;
  errorType: string;
  message: string;
  fullText: string;
  resolved: boolean;
  aiSuggestion?: any;
  mlPrediction?: any;
  storeNumber?: string | null;
  kioskNumber?: string | null;
}

interface ErrorTableProps {
  errors: ErrorLog[];
  onViewDetails: (error: ErrorLog) => void;
  onGenerateSuggestion: (error: ErrorLog) => void;
  showLineNumbers?: boolean;
  showTimestamp?: boolean;
  showFileName?: boolean;
  showStoreKiosk?: boolean;
  fileName?: string;
}

export default function ErrorTable({
  errors,
  onViewDetails,
  onGenerateSuggestion,
  showLineNumbers = true,
  showTimestamp = true,
  showFileName = false,
  showStoreKiosk = true,
  fileName,
}: ErrorTableProps) {
  const getSeverityColor = (severity: string) => {
    return (
      SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] ||
      SEVERITY_COLORS.medium
    );
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return "N/A";
    try {
      // Handle multiple timestamp formats
      let date: Date;
      
      // Check if it's already a valid date string
      if (timestamp.includes('T') || timestamp.includes('-')) {
        date = new Date(timestamp);
      } else {
        // Handle Unix timestamp (seconds or milliseconds)
        const numTimestamp = parseInt(timestamp);
        if (!isNaN(numTimestamp)) {
          // If timestamp is in seconds (10 digits), convert to milliseconds
          date = new Date(numTimestamp < 10000000000 ? numTimestamp * 1000 : numTimestamp);
        } else {
          throw new Error('Invalid timestamp format');
        }
      }
      
      // Verify the date is valid
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      
      return date.toLocaleString();
    } catch (error) {
      console.warn('Failed to parse timestamp:', timestamp, error);
      return "Invalid Date";
    }
  };

  const truncateMessage = (message: string, maxLength: number = 80) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + "...";
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {showLineNumbers && <TableHead>Line</TableHead>}
            {showTimestamp && <TableHead>Timestamp</TableHead>}
            {showFileName && <TableHead>File</TableHead>}
            {showStoreKiosk && <TableHead>Store</TableHead>}
            {showStoreKiosk && <TableHead>Kiosk</TableHead>}
            <TableHead>Severity</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Error Message</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {errors.map((error) => (
            <TableRow key={error.id} className="hover:bg-muted/50">
              {showLineNumbers && (
                <TableCell className="text-muted-foreground">
                  {error.lineNumber}
                </TableCell>
              )}
              {showTimestamp && (
                <TableCell className="text-muted-foreground text-sm">
                  {formatTimestamp(error.timestamp)}
                </TableCell>
              )}
              {showFileName && (
                <TableCell className="text-muted-foreground">
                  {(error as any).filename || "Unknown"}
                </TableCell>
              )}
              {showStoreKiosk && (
                <TableCell className="text-muted-foreground">
                  {error.storeNumber || "N/A"}
                </TableCell>
              )}
              {showStoreKiosk && (
                <TableCell className="text-muted-foreground">
                  {error.kioskNumber || "N/A"}
                </TableCell>
              )}
              <TableCell>
                <Badge
                  variant="secondary"
                  className={cn("capitalize", `bg-severity-${error.severity}`)}
                  style={{
                    backgroundColor: `${getSeverityColor(error.severity)}20`,
                    color: getSeverityColor(error.severity),
                    borderColor: `${getSeverityColor(error.severity)}40`,
                  }}
                >
                  {error.severity}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">{error.errorType}</TableCell>
              <TableCell className="max-w-md">
                <div className="truncate" title={error.message}>
                  {truncateMessage(error.message)}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(error)}
                    className="text-primary hover:text-primary"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onGenerateSuggestion(error)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Bot className="h-4 w-4" />
                  </Button>
                  {error.resolved && (
                    <div
                      className="w-2 h-2 bg-green-500 rounded-full"
                      title="Resolved"
                    />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {errors.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <ExternalLink className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No errors found</p>
        </div>
      )}
    </div>
  );
}
