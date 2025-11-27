import request from "supertest";
import express from "express";
import { registerRoutes } from "../../apps/api/src/routes/main-routes";
import { storage } from "../../apps/api/src/database/database-storage";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

describe("Auth Fix Verification", () => {
    let app: express.Express;
    let token: string;
    let userId: number;

    beforeAll(async () => {
        // Setup app
        app = express();
        app.use(express.json());
        app.use(express.urlencoded({ extended: false }));
        await registerRoutes(app);

        // Register a test user
        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                username: "testuser_auth_fix",
                email: "test_auth_fix@example.com",
                password: "password123",
            });

        if (registerResponse.status === 200) {
            token = registerResponse.body.token;
            userId = registerResponse.body.user.id;
        } else {
            // Try login if user exists
            const loginResponse = await request(app)
                .post("/api/auth/login")
                .send({
                    username: "testuser_auth_fix",
                    password: "password123",
                });
            token = loginResponse.body.token;
            userId = loginResponse.body.user.id;
        }
    });

    afterAll(async () => {
        if (userId) {
            await storage.deleteUser(userId);
        }
    });

    it("should return wrapped user object without password from /api/auth/me", async () => {
        const response = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("user");
        expect(response.body.user).toHaveProperty("username", "testuser_auth_fix");
        expect(response.body.user).not.toHaveProperty("password");
    });
});
