import { storage } from "./database-storage";

export async function seedDefaultData() {
  console.log("Seeding default data...");

  // Create default roles
  const roles = [
    {
      name: 'admin',
      description: 'Administrator with full system access',
      permissions: JSON.stringify([
        'user_management',
        'role_management',
        'ml_model_management',
        'training_management',
        'system_settings',
        'audit_logs',
        'notifications_manage'
      ])
    },
    {
      name: 'user',
      description: 'Regular user with basic functionality',
      permissions: JSON.stringify([
        'file_upload',
        'error_analysis',
        'ai_suggestions',
        'view_own_data',
        'notifications_read'
      ])
    },
    {
      name: 'analyst',
      description: 'Data analyst with advanced analytics access',
      permissions: JSON.stringify([
        'file_upload',
        'error_analysis',
        'ai_suggestions',
        'view_own_data',
        'advanced_analytics',
        'export_data',
        'notifications_read'
      ])
    }
  ];

  for (const role of roles) {
    try {
      const existing = await storage.getRoleByName(role.name);
      if (!existing) {
        await storage.createRole(role);
        console.log(`✓ Created role: ${role.name}`);
      }
    } catch (error) {
      console.error(`Error creating role ${role.name}:`, error);
    }
  }

  // Create default training modules
  const trainingModules = [
    {
      title: 'Log Analysis Fundamentals',
      description: 'Learn the basics of log file analysis and error detection',
      content: `
# Log Analysis Fundamentals

## Overview
This module covers the fundamentals of log file analysis, including:
- Understanding different log formats
- Identifying error patterns
- Severity classification
- Best practices for log management

## Key Topics
1. **Log File Types**: TEXT, JSON, XML, CSV
2. **Error Detection**: Pattern matching and keyword analysis
3. **Severity Levels**: Critical, High, Medium, Low
4. **Resolution Strategies**: Root cause analysis and fixing approaches

## Practical Exercises
- Analyze sample log files
- Identify common error patterns
- Practice severity classification
- Create custom error patterns
      `,
      difficulty: 'beginner',
      estimatedDuration: 45,
      createdBy: 1
    },
    {
      title: 'AI-Powered Error Resolution',
      description: 'Advanced techniques for using AI to resolve log errors',
      content: `
# AI-Powered Error Resolution

## Overview
Learn how to leverage AI and machine learning for automated error resolution:
- AI suggestion generation
- Machine learning model training
- Pattern recognition
- Automated resolution workflows

## Key Topics
1. **AI Integration**: Using Gemini AI for intelligent suggestions
2. **ML Models**: Training custom models for error prediction
3. **Feature Engineering**: Extracting relevant features from logs
4. **Automated Resolution**: Building workflows for common errors

## Advanced Topics
- Model performance optimization
- Custom training datasets
- Integration with external systems
- Real-time error monitoring
      `,
      difficulty: 'advanced',
      estimatedDuration: 90,
      createdBy: 1
    },
    {
      title: 'System Administration',
      description: 'Complete guide to StackLens AI administration',
      content: `
# System Administration

## Overview
Complete guide for administering StackLens AI platform:
- User management
- Role configuration
- System monitoring
- Performance optimization

## Key Topics
1. **User Management**: Creating and managing user accounts
2. **Role-Based Access**: Configuring permissions and access levels
3. **System Monitoring**: Dashboard analytics and performance metrics
4. **Data Management**: Backup, recovery, and maintenance procedures

## Administrative Tasks
- User onboarding and training
- System configuration
- Performance monitoring
- Troubleshooting common issues
      `,
      difficulty: 'intermediate',
      estimatedDuration: 60,
      createdBy: 1
    }
  ];

  for (const module of trainingModules) {
    try {
      const existing = await storage.getAllTrainingModules();
      const exists = existing.find(m => m.title === module.title);
      if (!exists) {
        await storage.createTrainingModule(module);
        console.log(`✓ Created training module: ${module.title}`);
      }
    } catch (error) {
      console.error(`Error creating training module ${module.title}:`, error);
    }
  }

  // Create default error patterns
  const errorPatterns = [
    {
      pattern: 'Database connection failed',
      regex: '(database|db).*(connection|connect).*(failed|error|timeout)',
      description: 'Database connectivity issues',
      severity: 'critical',
      errorType: 'database_error',
      category: 'connectivity',
      suggestedFix: 'Check database server status, connection strings, and network connectivity'
    },
    {
      pattern: 'Out of memory',
      regex: '(out of memory|oom|memory.*exhausted)',
      description: 'Memory exhaustion errors',
      severity: 'critical',
      errorType: 'memory_error',
      category: 'performance',
      suggestedFix: 'Increase memory allocation, optimize memory usage, or restart services'
    },
    {
      pattern: 'File not found',
      regex: '(file not found|no such file|cannot find)',
      description: 'Missing file or path errors',
      severity: 'high',
      errorType: 'file_error',
      category: 'filesystem',
      suggestedFix: 'Verify file paths, check permissions, and ensure required files exist'
    },
    {
      pattern: 'Authentication failed',
      regex: '(authentication|auth).*(failed|error|denied)',
      description: 'Authentication and authorization failures',
      severity: 'high',
      errorType: 'auth_error',
      category: 'security',
      suggestedFix: 'Verify credentials, check authentication configuration, and review access permissions'
    },
    {
      pattern: 'Timeout error',
      regex: '(timeout|timed out|connection timeout)',
      description: 'Request or connection timeout errors',
      severity: 'medium',
      errorType: 'timeout_error',
      category: 'performance',
      suggestedFix: 'Increase timeout values, optimize query performance, or check network latency'
    }
  ];

  for (const pattern of errorPatterns) {
    try {
      const existing = await storage.getActiveErrorPatterns();
      const exists = existing.find(p => p.pattern === pattern.pattern);
      if (!exists) {
        await storage.createErrorPattern(pattern);
        console.log(`✓ Created error pattern: ${pattern.pattern}`);
      }
    } catch (error) {
      console.error(`Error creating error pattern ${pattern.pattern}:`, error);
    }
  }

  console.log("✅ Default data seeding completed");
}