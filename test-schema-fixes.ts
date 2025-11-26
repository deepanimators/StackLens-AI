#!/usr/bin/env node
import { db } from './apps/api/src/database/sqlite-db.js';
import {
    mlModels,
    trainingModules,
    userRoles,
    userTraining,
    modelDeployments,
    auditLogs,
    users,
    roles
} from '@shared/schema';
import { desc, asc } from 'drizzle-orm';

console.log('\n🧪 Testing schema fixes...\n');

async function testQueries() {
    try {
        // Test 1: getAllMlModels query
        console.log('1️⃣ Testing getAllMlModels query...');
        const models = await db.select({
            id: mlModels.id,
            name: mlModels.name,
            version: mlModels.version,
            description: mlModels.description,
            modelType: mlModels.modelType,
            accuracy: mlModels.accuracy,
            precision: mlModels.precision,
            recall: mlModels.recall,
            f1Score: mlModels.f1Score,
            cvScore: mlModels.cvScore,
            trainingLoss: mlModels.trainingLoss,
            validationLoss: mlModels.validationLoss,
            topFeatures: mlModels.topFeatures,
            trainingDataSize: mlModels.trainingDataSize,
            validationDataSize: mlModels.validationDataSize,
            testDataSize: mlModels.testDataSize,
            trainingTime: mlModels.trainingTime,
            trainedAt: mlModels.trainedAt,
            createdBy: mlModels.createdBy,
            hyperparameters: mlModels.hyperparameters,
            trainingMetrics: mlModels.trainingMetrics,
            modelPath: mlModels.modelPath,
            isActive: mlModels.isActive,
            createdAt: mlModels.createdAt,
            updatedAt: mlModels.updatedAt,
        }).from(mlModels).orderBy(desc(mlModels.trainedAt));
        console.log(`✅ getAllMlModels: Retrieved ${models.length} models`);

        // Test 2: getAllTrainingModules query
        console.log('\n2️⃣ Testing getAllTrainingModules query...');
        const modules = await db.select({
            id: trainingModules.id,
            title: trainingModules.title,
            description: trainingModules.description,
            content: trainingModules.content,
            difficulty: trainingModules.difficulty,
            estimatedDuration: trainingModules.estimatedDuration,
            isActive: trainingModules.isActive,
            createdBy: trainingModules.createdBy,
            createdAt: trainingModules.createdAt,
            updatedAt: trainingModules.updatedAt,
        }).from(trainingModules).orderBy(asc(trainingModules.title));
        console.log(`✅ getAllTrainingModules: Retrieved ${modules.length} modules`);

        // Test 3: Users wildcard query
        console.log('\n3️⃣ Testing users wildcard query...');
        const allUsers = await db.select().from(users);
        console.log(`✅ Users wildcard select: Retrieved ${allUsers.length} users`);

        // Test 4: Roles wildcard query
        console.log('\n4️⃣ Testing roles wildcard query...');
        const allRoles = await db.select().from(roles);
        console.log(`✅ Roles wildcard select: Retrieved ${allRoles.length} roles`);

        // Test 5: UserRoles query
        console.log('\n5️⃣ Testing userRoles query...');
        const userRolesList = await db.select().from(userRoles);
        console.log(`✅ UserRoles select: Retrieved ${userRolesList.length} user-role assignments`);

        // Test 6: UserTraining query
        console.log('\n6️⃣ Testing userTraining query...');
        const userTrainingList = await db.select().from(userTraining);
        console.log(`✅ UserTraining select: Retrieved ${userTrainingList.length} training records`);

        // Test 7: ModelDeployments query
        console.log('\n7️⃣ Testing modelDeployments query...');
        const deployments = await db.select().from(modelDeployments);
        console.log(`✅ ModelDeployments select: Retrieved ${deployments.length} deployments`);

        // Test 8: AuditLogs query
        console.log('\n8️⃣ Testing auditLogs query...');
        const audits = await db.select().from(auditLogs);
        console.log(`✅ AuditLogs select: Retrieved ${audits.length} audit log entries`);

        console.log('\n🎉 All schema tests passed! No column mismatch errors.\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Schema test failed:');
        console.error(error);
        process.exit(1);
    }
}

testQueries();
