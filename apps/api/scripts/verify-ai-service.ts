import { aiService } from "../src/services/ai-service";

async function verify() {
    console.log("🔍 Verifying AIService Implementation...");

    // Check if providers are initialized (we can't access private property directly, but we can infer from behavior or logs if we could spy, but here we just check if it runs without error)
    // Since we don't have API keys in this env, it should fall back to static suggestions.

    console.log("Testing fallback mechanism (no API keys expected)...");
    const suggestion = await aiService.generateSuggestion(
        "Printer not working",
        "Hardware",
        "High"
    );

    if (suggestion && suggestion.resolutionSteps.length > 0) {
        console.log("✅ AIService returned a suggestion (Fallback working)");
        console.log("Root Cause:", suggestion.rootCause);
    } else {
        console.error("❌ AIService failed to return a suggestion");
        process.exit(1);
    }

    // Verify POS data file exists
    const fs = await import('fs');
    const path = await import('path');
    const dataPath = path.resolve(process.cwd(), "pos_error_training_data.xlsx");

    if (fs.existsSync(dataPath)) {
        console.log("✅ pos_error_training_data.xlsx exists");
    } else {
        console.error("❌ pos_error_training_data.xlsx NOT found");
        process.exit(1);
    }

    console.log("✅ Verification passed!");
}

verify().catch(console.error);
