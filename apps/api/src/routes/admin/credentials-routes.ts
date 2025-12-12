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
        const credentials = await credentialService.listCredentials();
        res.json(credentials);
    } catch (error) {
        console.error("Error listing credentials:", error);
        res.status(500).json({ error: "Failed to list credentials" });
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
 */
router.post("/", verifyToken, requireAdmin, async (req, res) => {
    try {
        const { name, provider, apiKey, apiSecret, endpoint, isGlobal, rateLimit } = req.body;

        if (!name || !provider) {
            return res.status(400).json({ error: "Name and provider are required" });
        }

        const credential = await credentialService.createCredential({
            name,
            provider: provider.toLowerCase(),
            apiKey,
            apiSecret,
            endpoint,
            isGlobal: isGlobal !== undefined ? isGlobal : true,
            userId: isGlobal ? undefined : req.user?.id,
            rateLimit,
        });

        res.status(201).json({
            id: credential.id,
            name: credential.name,
            provider: credential.provider,
            isActive: credential.isActive,
            isGlobal: credential.isGlobal,
            createdAt: credential.createdAt,
        });
    } catch (error) {
        console.error("Error creating credential:", error);
        res.status(500).json({ error: "Failed to create credential" });
    }
});

/**
 * PATCH /api/admin/credentials/:id
 * Update a credential
 */
router.patch("/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, provider, apiKey, apiSecret, endpoint, isActive, rateLimit } = req.body;

        const updated = await credentialService.updateCredential(id, {
            name,
            provider: provider?.toLowerCase(),
            apiKey,
            apiSecret,
            endpoint,
            isActive,
            rateLimit,
        });

        if (!updated) {
            return res.status(404).json({ error: "Credential not found" });
        }

        res.json({
            id: updated.id,
            name: updated.name,
            provider: updated.provider,
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
