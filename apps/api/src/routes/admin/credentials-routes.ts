import { Router } from "express";
import { credentialService } from "../../services/credential-service.js";
import { verifyToken, requireAdmin } from "../../middleware/auth.js";
import { generateEncryptionKey } from "../../utils/encryption.js";

const router = Router();

/**
 * GET /api/admin/credentials
 * List all credentials (without sensitive data)
 */
router.get("/", verifyToken, requireAdmin, async (req, res) => {
    try {
        console.log("🔐 Listing credentials...");
        const credentials = await credentialService.listCredentials();
        console.log(`✅ Found ${credentials.length} credentials`);
        res.json(credentials);
    } catch (error: any) {
        console.error("❌ Error listing credentials:", error);
        console.error("Error details:", {
            message: error.message,
            code: error.code,
            stack: error.stack?.split('\n').slice(0, 3).join('\n')
        });
        res.status(500).json({
            error: "Failed to list credentials",
            details: error.message
        });
    }
});

/**
 * GET /api/admin/credentials/:id
 * Get a specific credential (without decrypted keys)
 */
router.get("/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const credentials = await credentialService.listCredentials();
        const credential = credentials.find(c => c.id === id);

        if (!credential) {
            return res.status(404).json({ error: "Credential not found" });
        }

        res.json(credential);
    } catch (error) {
        console.error("Error fetching credential:", error);
        res.status(500).json({ error: "Failed to fetch credential" });
    }
});

/**
 * POST /api/admin/credentials
 * Create a new credential
 * Priority system: Lower number = higher priority (default 100)
 * Recommended: Gemini=10, Groq=20, OpenRouter=30, OpenAI=40, Anthropic=50
 */
router.post("/", verifyToken, requireAdmin, async (req, res) => {
    try {
        const { name, provider, apiKey, apiSecret, endpoint, isGlobal, rateLimit, priority } = req.body;

        if (!name || !provider) {
            return res.status(400).json({ error: "Name and provider are required" });
        }

        // Set default priorities based on provider
        let defaultPriority = 100;
        const providerLower = provider.toLowerCase();
        if (providerLower === 'gemini') defaultPriority = 10;
        else if (providerLower === 'groq') defaultPriority = 20;
        else if (providerLower === 'openrouter') defaultPriority = 30;
        else if (providerLower === 'openai') defaultPriority = 40;
        else if (providerLower === 'anthropic') defaultPriority = 50;

        console.log("🔐 Creating credential:", { name, provider: providerLower });
        const credential = await credentialService.createCredential({
            name,
            provider: provider.toLowerCase(),
            apiKey,
            apiSecret,
            endpoint,
            isGlobal: isGlobal !== undefined ? isGlobal : true,
            userId: isGlobal ? undefined : req.user?.id,
            rateLimit,
            priority: priority !== undefined ? priority : defaultPriority,
        });

        console.log("✅ Credential created successfully:", credential.id);
        res.status(201).json({
            id: credential.id,
            name: credential.name,
            provider: credential.provider,
            priority: credential.priority,
            isActive: credential.isActive,
            isGlobal: credential.isGlobal,
            createdAt: credential.createdAt,
        });
    } catch (error: any) {
        console.error("❌ Error creating credential:", error);
        console.error("Error details:", {
            message: error.message,
            code: error.code,
            stack: error.stack?.split('\n').slice(0, 3).join('\n')
        });
        res.status(500).json({
            error: "Failed to create credential",
            details: error.message
        });
    }
});

/**
 * PATCH /api/admin/credentials/:id
 * Update a credential
 */
router.patch("/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, provider, apiKey, apiSecret, endpoint, isActive, rateLimit, priority } = req.body;

        const updated = await credentialService.updateCredential(id, {
            name,
            provider: provider?.toLowerCase(),
            apiKey,
            apiSecret,
            endpoint,
            isActive,
            rateLimit,
            priority,
        });

        if (!updated) {
            return res.status(404).json({ error: "Credential not found" });
        }

        res.json({
            id: updated.id,
            name: updated.name,
            provider: updated.provider,
            priority: updated.priority,
            isActive: updated.isActive,
            updatedAt: updated.updatedAt,
        });
    } catch (error) {
        console.error("Error updating credential:", error);
        res.status(500).json({ error: "Failed to update credential" });
    }
});

/**
 * DELETE /api/admin/credentials/:id
 * Delete a credential
 */
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const deleted = await credentialService.deleteCredential(id);

        if (!deleted) {
            return res.status(404).json({ error: "Credential not found" });
        }

        res.json({ message: "Credential deleted successfully" });
    } catch (error) {
        console.error("Error deleting credential:", error);
        res.status(500).json({ error: "Failed to delete credential" });
    }
});

/**
 * POST /api/admin/credentials/:id/test
 * Test a credential (attempt to use it)
 */
router.post("/:id/test", verifyToken, requireAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const credentials = await credentialService.listCredentials();
        const credential = credentials.find(c => c.id === id);

        if (!credential) {
            return res.status(404).json({ error: "Credential not found" });
        }

        // Check rate limit
        const canUse = await credentialService.checkRateLimit(id);
        if (!canUse) {
            return res.status(429).json({ error: "Rate limit exceeded" });
        }

        res.json({
            message: "Credential is valid and within rate limits",
            provider: credential.provider,
            usageCount: credential.usageCount,
            currentMonthUsage: credential.currentMonthUsage,
            rateLimit: credential.rateLimit,
        });
    } catch (error) {
        console.error("Error testing credential:", error);
        res.status(500).json({ error: "Failed to test credential" });
    }
});

/**
 * POST /api/admin/credentials/generate-key
 * Generate a new encryption key (for initial setup)
 */
router.post("/generate-key", verifyToken, requireAdmin, async (req, res) => {
    try {
        const key = generateEncryptionKey();
        res.json({
            key,
            message: "Add this key to your .env file as ENCRYPTION_KEY=<key>",
            warning: "Store this key securely. If lost, encrypted credentials cannot be recovered.",
        });
    } catch (error) {
        console.error("Error generating encryption key:", error);
        res.status(500).json({ error: "Failed to generate encryption key" });
    }
});

/**
 * POST /api/admin/credentials/reset-monthly-usage
 * Reset monthly usage counters (should be automated via cron)
 */
router.post("/reset-monthly-usage", verifyToken, requireAdmin, async (req, res) => {
    try {
        await credentialService.resetMonthlyUsage();
        res.json({ message: "Monthly usage counters reset successfully" });
    } catch (error) {
        console.error("Error resetting monthly usage:", error);
        res.status(500).json({ error: "Failed to reset monthly usage" });
    }
});

export default router;
