import { db } from "../database/db.js";
import { apiCredentials, type ApiCredential, type InsertApiCredential } from "@shared/sqlite-schema";
import { eq, and, sql } from "drizzle-orm";
import { encrypt, decrypt } from "../utils/encryption";

/**
 * Service for managing API credentials with encrypted storage
 * 
 * Priority system:
 * - Lower priority number = higher priority (will be tried first)
 * - Default priority: 100
 * - Recommended: Gemini=10, Groq=20, OpenRouter=30, OpenAI=40, Anthropic=50, etc.
 */

export class CredentialService {
    /**
     * Create a new API credential
     */
    async createCredential(data: Omit<InsertApiCredential, 'apiKey' | 'apiSecret'> & {
        apiKey?: string;
        apiSecret?: string;
    }): Promise<ApiCredential> {
        const encryptedData: InsertApiCredential = {
            ...data,
            apiKey: data.apiKey ? encrypt(data.apiKey) : undefined,
            apiSecret: data.apiSecret ? encrypt(data.apiSecret) : undefined,
        };

        const [credential] = await db
            .insert(apiCredentials)
            .values(encryptedData)
            .returning();

        return credential;
    }

    /**
     * Get a credential by name with decrypted values
     */
    async getCredential(name: string, userId?: number): Promise<{
        id: number;
        name: string;
        provider: string;
        apiKey?: string;
        apiSecret?: string;
        endpoint?: string | null;
        priority?: number;
        isActive: boolean;
    } | null> {
        const conditions = userId
            ? and(eq(apiCredentials.name, name), eq(apiCredentials.userId, userId))
            : eq(apiCredentials.name, name);

        const [credential] = await db
            .select()
            .from(apiCredentials)
            .where(conditions)
            .limit(1);

        if (!credential || !credential.isActive) {
            return null;
        }

        // Update usage tracking
        await this.recordUsage(credential.id);

        return {
            id: credential.id,
            name: credential.name,
            provider: credential.provider,
            apiKey: credential.apiKey ? decrypt(credential.apiKey) : undefined,
            apiSecret: credential.apiSecret ? decrypt(credential.apiSecret) : undefined,
            endpoint: credential.endpoint,
            priority: credential.priority,
            isActive: credential.isActive,
        };
    }

    /**
     * Get credential by provider (finds first active global credential respecting priority)
     * Returns credential with lowest priority number (highest priority)
     */
    async getCredentialByProvider(provider: string, userId?: number): Promise<{
        id: number;
        name: string;
        provider: string;
        apiKey?: string;
        apiSecret?: string;
        endpoint?: string | null;
        priority?: number;
        isActive: boolean;
    } | null> {
        const conditions = userId
            ? and(
                eq(apiCredentials.provider, provider),
                eq(apiCredentials.isActive, true),
                eq(apiCredentials.userId, userId)
            )
            : and(
                eq(apiCredentials.provider, provider),
                eq(apiCredentials.isActive, true),
                eq(apiCredentials.isGlobal, true)
            );

        const [credential] = await db
            .select()
            .from(apiCredentials)
            .where(conditions)
            .orderBy(sql`${apiCredentials.priority} ASC`) // Lower priority = higher priority (appears first)
            .limit(1);

        if (!credential) {
            return null;
        }

        // Update usage tracking
        await this.recordUsage(credential.id);

        return {
            id: credential.id,
            name: credential.name,
            provider: credential.provider,
            apiKey: credential.apiKey ? decrypt(credential.apiKey) : undefined,
            apiSecret: credential.apiSecret ? decrypt(credential.apiSecret) : undefined,
            endpoint: credential.endpoint,
            priority: credential.priority,
            isActive: credential.isActive,
        };
    }

    /**
     * Get all active credentials for a provider, sorted by priority
     * Useful for trying multiple providers in order
     */
    async getCredentialsByProvider(provider: string, userId?: number): Promise<Array<{
        id: number;
        name: string;
        provider: string;
        apiKey?: string;
        apiSecret?: string;
        endpoint?: string | null;
        priority?: number;
        isActive: boolean;
    }>> {
        const conditions = userId
            ? and(
                eq(apiCredentials.provider, provider),
                eq(apiCredentials.isActive, true),
                eq(apiCredentials.userId, userId)
            )
            : and(
                eq(apiCredentials.provider, provider),
                eq(apiCredentials.isActive, true),
                eq(apiCredentials.isGlobal, true)
            );

        const credentials = await db
            .select()
            .from(apiCredentials)
            .where(conditions)
            .orderBy(sql`${apiCredentials.priority} ASC`); // Sort by priority (lowest first)

        return credentials.map(c => ({
            id: c.id,
            name: c.name,
            provider: c.provider,
            apiKey: c.apiKey ? decrypt(c.apiKey) : undefined,
            apiSecret: c.apiSecret ? decrypt(c.apiSecret) : undefined,
            endpoint: c.endpoint,
            priority: c.priority,
            isActive: c.isActive,
        }));
    }

    /**
     * Get the highest priority credential from multiple providers
     * Tries each provider in the array order, returns first found with highest priority
     * Useful for: try Gemini first, then Google, then fallback to OpenAI
     */
    async getHighestPriorityCredential(providers: string[], userId?: number): Promise<{
        id: number;
        name: string;
        provider: string;
        apiKey?: string;
        apiSecret?: string;
        endpoint?: string | null;
        priority?: number;
        isActive: boolean;
    } | null> {
        // Try each provider in order
        for (const provider of providers) {
            const credential = await this.getCredentialByProvider(provider, userId);
            if (credential) {
                console.log(`✅ Found credential for provider: ${provider} (priority: ${credential.priority || 100})`);
                return credential;
            }
        }
        
        console.warn(`⚠️ No credentials found for any of: ${providers.join(', ')}`);
        return null;
    }

    /**
     * Get all active credentials sorted by priority
     * Useful for initializing all providers
     */
    async listCredentialsByPriority(userId?: number): Promise<Array<{
        id: number;
        name: string;
        provider: string;
        apiKey?: string;
        apiSecret?: string;
        endpoint?: string | null;
        priority?: number;
        isActive: boolean;
    }>> {
        const conditions = userId
            ? eq(apiCredentials.userId, userId)
            : eq(apiCredentials.isGlobal, true);

        const credentials = await db
            .select()
            .from(apiCredentials)
            .where(conditions)
            .orderBy(sql`${apiCredentials.priority} ASC`); // Sort by priority

        return credentials.map(c => ({
            id: c.id,
            name: c.name,
            provider: c.provider,
            apiKey: c.apiKey ? decrypt(c.apiKey) : undefined,
            apiSecret: c.apiSecret ? decrypt(c.apiSecret) : undefined,
            endpoint: c.endpoint,
            priority: c.priority,
            isActive: c.isActive,
        }));
    }

    /**
     * List all credentials (without decrypted values)
     */
    async listCredentials(userId?: number): Promise<Omit<ApiCredential, 'apiKey' | 'apiSecret'>[]> {
        const conditions = userId
            ? eq(apiCredentials.userId, userId)
            : eq(apiCredentials.isGlobal, true);

        const credentials = await db
            .select({
                id: apiCredentials.id,
                name: apiCredentials.name,
                provider: apiCredentials.provider,
                endpoint: apiCredentials.endpoint,
                priority: apiCredentials.priority,
                isActive: apiCredentials.isActive,
                isGlobal: apiCredentials.isGlobal,
                userId: apiCredentials.userId,
                rateLimit: apiCredentials.rateLimit,
                usageCount: apiCredentials.usageCount,
                currentMonthUsage: apiCredentials.currentMonthUsage,
                lastUsed: apiCredentials.lastUsed,
                createdAt: apiCredentials.createdAt,
                updatedAt: apiCredentials.updatedAt,
            })
            .from(apiCredentials)
            .where(conditions)
            .orderBy(sql`${apiCredentials.priority} ASC`);

        return credentials;
    }

    /**
     * Update a credential
     */
    async updateCredential(
        id: number,
        data: Partial<Omit<InsertApiCredential, 'apiKey' | 'apiSecret'> & {
            apiKey?: string;
            apiSecret?: string;
        }>
    ): Promise<ApiCredential | null> {
        const updateData: Partial<InsertApiCredential> = {
            ...data,
            apiKey: data.apiKey ? encrypt(data.apiKey) : undefined,
            apiSecret: data.apiSecret ? encrypt(data.apiSecret) : undefined,
        };

        const [updated] = await db
            .update(apiCredentials)
            .set(updateData)
            .where(eq(apiCredentials.id, id))
            .returning();

        return updated || null;
    }

    /**
     * Delete a credential
     */
    async deleteCredential(id: number): Promise<boolean> {
        const result = await db
            .delete(apiCredentials)
            .where(eq(apiCredentials.id, id))
            .returning();

        return result.length > 0;
    }

    /**
     * Record credential usage
     */
    private async recordUsage(id: number): Promise<void> {
        await db.run(sql`
            UPDATE ${apiCredentials}
            SET 
                usage_count = usage_count + 1,
                current_month_usage = current_month_usage + 1,
                last_used = ${new Date().toISOString()}
            WHERE id = ${id}
        `);
    }

    /**
     * Check if credential has exceeded rate limit
     */
    async checkRateLimit(id: number): Promise<boolean> {
        const [credential] = await db
            .select()
            .from(apiCredentials)
            .where(eq(apiCredentials.id, id))
            .limit(1);

        if (!credential || !credential.rateLimit) {
            return true; // No rate limit set
        }

        return (credential.currentMonthUsage || 0) < credential.rateLimit;
    }

    /**
     * Reset monthly usage counters (should be run monthly via cron)
     */
    async resetMonthlyUsage(): Promise<void> {
        await db
            .update(apiCredentials)
            .set({ currentMonthUsage: 0 });
    }
}

export const credentialService = new CredentialService();
