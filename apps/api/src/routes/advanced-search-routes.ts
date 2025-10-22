import type { Express } from "express";
import { AdvancedSearchService } from "../services/advanced-search-service.js";

export function registerAdvancedSearchRoutes(app: Express, requireAuth: any) {
  const searchService = new AdvancedSearchService();

  // Advanced search endpoint
  app.get("/api/search/advanced", requireAuth, async (req: any, res: any) => {
    try {
      const {
        query,
        severity,
        errorType,
        dateStart,
        dateEnd,
        fileIds,
        resolved,
        hasAiSuggestion,
        hasMlPrediction,
        page = 1,
        limit = 20
      } = req.query;

      const criteria = {
        query,
        severity: severity ? severity.split(',') : undefined,
        errorType: errorType ? errorType.split(',') : undefined,
        dateRange: dateStart && dateEnd ? {
          start: new Date(dateStart),
          end: new Date(dateEnd)
        } : undefined,
        fileIds: fileIds ? fileIds.split(',').map(Number) : undefined,
        resolved: resolved !== undefined ? resolved === 'true' : undefined,
        hasAiSuggestion: hasAiSuggestion === 'true',
        hasMlPrediction: hasMlPrediction === 'true'
      };

      const result = await searchService.searchErrors(
        req.user.id,
        criteria,
        parseInt(page),
        parseInt(limit)
      );

      res.json(result);
    } catch (error) {
      console.error("Advanced search error:", error);
      res.status(500).json({ message: "Search failed" });
    }
  });

  // Save search endpoint
  app.post("/api/search/save", requireAuth, async (req: any, res: any) => {
    try {
      const { name, criteria } = req.body;
      
      if (!name || !criteria) {
        return res.status(400).json({ message: "Name and criteria are required" });
      }

      await searchService.saveSearch(req.user.id, name, criteria);
      res.json({ message: "Search saved successfully" });
    } catch (error) {
      console.error("Save search error:", error);
      res.status(500).json({ message: "Failed to save search" });
    }
  });

  // Get saved searches endpoint
  app.get("/api/search/saved", requireAuth, async (req: any, res: any) => {
    try {
      const searches = await searchService.getSavedSearches(req.user.id);
      res.json(searches);
    } catch (error) {
      console.error("Get saved searches error:", error);
      res.status(500).json({ message: "Failed to get saved searches" });
    }
  });

  // Search suggestions endpoint
  app.get("/api/search/suggestions", requireAuth, async (req: any, res: any) => {
    try {
      const { query } = req.query;
      
      if (!query || query.length < 2) {
        return res.json([]);
      }

      // Get suggestions from search service
      const suggestions = await searchService.generateSearchSuggestions(req.user.id, query);
      res.json(suggestions);
    } catch (error) {
      console.error("Search suggestions error:", error);
      res.status(500).json({ message: "Failed to get suggestions" });
    }
  });
}