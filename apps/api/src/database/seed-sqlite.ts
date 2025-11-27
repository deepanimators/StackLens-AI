import { db } from './sqlite-db';
import { storage } from './database-storage';
import bcrypt from 'bcryptjs';

export async function seedSQLiteDatabase() {
  try {
    console.log('🌱 Seeding SQLite database...');

    // Check if database is already seeded by looking for the admin user
    const existingAdmin = await storage.getUserByEmail('deepanimators@gmail.com');

    if (existingAdmin) {
      console.log('ℹ️ Database already seeded. Skipping seed process.');
      return;
    }

    // Create super admin user with proper schema fields
    const hashedPassword = await bcrypt.hash('PapuAchu@27', 10);

    const adminUser = await storage.createUser({
      username: 'deepanimators',
      email: 'deepanimators@gmail.com',
      password: hashedPassword,
      role: 'super_admin',
      firstName: 'Deep',
      lastName: 'Animators',
      department: 'IT Administration',
      isActive: true,
    });

    console.log('✅ Created super admin user:', adminUser.username);

    // Create default roles
    const adminRole = await storage.createRole({
      name: 'Administrator',
      description: 'Full system administration access',
      permissions: [
        'user_management',
        'role_management',
        'system_settings',
        'audit_logs',
        'training_management',
        'model_training',
        'data_export'
      ],
      isActive: true,
    });

    const userRole = await storage.createRole({
      name: 'User',
      description: 'Standard user access',
      permissions: [
        'file_upload',
        'error_analysis',
        'view_reports',
        'training_access'
      ],
      isActive: true,
    });

    console.log('✅ Created default roles');

    // Create sample training modules
    const basicModule = await storage.createTrainingModule({
      title: 'Log Analysis Fundamentals',
      description: 'Learn the basics of log analysis and error detection',
      content: `
# Log Analysis Fundamentals

## Overview
This module covers the essential concepts of log analysis and error detection.

## Learning Objectives
- Understand different types of logs
- Identify common error patterns
- Use analysis tools effectively
- Apply best practices for error resolution

## Module Content

### 1. Understanding Log Types
Logs are records of events that occur in software systems. Common types include:
- **Application Logs**: Events from application code
- **System Logs**: Operating system events
- **Error Logs**: Specific error occurrences
- **Performance Logs**: System performance metrics

### 2. Error Pattern Recognition
Learn to identify common error patterns:
- **Syntax Errors**: Code formatting issues
- **Runtime Errors**: Execution-time problems
- **Logic Errors**: Incorrect program behavior
- **Resource Errors**: Memory, disk, or network issues

### 3. Analysis Tools
Master the use of analysis tools:
- Log parsers and filters
- Pattern matching techniques
- Statistical analysis methods
- Visualization tools

### 4. Best Practices
Apply industry best practices:
- Structured logging
- Error categorization
- Root cause analysis
- Preventive measures

## Assessment
Complete the quiz to test your understanding of log analysis fundamentals.
      `,
      difficulty: 'beginner',
      estimatedDuration: 60,
      isActive: true,
      createdBy: adminUser.id,
    });

    const advancedModule = await storage.createTrainingModule({
      title: 'Advanced AI-Powered Analysis',
      description: 'Master advanced techniques using AI for log analysis',
      content: `
# Advanced AI-Powered Analysis

## Overview
This advanced module focuses on leveraging AI and machine learning for sophisticated log analysis.

## Learning Objectives
- Understand AI/ML applications in log analysis
- Implement automated error detection
- Use predictive analytics for system health
- Optimize analysis workflows

## Module Content

### 1. AI in Log Analysis
Explore how artificial intelligence transforms log analysis:
- **Pattern Recognition**: AI identifies complex patterns
- **Anomaly Detection**: Automated unusual behavior detection
- **Predictive Analytics**: Forecasting system issues
- **Natural Language Processing**: Understanding error messages

### 2. Machine Learning Techniques
Learn specific ML approaches:
- **Supervised Learning**: Classification and regression
- **Unsupervised Learning**: Clustering and dimensionality reduction
- **Deep Learning**: Neural networks for complex patterns
- **Ensemble Methods**: Combining multiple models

### 3. Implementation Strategies
Practical implementation approaches:
- **Data Preprocessing**: Cleaning and preparing log data
- **Feature Engineering**: Extracting meaningful features
- **Model Selection**: Choosing appropriate algorithms
- **Performance Optimization**: Improving analysis speed

### 4. Real-World Applications
Apply knowledge to real scenarios:
- **System Monitoring**: Continuous health assessment
- **Incident Response**: Automated alert generation
- **Capacity Planning**: Resource optimization
- **Security Analysis**: Threat detection

## Assessment
Complete the advanced assessment to demonstrate mastery of AI-powered log analysis.
      `,
      difficulty: 'advanced',
      estimatedDuration: 120,
      isActive: true,
      createdBy: adminUser.id,
    });

    console.log('✅ Created training modules');

    // Create sample error patterns
    const errorPatterns = [
      {
        pattern: 'OutOfMemoryError',
        errorType: 'memory',
        regex: '(OutOfMemoryError|heap\\s+space)',
        description: 'Java heap space exhaustion',
        severity: 'critical',
        category: 'memory',
        suggestedFix: 'Increase heap size using -Xmx parameter or optimize memory usage',
      },
      {
        pattern: 'NullPointerException',
        errorType: 'runtime',
        regex: '(NullPointerException|null\\s+pointer)',
        description: 'Null reference access',
        severity: 'high',
        category: 'runtime',
        suggestedFix: 'Add null checks before object access',
      },
      {
        pattern: 'Connection refused',
        errorType: 'network',
        regex: '(Connection\\s+refused|ECONNREFUSED)',
        description: 'Network connection failure',
        severity: 'high',
        category: 'network',
        suggestedFix: 'Check network connectivity and service availability',
      },
      {
        pattern: 'File not found',
        errorType: 'filesystem',
        regex: '(File\\s+not\\s+found|ENOENT|FileNotFoundException)',
        description: 'Missing file or incorrect path',
        severity: 'medium',
        category: 'filesystem',
        suggestedFix: 'Verify file path and permissions',
      },
    ];

    for (const pattern of errorPatterns) {
      await storage.createErrorPattern(pattern);
    }

    console.log('✅ Created error patterns');

    // Create sample ML model
    const mlModel = await storage.createMlModel({
      name: 'Error Classification Model',
      version: '1.0.0',
      modelPath: '/models/error-classifier-v1.0.0',
      accuracy: 0.85,
      precision: 0.82,
      recall: 0.88,
      f1Score: 0.85,
      trainingData: {
        samples: 1000,
        features: ['severity', 'category', 'message_length', 'timestamp'],
      },
      isActive: true,
    });

    console.log('✅ Created ML model');

    console.log('🎉 SQLite database seeded successfully!');
    console.log('');
    console.log('Admin Access:');
    console.log('Username: deepanimators');
    console.log('Password: PapuAchu@27');
    console.log('Email: deepanimators@gmail.com');
    console.log('Role: super_admin');

  } catch (error) {
    console.error('❌ Error seeding SQLite database:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSQLiteDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Database seeding failed:', error);
      process.exit(1);
    });
}