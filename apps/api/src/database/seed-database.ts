import { db } from './db';
import { storage } from './database-storage';
import bcrypt from 'bcryptjs';

export async function seedDatabase() {
  try {
    console.log('🌱 Seeding database...');

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
- **Security Logs**: Authentication and authorization events
- **Performance Logs**: Metrics and performance data

### 2. Error Patterns
Common error patterns you'll encounter:
- **Syntax Errors**: Code structure issues
- **Runtime Errors**: Execution-time failures
- **Logic Errors**: Incorrect program behavior
- **Configuration Errors**: Setup and configuration issues

### 3. Analysis Tools
StackLens AI provides powerful tools for log analysis:
- AI-powered error detection
- Pattern recognition
- Automated suggestions
- Performance metrics

### 4. Best Practices
- Regular log monitoring
- Proactive error detection
- Documentation of resolutions
- Continuous improvement

## Assessment
Complete the interactive exercises to test your understanding.
      `,
      difficulty: 'beginner',
      estimatedDuration: 45,
      prerequisites: [],
      tags: ['fundamentals', 'beginner', 'log-analysis'],
      isActive: true,
      createdBy: adminUser.id,
    });

    const advancedModule = await storage.createTrainingModule({
      title: 'Advanced AI-Powered Analysis',
      description: 'Master advanced features of AI-powered log analysis',
      content: `
# Advanced AI-Powered Analysis

## Overview
Learn to leverage AI capabilities for complex log analysis scenarios.

## Learning Objectives
- Understand AI model training
- Configure advanced analysis rules
- Optimize system performance
- Train custom models

## Module Content

### 1. AI Model Understanding
Learn how our AI models work:
- Machine learning fundamentals
- Error classification algorithms
- Confidence scoring
- Model training processes

### 2. Advanced Configuration
Configure sophisticated analysis rules:
- Custom error patterns
- Severity classification
- Automated workflows
- Integration settings

### 3. Performance Optimization
Optimize analysis performance:
- Batch processing
- Resource management
- Caching strategies
- Monitoring metrics

### 4. Custom Model Training
Train models for your specific needs:
- Data preparation
- Training configuration
- Model evaluation
- Deployment strategies

## Hands-on Exercises
Practice with real-world scenarios and complex log datasets.
      `,
      difficulty: 'advanced',
      estimatedDuration: 120,
      prerequisites: [basicModule.id],
      tags: ['advanced', 'ai', 'machine-learning'],
      isActive: true,
      createdBy: adminUser.id,
    });

    console.log('✅ Created training modules');

    // Create sample error patterns
    await storage.createErrorPattern({
      pattern: 'NullPointerException',
      errorType: 'runtime_error',
      severity: 'high',
      description: 'Null pointer access attempt',
      regex: '.*NullPointerException.*',
      isActive: true,
    });

    await storage.createErrorPattern({
      pattern: 'SyntaxError',
      errorType: 'syntax_error', 
      severity: 'medium',
      description: 'Code syntax violation',
      regex: '.*SyntaxError.*',
      isActive: true,
    });

    await storage.createErrorPattern({
      pattern: 'OutOfMemoryError',
      errorType: 'system_error',
      severity: 'critical',
      description: 'System memory exhaustion',
      regex: '.*OutOfMemoryError.*',
      isActive: true,
    });

    console.log('✅ Created error patterns');

    // Create welcome notification for admin
    await storage.createNotification({
      userId: adminUser.id,
      type: 'info',
      title: 'Welcome to StackLens AI',
      message: 'Your admin account has been created successfully. Explore the admin panel to manage users, training modules, and AI models.',
      data: { source: 'system_setup' },
      isRead: false,
    });

    console.log('✅ Database seeded successfully!');
    return { adminUser, adminRole, userRole, modules: [basicModule, advancedModule] };

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log('Database seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database seeding failed:', error);
      process.exit(1);
    });
}