import { db } from "@repo/database";
import { apiCredentials } from "@repo/database/schema";
import { credentialService } from "../services/credential-service";
import { generateEncryptionKey } from "../utils/encryption";
import * as readline from "readline";

/**
 * Migration script to move credentials from .env to database
 * 
 * This script:
 * 1. Reads credentials from environment variables
 * 2. Stores them encrypted in the database
 * 3. Provides instructions for updating .env file
 * 
 * Usage:
 *   npm run migrate:credentials
 *   or
 *   tsx scripts/migrate-credentials.ts
 */

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function migrateCredentials() {
    console.log("\n🔐 Credential Migration Script");
    console.log("================================\n");

    // Check if encryption key is set
    if (!process.env.ENCRYPTION_KEY) {
        console.log("⚠️  ENCRYPTION_KEY not found in environment!");
        console.log("\nGenerating a new encryption key...");
        const newKey = generateEncryptionKey();
        console.log("\n✅ Generated encryption key:");
        console.log(`\nENCRYPTION_KEY=${newKey}\n`);
        console.log("⚠️  Add this to your .env file before continuing!");
        console.log("⚠️  Store this key securely - if lost, encrypted credentials cannot be recovered.\n");

        const proceed = await prompt("Have you added the ENCRYPTION_KEY to .env? (yes/no): ");
        if (proceed.toLowerCase() !== 'yes') {
            console.log("\n❌ Migration cancelled. Please add ENCRYPTION_KEY to .env and try again.");
            rl.close();
            process.exit(0);
        }
    }

    console.log("\n📋 Detected credentials in environment:\n");

    const envCredentials = [
        { name: "gemini-primary", provider: "gemini", key: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY },
        { name: "openai-primary", provider: "openai", key: process.env.OPENAI_API_KEY },
        { name: "anthropic-primary", provider: "anthropic", key: process.env.ANTHROPIC_API_KEY },
        { name: "openrouter-primary", provider: "openrouter", key: process.env.OPENROUTER_API_KEY },
        { name: "groq-primary", provider: "groq", key: process.env.GROQ_API_KEY },
    ];

    const availableCredentials = envCredentials.filter(c => c.key);

    if (availableCredentials.length === 0) {
        console.log("⚠️  No credentials found in environment variables.");
        console.log("Make sure your .env file has at least one of:");
        console.log("  - GEMINI_API_KEY or GOOGLE_API_KEY");
        console.log("  - OPENAI_API_KEY");
        console.log("  - ANTHROPIC_API_KEY");
        console.log("  - OPENROUTER_API_KEY");
        console.log("  - GROQ_API_KEY\n");
        rl.close();
        process.exit(0);
    }

    availableCredentials.forEach((cred, i) => {
        const maskedKey = cred.key!.substring(0, 8) + "..." + cred.key!.substring(cred.key!.length - 4);
        console.log(`  ${i + 1}. ${cred.provider.toUpperCase()}: ${maskedKey}`);
    });

    console.log("\n");
    const confirm = await prompt("Migrate these credentials to database? (yes/no): ");

    if (confirm.toLowerCase() !== 'yes') {
        console.log("\n❌ Migration cancelled.");
        rl.close();
        process.exit(0);
    }

    console.log("\n🚀 Starting migration...\n");

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const cred of availableCredentials) {
        try {
            // Check if credential already exists
            const existing = await credentialService.getCredentialByProvider(cred.provider);

            if (existing) {
                console.log(`⏭️  ${cred.provider.toUpperCase()}: Already exists, skipping...`);
                skipped++;
                continue;
            }

            // Create new credential
            await credentialService.createCredential({
                name: cred.name,
                provider: cred.provider,
                apiKey: cred.key,
                isGlobal: true,
                isActive: true,
            });

            console.log(`✅ ${cred.provider.toUpperCase()}: Migrated successfully`);
            migrated++;
        } catch (error) {
            console.error(`❌ ${cred.provider.toUpperCase()}: Failed -`, error);
            failed++;
        }
    }

    console.log("\n📊 Migration Summary:");
    console.log(`  ✅ Migrated: ${migrated}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ❌ Failed: ${failed}`);

    if (migrated > 0) {
        console.log("\n🎉 Migration completed successfully!\n");
        console.log("📝 Next steps:");
        console.log("  1. The credentials are now stored encrypted in the database");
        console.log("  2. You can optionally remove the API keys from .env file");
        console.log("  3. Keep ENCRYPTION_KEY in .env (required to decrypt credentials)");
        console.log("  4. Restart your application to use database credentials\n");
        console.log("⚠️  IMPORTANT: Backup your ENCRYPTION_KEY securely!");
        console.log("   If lost, you won't be able to decrypt stored credentials.\n");
    }

    rl.close();
}

// Run migration
migrateCredentials().catch((error) => {
    console.error("\n❌ Migration failed:", error);
    rl.close();
    process.exit(1);
});
