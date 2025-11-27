import { db } from "../src/database/db";
import { users } from "@shared/sqlite-schema";

async function debug() {
    console.log("🔍 Debugging Database Connection...");

    try {
        console.log("Attempting to select users...");
        const allUsers = await db.select().from(users);
        console.log(`✅ Success! Found ${allUsers.length} users.`);
    } catch (error) {
        console.error("❌ Database Error:", error);
    }
}

debug();
