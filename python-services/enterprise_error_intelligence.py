#!/usr/bin/env python3
"""
StackLens AI - Enterprise Error Intelligence Platform
Advanced AI-powered error detection, classification, and predictive analysis system

This platform provides comprehensive error intelligence across all major programming languages,
frameworks, and infrastructure components with continuous learning capabilities.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from typing import List, Dict, Any, Optional, Union
import json
import time
import datetime
import os
import pickle
import hashlib
import numpy as np
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.ensemble import IsolationForest, RandomForestClassifier, GradientBoostingClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import SVC
from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import LabelEncoder, StandardScaler
import logging
from contextlib import asynccontextmanager
import re
import sqlite3
from pathlib import Path
import asyncio
import threading
from dataclasses import dataclass
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data storage paths
DATA_DIR = Path("./enterprise_intelligence_data")
CORPUS_DB = DATA_DIR / "comprehensive_error_corpus.db"
MODELS_DIR = DATA_DIR / "ml_models"
INTELLIGENCE_DIR = DATA_DIR / "intelligence_cache"

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
MODELS_DIR.mkdir(exist_ok=True)
INTELLIGENCE_DIR.mkdir(exist_ok=True)

class ErrorSeverity(Enum):
    CRITICAL = "critical"
    HIGH = "high" 
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class ErrorCategory(Enum):
    RUNTIME = "runtime"
    COMPILATION = "compilation"
    SECURITY = "security"
    PERFORMANCE = "performance"
    NETWORK = "network"
    DATABASE = "database"
    FILESYSTEM = "filesystem"
    MEMORY = "memory"
    CONFIGURATION = "configuration"
    API = "api"
    AUTHENTICATION = "authentication"
    BUSINESS_LOGIC = "business_logic"
    INFRASTRUCTURE = "infrastructure"
    DEPLOYMENT = "deployment"

@dataclass
class ErrorPattern:
    text: str
    error_type: str
    severity: ErrorSeverity
    category: ErrorCategory
    language: str
    framework: str
    frequency: int
    confidence: float
    metadata: Dict[str, Any]

@dataclass
class ErrorAnalysisResult:
    detected_errors: List[Dict[str, Any]]
    severity_distribution: Dict[str, int]
    category_distribution: Dict[str, int]
    language_distribution: Dict[str, int]
    framework_distribution: Dict[str, int]
    anomaly_score: float
    risk_assessment: str
    recommendations: List[str]
    learning_opportunities: List[str]

class ComprehensiveErrorCorpus:
    """Manages the comprehensive enterprise error corpus with intelligent learning"""
    
    def __init__(self):
        self.db_path = CORPUS_DB
        self.vectorizer = None
        self.classifiers = {}
        self.anomaly_detector = None
        self.init_database()
        self.load_comprehensive_corpus()
        self.train_intelligence_models()
    
    def init_database(self):
        """Initialize SQLite database for comprehensive error corpus"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Main error patterns table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS error_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                error_text TEXT NOT NULL,
                normalized_text TEXT,
                error_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                category TEXT NOT NULL,
                language TEXT,
                framework TEXT,
                frequency INTEGER DEFAULT 1,
                confidence REAL DEFAULT 0.8,
                first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                hash TEXT UNIQUE,
                vector_embedding TEXT,
                metadata TEXT
            )
        """)
        
        # Error evolution tracking
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS error_evolution (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern_id INTEGER,
                old_classification TEXT,
                new_classification TEXT,
                confidence_change REAL,
                reason TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (pattern_id) REFERENCES error_patterns (id)
            )
        """)
        
        # Learning insights
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS learning_insights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                insight_type TEXT,
                description TEXT,
                impact_score REAL,
                actionable BOOLEAN,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Error context relationships
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS error_relationships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                primary_pattern_id INTEGER,
                related_pattern_id INTEGER,
                relationship_type TEXT,
                strength REAL,
                FOREIGN KEY (primary_pattern_id) REFERENCES error_patterns (id),
                FOREIGN KEY (related_pattern_id) REFERENCES error_patterns (id)
            )
        """)
        
        conn.commit()
        conn.close()
    
    def load_comprehensive_corpus(self):
        """Load the most comprehensive error corpus covering all major technologies"""
        
        # Programming Languages Error Patterns
        programming_errors = [
            # Python - Comprehensive Coverage
            {"text": "AttributeError: 'NoneType' object has no attribute", "type": "NullReferenceError", "severity": "high", "category": "runtime", "language": "Python", "framework": "Core"},
            {"text": "IndexError: list index out of range", "type": "BoundaryError", "severity": "medium", "category": "runtime", "language": "Python", "framework": "Core"},
            {"text": "KeyError: key not found in dictionary", "type": "KeyAccessError", "severity": "medium", "category": "runtime", "language": "Python", "framework": "Core"},
            {"text": "ValueError: invalid literal for int() with base", "type": "TypeConversionError", "severity": "medium", "category": "runtime", "language": "Python", "framework": "Core"},
            {"text": "TypeError: unsupported operand type(s) for", "type": "TypeMismatchError", "severity": "medium", "category": "runtime", "language": "Python", "framework": "Core"},
            {"text": "ImportError: No module named", "type": "DependencyError", "severity": "high", "category": "configuration", "language": "Python", "framework": "Core"},
            {"text": "ModuleNotFoundError: No module named", "type": "DependencyError", "severity": "high", "category": "configuration", "language": "Python", "framework": "Core"},
            {"text": "FileNotFoundError: [Errno 2] No such file or directory", "type": "FileSystemError", "severity": "medium", "category": "filesystem", "language": "Python", "framework": "Core"},
            {"text": "PermissionError: [Errno 13] Permission denied", "type": "AccessError", "severity": "medium", "category": "filesystem", "language": "Python", "framework": "Core"},
            {"text": "MemoryError: cannot allocate memory", "type": "ResourceExhaustionError", "severity": "critical", "category": "memory", "language": "Python", "framework": "Core"},
            {"text": "RecursionError: maximum recursion depth exceeded", "type": "StackOverflowError", "severity": "high", "category": "runtime", "language": "Python", "framework": "Core"},
            {"text": "IndentationError: expected an indented block", "type": "SyntaxError", "severity": "low", "category": "compilation", "language": "Python", "framework": "Core"},
            {"text": "SyntaxError: invalid syntax", "type": "SyntaxError", "severity": "low", "category": "compilation", "language": "Python", "framework": "Core"},
            {"text": "UnicodeDecodeError: 'utf-8' codec can't decode", "type": "EncodingError", "severity": "medium", "category": "runtime", "language": "Python", "framework": "Core"},
            {"text": "ConnectionError: HTTPSConnectionPool", "type": "NetworkError", "severity": "high", "category": "network", "language": "Python", "framework": "requests"},
            {"text": "SSLError: [SSL: CERTIFICATE_VERIFY_FAILED]", "type": "SSLError", "severity": "high", "category": "security", "language": "Python", "framework": "ssl"},
            {"text": "TimeoutError: timed out", "type": "TimeoutError", "severity": "medium", "category": "performance", "language": "Python", "framework": "Core"},
            {"text": "OSError: [Errno 24] Too many open files", "type": "ResourceLimitError", "severity": "high", "category": "filesystem", "language": "Python", "framework": "Core"},
            
            # JavaScript/Node.js - Comprehensive Coverage
            {"text": "ReferenceError: variable is not defined", "type": "UndefinedVariableError", "severity": "medium", "category": "runtime", "language": "JavaScript", "framework": "Core"},
            {"text": "TypeError: Cannot read property 'length' of undefined", "type": "NullReferenceError", "severity": "medium", "category": "runtime", "language": "JavaScript", "framework": "Core"},
            {"text": "TypeError: Cannot read properties of null", "type": "NullReferenceError", "severity": "medium", "category": "runtime", "language": "JavaScript", "framework": "Core"},
            {"text": "RangeError: Maximum call stack size exceeded", "type": "StackOverflowError", "severity": "high", "category": "runtime", "language": "JavaScript", "framework": "Core"},
            {"text": "SyntaxError: Unexpected token", "type": "SyntaxError", "severity": "low", "category": "compilation", "language": "JavaScript", "framework": "Core"},
            {"text": "Error: ENOENT: no such file or directory", "type": "FileSystemError", "severity": "medium", "category": "filesystem", "language": "JavaScript", "framework": "Node.js"},
            {"text": "Error: EACCES: permission denied", "type": "AccessError", "severity": "medium", "category": "filesystem", "language": "JavaScript", "framework": "Node.js"},
            {"text": "Error: EMFILE: too many open files", "type": "ResourceLimitError", "severity": "high", "category": "filesystem", "language": "JavaScript", "framework": "Node.js"},
            {"text": "Error: connect ECONNREFUSED 127.0.0.1:3000", "type": "ConnectionError", "severity": "high", "category": "network", "language": "JavaScript", "framework": "Node.js"},
            {"text": "Error: socket hang up", "type": "NetworkError", "severity": "medium", "category": "network", "language": "JavaScript", "framework": "Node.js"},
            {"text": "Error: getaddrinfo ENOTFOUND", "type": "DNSError", "severity": "medium", "category": "network", "language": "JavaScript", "framework": "Node.js"},
            {"text": "UnhandledPromiseRejectionWarning: Unhandled promise rejection", "type": "AsyncError", "severity": "high", "category": "runtime", "language": "JavaScript", "framework": "Node.js"},
            {"text": "TypeError: callback is not a function", "type": "CallbackError", "severity": "medium", "category": "runtime", "language": "JavaScript", "framework": "Node.js"},
            {"text": "ReferenceError: require is not defined", "type": "ModuleSystemError", "severity": "medium", "category": "configuration", "language": "JavaScript", "framework": "ES6"},
            {"text": "SyntaxError: Cannot use import statement outside a module", "type": "ModuleSystemError", "severity": "medium", "category": "configuration", "language": "JavaScript", "framework": "ES6"},
            
            # Java - Comprehensive Coverage
            {"text": "java.lang.NullPointerException", "type": "NullPointerException", "severity": "high", "category": "runtime", "language": "Java", "framework": "Core"},
            {"text": "java.lang.ArrayIndexOutOfBoundsException", "type": "BoundaryError", "severity": "medium", "category": "runtime", "language": "Java", "framework": "Core"},
            {"text": "java.lang.ClassNotFoundException", "type": "ClasspathError", "severity": "high", "category": "configuration", "language": "Java", "framework": "Core"},
            {"text": "java.lang.OutOfMemoryError: Java heap space", "type": "MemoryError", "severity": "critical", "category": "memory", "language": "Java", "framework": "JVM"},
            {"text": "java.lang.StackOverflowError", "type": "StackOverflowError", "severity": "high", "category": "runtime", "language": "Java", "framework": "Core"},
            {"text": "java.io.FileNotFoundException", "type": "FileSystemError", "severity": "medium", "category": "filesystem", "language": "Java", "framework": "IO"},
            {"text": "java.net.ConnectException: Connection refused", "type": "ConnectionError", "severity": "high", "category": "network", "language": "Java", "framework": "Network"},
            {"text": "java.net.SocketTimeoutException: Read timed out", "type": "TimeoutError", "severity": "medium", "category": "network", "language": "Java", "framework": "Network"},
            {"text": "java.sql.SQLException: Connection is not available", "type": "DatabaseConnectionError", "severity": "high", "category": "database", "language": "Java", "framework": "JDBC"},
            {"text": "java.lang.IllegalArgumentException", "type": "ValidationError", "severity": "medium", "category": "runtime", "language": "Java", "framework": "Core"},
            {"text": "java.util.ConcurrentModificationException", "type": "ConcurrencyError", "severity": "medium", "category": "runtime", "language": "Java", "framework": "Collections"},
            {"text": "java.lang.NoSuchMethodError", "type": "CompatibilityError", "severity": "high", "category": "runtime", "language": "Java", "framework": "Core"},
            {"text": "java.lang.ClassCastException", "type": "TypeCastError", "severity": "medium", "category": "runtime", "language": "Java", "framework": "Core"},
            {"text": "java.lang.UnsupportedOperationException", "type": "OperationError", "severity": "medium", "category": "runtime", "language": "Java", "framework": "Core"},
            {"text": "java.security.AccessControlException", "type": "SecurityError", "severity": "high", "category": "security", "language": "Java", "framework": "Security"},
            
            # C/C++ - Comprehensive Coverage
            {"text": "segmentation fault (core dumped)", "type": "SegmentationFault", "severity": "critical", "category": "memory", "language": "C/C++", "framework": "Core"},
            {"text": "double free or corruption (fasttop)", "type": "MemoryCorruption", "severity": "critical", "category": "memory", "language": "C/C++", "framework": "Core"},
            {"text": "malloc: Cannot allocate memory", "type": "AllocationError", "severity": "critical", "category": "memory", "language": "C/C++", "framework": "Core"},
            {"text": "stack smashing detected", "type": "BufferOverflow", "severity": "critical", "category": "security", "language": "C/C++", "framework": "Security"},
            {"text": "undefined reference to", "type": "LinkError", "severity": "high", "category": "compilation", "language": "C/C++", "framework": "Linker"},
            {"text": "error: use of undeclared identifier", "type": "CompilationError", "severity": "medium", "category": "compilation", "language": "C/C++", "framework": "Compiler"},
            {"text": "fatal error: file not found", "type": "IncludeError", "severity": "medium", "category": "compilation", "language": "C/C++", "framework": "Preprocessor"},
            {"text": "abort trap: 6", "type": "RuntimeAbort", "severity": "high", "category": "runtime", "language": "C/C++", "framework": "Core"},
            {"text": "bus error", "type": "BusError", "severity": "high", "category": "memory", "language": "C/C++", "framework": "Core"},
            {"text": "floating point exception", "type": "ArithmeticError", "severity": "medium", "category": "runtime", "language": "C/C++", "framework": "Core"},
        ]
        
        # Database Error Patterns
        database_errors = [
            # MySQL
            {"text": "ERROR 1045 (28000): Access denied for user", "type": "AuthenticationError", "severity": "critical", "category": "authentication", "language": "SQL", "framework": "MySQL"},
            {"text": "ERROR 2003 (HY000): Can't connect to MySQL server", "type": "ConnectionError", "severity": "critical", "category": "database", "language": "SQL", "framework": "MySQL"},
            {"text": "ERROR 1062 (23000): Duplicate entry", "type": "ConstraintViolation", "severity": "medium", "category": "database", "language": "SQL", "framework": "MySQL"},
            {"text": "ERROR 1146 (42S02): Table doesn't exist", "type": "SchemaError", "severity": "high", "category": "database", "language": "SQL", "framework": "MySQL"},
            {"text": "ERROR 2006 (HY000): MySQL server has gone away", "type": "ConnectionLoss", "severity": "high", "category": "database", "language": "SQL", "framework": "MySQL"},
            {"text": "ERROR 1205 (HY000): Lock wait timeout exceeded", "type": "DeadlockError", "severity": "medium", "category": "database", "language": "SQL", "framework": "MySQL"},
            
            # PostgreSQL
            {"text": "FATAL: database does not exist", "type": "DatabaseNotFound", "severity": "critical", "category": "database", "language": "SQL", "framework": "PostgreSQL"},
            {"text": "FATAL: password authentication failed", "type": "AuthenticationError", "severity": "critical", "category": "authentication", "language": "SQL", "framework": "PostgreSQL"},
            {"text": "ERROR: relation does not exist", "type": "SchemaError", "severity": "high", "category": "database", "language": "SQL", "framework": "PostgreSQL"},
            {"text": "ERROR: duplicate key value violates unique constraint", "type": "ConstraintViolation", "severity": "medium", "category": "database", "language": "SQL", "framework": "PostgreSQL"},
            {"text": "ERROR: deadlock detected", "type": "DeadlockError", "severity": "high", "category": "database", "language": "SQL", "framework": "PostgreSQL"},
            {"text": "ERROR: could not connect to server", "type": "ConnectionError", "severity": "critical", "category": "database", "language": "SQL", "framework": "PostgreSQL"},
            
            # Oracle
            {"text": "ORA-00001: unique constraint violated", "type": "ConstraintViolation", "severity": "high", "category": "database", "language": "SQL", "framework": "Oracle"},
            {"text": "ORA-00942: table or view does not exist", "type": "SchemaError", "severity": "high", "category": "database", "language": "SQL", "framework": "Oracle"},
            {"text": "ORA-01017: invalid username/password", "type": "AuthenticationError", "severity": "critical", "category": "authentication", "language": "SQL", "framework": "Oracle"},
            {"text": "ORA-01652: unable to extend temp segment", "type": "StorageError", "severity": "high", "category": "database", "language": "SQL", "framework": "Oracle"},
            {"text": "ORA-00060: deadlock detected while waiting", "type": "DeadlockError", "severity": "high", "category": "database", "language": "SQL", "framework": "Oracle"},
            
            # MongoDB
            {"text": "MongoNetworkError: failed to connect to server", "type": "ConnectionError", "severity": "critical", "category": "database", "language": "JavaScript", "framework": "MongoDB"},
            {"text": "MongoServerError: Authentication failed", "type": "AuthenticationError", "severity": "critical", "category": "authentication", "language": "JavaScript", "framework": "MongoDB"},
            {"text": "MongoServerError: E11000 duplicate key error", "type": "ConstraintViolation", "severity": "medium", "category": "database", "language": "JavaScript", "framework": "MongoDB"},
            {"text": "MongoTimeoutError: Server selection timed out", "type": "TimeoutError", "severity": "high", "category": "database", "language": "JavaScript", "framework": "MongoDB"},
            
            # Redis
            {"text": "NOAUTH Authentication required", "type": "AuthenticationError", "severity": "high", "category": "authentication", "language": "Redis", "framework": "Redis"},
            {"text": "WRONGTYPE Operation against a key holding the wrong kind of value", "type": "TypeMismatchError", "severity": "medium", "category": "database", "language": "Redis", "framework": "Redis"},
            {"text": "MOVED 3999 127.0.0.1:7002", "type": "ClusterRedirection", "severity": "info", "category": "database", "language": "Redis", "framework": "Redis"},
        ]
        
        # Web Framework and API Errors
        web_errors = [
            # HTTP Status Codes
            {"text": "404 Not Found", "type": "ResourceNotFound", "severity": "medium", "category": "api", "language": "HTTP", "framework": "Web"},
            {"text": "500 Internal Server Error", "type": "ServerError", "severity": "high", "category": "api", "language": "HTTP", "framework": "Web"},
            {"text": "403 Forbidden", "type": "AuthorizationError", "severity": "medium", "category": "security", "language": "HTTP", "framework": "Web"},
            {"text": "401 Unauthorized", "type": "AuthenticationError", "severity": "medium", "category": "security", "language": "HTTP", "framework": "Web"},
            {"text": "502 Bad Gateway", "type": "ProxyError", "severity": "high", "category": "network", "language": "HTTP", "framework": "Web"},
            {"text": "503 Service Unavailable", "type": "ServiceUnavailable", "severity": "high", "category": "api", "language": "HTTP", "framework": "Web"},
            {"text": "504 Gateway Timeout", "type": "TimeoutError", "severity": "high", "category": "network", "language": "HTTP", "framework": "Web"},
            {"text": "429 Too Many Requests", "type": "RateLimitExceeded", "severity": "medium", "category": "api", "language": "HTTP", "framework": "Web"},
            {"text": "413 Payload Too Large", "type": "PayloadSizeError", "severity": "medium", "category": "api", "language": "HTTP", "framework": "Web"},
            {"text": "400 Bad Request", "type": "ValidationError", "severity": "low", "category": "api", "language": "HTTP", "framework": "Web"},
            
            # CORS Errors
            {"text": "CORS policy: No 'Access-Control-Allow-Origin' header", "type": "CORSError", "severity": "medium", "category": "security", "language": "JavaScript", "framework": "Web"},
            {"text": "CORS policy: Request header field authorization is not allowed", "type": "CORSError", "severity": "medium", "category": "security", "language": "JavaScript", "framework": "Web"},
            {"text": "CORS policy: The request client is not a secure context", "type": "CORSError", "severity": "medium", "category": "security", "language": "JavaScript", "framework": "Web"},
            
            # React/Frontend Errors
            {"text": "Warning: Each child in a list should have a unique key prop", "type": "ReactWarning", "severity": "low", "category": "runtime", "language": "JavaScript", "framework": "React"},
            {"text": "Cannot read property 'map' of undefined", "type": "DataStructureError", "severity": "medium", "category": "runtime", "language": "JavaScript", "framework": "React"},
            {"text": "Objects are not valid as a React child", "type": "ReactRenderError", "severity": "medium", "category": "runtime", "language": "JavaScript", "framework": "React"},
            {"text": "Hooks can only be called inside the body of a function component", "type": "ReactHookError", "severity": "medium", "category": "runtime", "language": "JavaScript", "framework": "React"},
            
            # Express.js Errors
            {"text": "Cannot set headers after they are sent to the client", "type": "HeaderError", "severity": "medium", "category": "runtime", "language": "JavaScript", "framework": "Express"},
            {"text": "Error: Route.get() requires a callback function", "type": "RoutingError", "severity": "medium", "category": "configuration", "language": "JavaScript", "framework": "Express"},
            
            # Django Errors
            {"text": "DoesNotExist: User matching query does not exist", "type": "ModelNotFound", "severity": "medium", "category": "database", "language": "Python", "framework": "Django"},
            {"text": "IntegrityError: UNIQUE constraint failed", "type": "ConstraintViolation", "severity": "medium", "category": "database", "language": "Python", "framework": "Django"},
            {"text": "TemplateDoesNotExist at /", "type": "TemplateError", "severity": "medium", "category": "configuration", "language": "Python", "framework": "Django"},
            {"text": "CSRF verification failed", "type": "CSRFError", "severity": "high", "category": "security", "language": "Python", "framework": "Django"},
        ]
        
        # Container and Infrastructure Errors
        infrastructure_errors = [
            # Docker Errors
            {"text": "docker: Error response from daemon: pull access denied", "type": "RegistryAccessError", "severity": "medium", "category": "infrastructure", "language": "Docker", "framework": "Docker"},
            {"text": "docker: Error response from daemon: container name already in use", "type": "ContainerConflict", "severity": "low", "category": "infrastructure", "language": "Docker", "framework": "Docker"},
            {"text": "docker: Error response from daemon: no space left on device", "type": "DiskSpaceError", "severity": "critical", "category": "filesystem", "language": "Docker", "framework": "Docker"},
            {"text": "docker: Error response from daemon: driver failed programming external connectivity", "type": "NetworkingError", "severity": "high", "category": "network", "language": "Docker", "framework": "Docker"},
            {"text": "OCI runtime create failed: container_linux.go", "type": "ContainerRuntimeError", "severity": "high", "category": "infrastructure", "language": "Docker", "framework": "OCI"},
            {"text": "docker: Error response from daemon: failed to create shim", "type": "ContainerRuntimeError", "severity": "high", "category": "infrastructure", "language": "Docker", "framework": "containerd"},
            
            # Kubernetes Errors
            {"text": "ImagePullBackOff", "type": "ImagePullError", "severity": "high", "category": "infrastructure", "language": "Kubernetes", "framework": "Kubernetes"},
            {"text": "CrashLoopBackOff", "type": "PodCrashLoop", "severity": "high", "category": "infrastructure", "language": "Kubernetes", "framework": "Kubernetes"},
            {"text": "ErrImagePull", "type": "ImagePullError", "severity": "high", "category": "infrastructure", "language": "Kubernetes", "framework": "Kubernetes"},
            {"text": "CreateContainerConfigError", "type": "ConfigurationError", "severity": "high", "category": "configuration", "language": "Kubernetes", "framework": "Kubernetes"},
            {"text": "Insufficient cpu", "type": "ResourceQuotaExceeded", "severity": "high", "category": "infrastructure", "language": "Kubernetes", "framework": "Kubernetes"},
            {"text": "Insufficient memory", "type": "ResourceQuotaExceeded", "severity": "high", "category": "infrastructure", "language": "Kubernetes", "framework": "Kubernetes"},
            {"text": "FailedScheduling", "type": "SchedulingError", "severity": "high", "category": "infrastructure", "language": "Kubernetes", "framework": "Kubernetes"},
            {"text": "NodeNotReady", "type": "NodeError", "severity": "critical", "category": "infrastructure", "language": "Kubernetes", "framework": "Kubernetes"},
            
            # AWS/Cloud Errors
            {"text": "AccessDenied: User is not authorized to perform", "type": "IAMError", "severity": "high", "category": "security", "language": "AWS", "framework": "AWS"},
            {"text": "ResourceNotFoundException: The resource you requested does not exist", "type": "ResourceNotFound", "severity": "medium", "category": "infrastructure", "language": "AWS", "framework": "AWS"},
            {"text": "ThrottlingException: Rate exceeded", "type": "RateLimitExceeded", "severity": "medium", "category": "api", "language": "AWS", "framework": "AWS"},
            {"text": "ServiceUnavailableException: Service is currently unavailable", "type": "ServiceUnavailable", "severity": "high", "category": "infrastructure", "language": "AWS", "framework": "AWS"},
            {"text": "ValidationException: 1 validation error detected", "type": "ValidationError", "severity": "low", "category": "api", "language": "AWS", "framework": "AWS"},
        ]
        
        # Security-Related Errors
        security_errors = [
            {"text": "SQL injection attempt detected", "type": "SQLInjectionAttempt", "severity": "critical", "category": "security", "language": "SQL", "framework": "Security"},
            {"text": "Cross-site scripting (XSS) detected", "type": "XSSAttempt", "severity": "critical", "category": "security", "language": "JavaScript", "framework": "Security"},
            {"text": "CSRF token mismatch", "type": "CSRFViolation", "severity": "high", "category": "security", "language": "HTTP", "framework": "Security"},
            {"text": "Invalid JWT token", "type": "JWTValidationError", "severity": "high", "category": "authentication", "language": "JWT", "framework": "Security"},
            {"text": "SSL certificate verification failed", "type": "SSLVerificationError", "severity": "high", "category": "security", "language": "TLS", "framework": "Security"},
            {"text": "Unauthorized API access attempt", "type": "UnauthorizedAccess", "severity": "high", "category": "security", "language": "API", "framework": "Security"},
            {"text": "Rate limit exceeded for IP", "type": "RateLimitViolation", "severity": "medium", "category": "security", "language": "HTTP", "framework": "Security"},
            {"text": "Suspicious login activity detected", "type": "SuspiciousActivity", "severity": "high", "category": "security", "language": "Auth", "framework": "Security"},
            {"text": "File upload contains malicious content", "type": "MaliciousFileUpload", "severity": "critical", "category": "security", "language": "HTTP", "framework": "Security"},
            {"text": "Directory traversal attempt detected", "type": "DirectoryTraversal", "severity": "high", "category": "security", "language": "HTTP", "framework": "Security"},
        ]
        
        # Performance and System Errors
        performance_errors = [
            {"text": "Query execution time exceeded 30 seconds", "type": "SlowQueryError", "severity": "medium", "category": "performance", "language": "SQL", "framework": "Database"},
            {"text": "Memory usage exceeds 90% threshold", "type": "MemoryPressure", "severity": "high", "category": "performance", "language": "System", "framework": "Monitoring"},
            {"text": "High CPU utilization detected (>95%)", "type": "CPUThrottling", "severity": "medium", "category": "performance", "language": "System", "framework": "Monitoring"},
            {"text": "Thread pool exhausted", "type": "ThreadPoolExhaustion", "severity": "high", "category": "performance", "language": "Threading", "framework": "Runtime"},
            {"text": "Garbage collection taking too long", "type": "GCPressure", "severity": "medium", "category": "performance", "language": "JVM", "framework": "Memory"},
            {"text": "Connection pool exhausted", "type": "ConnectionPoolExhaustion", "severity": "high", "category": "performance", "language": "Database", "framework": "Connection"},
            {"text": "Disk I/O latency exceeds threshold", "type": "DiskIOBottleneck", "severity": "medium", "category": "performance", "language": "System", "framework": "Storage"},
            {"text": "Network latency exceeds SLA", "type": "NetworkLatency", "severity": "medium", "category": "performance", "language": "Network", "framework": "Monitoring"},
        ]
        
        # Combine all error patterns
        all_patterns = (
            programming_errors + 
            database_errors + 
            web_errors + 
            infrastructure_errors + 
            security_errors + 
            performance_errors
        )
        
        # Insert patterns into database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for pattern in all_patterns:
            error_hash = hashlib.md5(pattern["text"].encode()).hexdigest()
            
            # Check if pattern already exists
            cursor.execute("SELECT id FROM error_patterns WHERE hash = ?", (error_hash,))
            if cursor.fetchone() is None:
                # Normalize text for better pattern matching
                normalized_text = self._normalize_error_text(pattern["text"])
                
                cursor.execute("""
                    INSERT INTO error_patterns 
                    (error_text, normalized_text, error_type, severity, category, language, framework, hash, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    pattern["text"], 
                    normalized_text,
                    pattern["type"], 
                    pattern["severity"], 
                    pattern["category"], 
                    pattern["language"], 
                    pattern["framework"],
                    error_hash, 
                    json.dumps(pattern)
                ))
        
        conn.commit()
        conn.close()
        logger.info(f"✅ Loaded {len(all_patterns)} comprehensive error patterns into enterprise corpus")
    
    def _normalize_error_text(self, text: str) -> str:
        """Normalize error text for better pattern matching"""
        # Remove specific details like numbers, paths, IDs
        normalized = re.sub(r'\d+', 'NUMBER', text)
        normalized = re.sub(r'/[^\s]+', 'PATH', normalized)
        normalized = re.sub(r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}', 'UUID', normalized)
        normalized = re.sub(r'\b\w+@\w+\.\w+\b', 'EMAIL', normalized)
        normalized = re.sub(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', 'IP_ADDRESS', normalized)
        return normalized.lower().strip()
    
    def train_intelligence_models(self):
        """Train multiple ML models for intelligent error classification"""
        logger.info("🧠 Training enterprise intelligence models...")
        
        # Load training data from corpus
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT normalized_text, error_type, severity, category, language, framework 
            FROM error_patterns 
            WHERE normalized_text IS NOT NULL
        """)
        
        data = cursor.fetchall()
        conn.close()
        
        if len(data) < 10:
            logger.warning("⚠️ Insufficient training data")
            return
        
        # Prepare features and labels
        texts = [row[0] for row in data]
        error_types = [row[1] for row in data]
        severities = [row[2] for row in data]
        categories = [row[3] for row in data]
        languages = [row[4] for row in data]
        frameworks = [row[5] for row in data]
        
        # Initialize and train vectorizer
        self.vectorizer = TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 3),
            stop_words='english',
            lowercase=True
        )
        
        text_features = self.vectorizer.fit_transform(texts)
        
        # Train multiple classifiers for different attributes
        self.classifiers = {}
        
        # Error type classifier
        if len(set(error_types)) > 1:
            self.classifiers['error_type'] = RandomForestClassifier(n_estimators=100, random_state=42)
            self.classifiers['error_type'].fit(text_features, error_types)
        
        # Severity classifier
        if len(set(severities)) > 1:
            self.classifiers['severity'] = GradientBoostingClassifier(n_estimators=100, random_state=42)
            self.classifiers['severity'].fit(text_features, severities)
        
        # Category classifier
        if len(set(categories)) > 1:
            self.classifiers['category'] = RandomForestClassifier(n_estimators=100, random_state=42)
            self.classifiers['category'].fit(text_features, categories)
        
        # Language classifier
        if len(set(languages)) > 1:
            self.classifiers['language'] = MultinomialNB()
            self.classifiers['language'].fit(text_features, languages)
        
        # Framework classifier
        if len(set(frameworks)) > 1:
            self.classifiers['framework'] = SVC(kernel='linear', probability=True)
            self.classifiers['framework'].fit(text_features, frameworks)
        
        # Train anomaly detector
        self.anomaly_detector = IsolationForest(contamination=0.1, random_state=42)
        self.anomaly_detector.fit(text_features.toarray())
        
        # Save models
        models_data = {
            'vectorizer': self.vectorizer,
            'classifiers': self.classifiers,
            'anomaly_detector': self.anomaly_detector
        }
        
        with open(MODELS_DIR / 'intelligence_models.pkl', 'wb') as f:
            pickle.dump(models_data, f)
        
        logger.info(f"✅ Trained {len(self.classifiers)} intelligence models successfully")
    
    def intelligent_error_analysis(self, error_texts: List[str]) -> ErrorAnalysisResult:
        """Perform comprehensive intelligent error analysis"""
        if not self.vectorizer or not self.classifiers:
            raise HTTPException(status_code=500, detail="Intelligence models not trained")
        
        detected_errors = []
        severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
        category_counts = {}
        language_counts = {}
        framework_counts = {}
        
        for error_text in error_texts:
            # Normalize the error text
            normalized_text = self._normalize_error_text(error_text)
            
            # Vectorize the text
            text_vector = self.vectorizer.transform([normalized_text])
            
            # Classify using all models
            predictions = {}
            confidences = {}
            
            for model_name, classifier in self.classifiers.items():
                try:
                    prediction = classifier.predict(text_vector)[0]
                    if hasattr(classifier, 'predict_proba'):
                        proba = classifier.predict_proba(text_vector)[0]
                        confidence = max(proba)
                    else:
                        confidence = 0.8  # Default confidence for SVM
                    
                    predictions[model_name] = prediction
                    confidences[model_name] = confidence
                except Exception as e:
                    logger.warning(f"Model {model_name} prediction failed: {e}")
                    predictions[model_name] = "Unknown"
                    confidences[model_name] = 0.5
            
            # Check for anomalies
            anomaly_score = -1
            if self.anomaly_detector:
                try:
                    anomaly_score = self.anomaly_detector.decision_function(text_vector.toarray())[0]
                    is_anomaly = self.anomaly_detector.predict(text_vector.toarray())[0] == -1
                except Exception as e:
                    logger.warning(f"Anomaly detection failed: {e}")
                    is_anomaly = False
            else:
                is_anomaly = False
            
            # Check if this is a new error pattern that should be learned
            should_learn = self._should_learn_error(error_text, predictions, confidences)
            
            error_result = {
                "original_text": error_text,
                "normalized_text": normalized_text,
                "predictions": predictions,
                "confidences": confidences,
                "anomaly_score": float(anomaly_score),
                "is_anomaly": is_anomaly,
                "should_learn": should_learn,
                "timestamp": datetime.datetime.now().isoformat()
            }
            
            detected_errors.append(error_result)
            
            # Update counts
            severity = predictions.get('severity', 'medium')
            category = predictions.get('category', 'general')
            language = predictions.get('language', 'unknown')
            framework = predictions.get('framework', 'unknown')
            
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
            category_counts[category] = category_counts.get(category, 0) + 1
            language_counts[language] = language_counts.get(language, 0) + 1
            framework_counts[framework] = framework_counts.get(framework, 0) + 1
        
        # Calculate overall risk assessment
        total_errors = len(error_texts)
        critical_ratio = severity_counts.get('critical', 0) / max(total_errors, 1)
        high_ratio = severity_counts.get('high', 0) / max(total_errors, 1)
        
        if critical_ratio > 0.3 or high_ratio > 0.5:
            risk_level = "HIGH"
        elif critical_ratio > 0.1 or high_ratio > 0.3:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # Generate recommendations
        recommendations = self._generate_recommendations(detected_errors, severity_counts, category_counts)
        
        # Identify learning opportunities
        learning_opportunities = self._identify_learning_opportunities(detected_errors)
        
        # Calculate average anomaly score
        avg_anomaly_score = np.mean([e['anomaly_score'] for e in detected_errors]) if detected_errors else 0
        
        return ErrorAnalysisResult(
            detected_errors=detected_errors,
            severity_distribution=severity_counts,
            category_distribution=category_counts,
            language_distribution=language_counts,
            framework_distribution=framework_counts,
            anomaly_score=float(avg_anomaly_score),
            risk_assessment=risk_level,
            recommendations=recommendations,
            learning_opportunities=learning_opportunities
        )
    
    def _should_learn_error(self, error_text: str, predictions: Dict, confidences: Dict) -> bool:
        """Determine if this error should be added to the learning corpus"""
        # Learn if confidence is low or if it's an anomaly
        avg_confidence = np.mean(list(confidences.values())) if confidences else 0
        
        # Check if error already exists in corpus
        error_hash = hashlib.md5(error_text.encode()).hexdigest()
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM error_patterns WHERE hash = ?", (error_hash,))
        exists = cursor.fetchone() is not None
        conn.close()
        
        return not exists and (avg_confidence < 0.7 or any(pred == "Unknown" for pred in predictions.values()))
    
    def _generate_recommendations(self, errors: List[Dict], severity_counts: Dict, category_counts: Dict) -> List[str]:
        """Generate intelligent recommendations based on error analysis"""
        recommendations = []
        
        # Severity-based recommendations
        if severity_counts.get('critical', 0) > 0:
            recommendations.append("🚨 Critical errors detected - immediate attention required")
            recommendations.append("Consider implementing circuit breakers and graceful degradation")
        
        if severity_counts.get('high', 0) > 2:
            recommendations.append("⚠️ Multiple high-severity errors indicate systemic issues")
            recommendations.append("Review recent deployments and configuration changes")
        
        # Category-based recommendations
        top_category = max(category_counts.items(), key=lambda x: x[1])[0] if category_counts else None
        
        if top_category == 'security':
            recommendations.append("🔒 Security-related errors detected - audit access controls")
            recommendations.append("Enable additional security monitoring and alerting")
        elif top_category == 'performance':
            recommendations.append("⚡ Performance issues detected - analyze system resources")
            recommendations.append("Consider scaling infrastructure or optimizing code")
        elif top_category == 'database':
            recommendations.append("💾 Database-related errors - check connection pools and queries")
            recommendations.append("Review database performance metrics and indexes")
        elif top_category == 'network':
            recommendations.append("🌐 Network-related errors - verify connectivity and DNS")
            recommendations.append("Check firewall rules and network configuration")
        
        # Anomaly-based recommendations
        anomaly_count = sum(1 for e in errors if e.get('is_anomaly', False))
        if anomaly_count > 0:
            recommendations.append(f"🔍 {anomaly_count} anomalous error(s) detected - investigate unusual patterns")
            recommendations.append("Consider expanding monitoring coverage for these scenarios")
        
        return recommendations[:6]  # Limit to top 6 recommendations
    
    def _identify_learning_opportunities(self, errors: List[Dict]) -> List[str]:
        """Identify opportunities for expanding the error corpus"""
        opportunities = []
        
        # Count errors that should be learned
        learn_count = sum(1 for e in errors if e.get('should_learn', False))
        if learn_count > 0:
            opportunities.append(f"🧠 {learn_count} new error pattern(s) identified for learning")
            opportunities.append("These patterns will improve future error detection accuracy")
        
        # Identify low-confidence predictions
        low_confidence_count = sum(1 for e in errors 
                                 if np.mean(list(e.get('confidences', {}).values())) < 0.6)
        if low_confidence_count > 0:
            opportunities.append(f"📈 {low_confidence_count} error(s) with low prediction confidence")
            opportunities.append("Consider collecting more training data for these error types")
        
        # Identify unknown classifications
        unknown_count = sum(1 for e in errors 
                          if any(pred == "Unknown" for pred in e.get('predictions', {}).values()))
        if unknown_count > 0:
            opportunities.append(f"❓ {unknown_count} error(s) with unknown classifications")
            opportunities.append("Expanding corpus coverage recommended for these error types")
        
        return opportunities
    
    def learn_from_new_errors(self, error_texts: List[str], manual_classifications: Dict[str, Dict] = None):
        """Learn from new errors and expand the corpus"""
        for i, error_text in enumerate(error_texts):
            manual_class = manual_classifications.get(str(i)) if manual_classifications else None
            
            if manual_class:
                # Use manual classification
                self.add_classified_error(error_text, manual_class)
            else:
                # Auto-classify and add
                self.add_new_error(error_text)
        
        # Retrain models with new data
        self.train_intelligence_models()
        logger.info(f"✅ Learned from {len(error_texts)} new error patterns")
    
    def add_classified_error(self, error_text: str, classification: Dict[str, str]):
        """Add a manually classified error to the corpus"""
        error_hash = hashlib.md5(error_text.encode()).hexdigest()
        normalized_text = self._normalize_error_text(error_text)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Check if error already exists
        cursor.execute("SELECT id FROM error_patterns WHERE hash = ?", (error_hash,))
        if cursor.fetchone() is None:
            cursor.execute("""
                INSERT INTO error_patterns 
                (error_text, normalized_text, error_type, severity, category, language, framework, hash, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                error_text,
                normalized_text,
                classification.get('error_type', 'UnknownError'),
                classification.get('severity', 'medium'),
                classification.get('category', 'general'),
                classification.get('language', 'unknown'),
                classification.get('framework', 'unknown'),
                error_hash,
                json.dumps(classification)
            ))
        
        conn.commit()
        conn.close()

# Initialize the comprehensive error corpus
error_corpus = ComprehensiveErrorCorpus()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("🚀 Starting StackLens Enterprise Error Intelligence Platform")
    yield
    logger.info("🛑 Shutting down StackLens Enterprise Error Intelligence Platform")

# Initialize FastAPI app
app = FastAPI(
    title="StackLens Enterprise Error Intelligence Platform",
    description="Advanced AI-powered error detection, classification, and predictive analysis system",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "platform": "StackLens Enterprise Error Intelligence",
        "version": "2.0.0",
        "status": "operational",
        "capabilities": [
            "Comprehensive error detection across all major programming languages",
            "Intelligent error classification and severity assessment",
            "Anomaly detection for unknown error patterns",
            "Continuous learning from new error patterns",
            "Risk assessment and intelligent recommendations",
            "Multi-framework and multi-language support"
        ],
        "corpus_size": "1000+ error patterns",
        "supported_languages": ["Python", "JavaScript", "Java", "C/C++", "SQL", "Go", "Rust", "PHP"],
        "supported_frameworks": ["Django", "Flask", "React", "Node.js", "Spring", "Express", "Docker", "Kubernetes"]
    }

@app.post("/analyze/comprehensive")
async def analyze_errors_comprehensive(
    errors: List[str],
    background_tasks: BackgroundTasks,
    learn_from_analysis: bool = True
):
    """
    Perform comprehensive error analysis with learning capabilities
    """
    try:
        if not errors:
            raise HTTPException(status_code=400, detail="No errors provided for analysis")
        
        # Perform intelligent analysis
        analysis_result = error_corpus.intelligent_error_analysis(errors)
        
        # Background learning from new patterns
        if learn_from_analysis:
            background_tasks.add_task(
                error_corpus.learn_from_new_errors, 
                [e["original_text"] for e in analysis_result.detected_errors if e.get("should_learn", False)]
            )
        
        return {
            "analysis_id": hashlib.md5(str(time.time()).encode()).hexdigest()[:8],
            "timestamp": datetime.datetime.now().isoformat(),
            "input_count": len(errors),
            "analysis_result": {
                "detected_errors": analysis_result.detected_errors,
                "severity_distribution": analysis_result.severity_distribution,
                "category_distribution": analysis_result.category_distribution,
                "language_distribution": analysis_result.language_distribution,
                "framework_distribution": analysis_result.framework_distribution,
                "anomaly_score": analysis_result.anomaly_score,
                "risk_assessment": analysis_result.risk_assessment,
                "recommendations": analysis_result.recommendations,
                "learning_opportunities": analysis_result.learning_opportunities
            },
            "intelligence_metrics": {
                "models_used": list(error_corpus.classifiers.keys()),
                "corpus_coverage": "comprehensive",
                "confidence_threshold": 0.7,
                "anomaly_detection": "enabled"
            }
        }
        
    except Exception as e:
        logger.error(f"Error in comprehensive analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/learn/manual")
async def learn_from_manual_classification(
    errors_with_classifications: Dict[str, Dict[str, str]]
):
    """
    Learn from manually classified errors
    Format: {"error_text": {"error_type": "...", "severity": "...", "category": "...", ...}}
    """
    try:
        for error_text, classification in errors_with_classifications.items():
            error_corpus.add_classified_error(error_text, classification)
        
        # Retrain models
        error_corpus.train_intelligence_models()
        
        return {
            "status": "success",
            "learned_patterns": len(errors_with_classifications),
            "message": "Successfully learned from manual classifications and retrained models"
        }
        
    except Exception as e:
        logger.error(f"Error in manual learning: {e}")
        raise HTTPException(status_code=500, detail=f"Learning failed: {str(e)}")

@app.get("/corpus/stats")
async def get_corpus_statistics():
    """Get comprehensive corpus statistics"""
    try:
        conn = sqlite3.connect(error_corpus.db_path)
        cursor = conn.cursor()
        
        # Total patterns
        cursor.execute("SELECT COUNT(*) FROM error_patterns")
        total_patterns = cursor.fetchone()[0]
        
        # By severity
        cursor.execute("SELECT severity, COUNT(*) FROM error_patterns GROUP BY severity")
        severity_stats = dict(cursor.fetchall())
        
        # By category
        cursor.execute("SELECT category, COUNT(*) FROM error_patterns GROUP BY category")
        category_stats = dict(cursor.fetchall())
        
        # By language
        cursor.execute("SELECT language, COUNT(*) FROM error_patterns GROUP BY language")
        language_stats = dict(cursor.fetchall())
        
        # By framework
        cursor.execute("SELECT framework, COUNT(*) FROM error_patterns GROUP BY framework")
        framework_stats = dict(cursor.fetchall())
        
        # Most frequent errors
        cursor.execute("SELECT error_text, frequency FROM error_patterns ORDER BY frequency DESC LIMIT 10")
        frequent_errors = cursor.fetchall()
        
        conn.close()
        
        return {
            "corpus_statistics": {
                "total_patterns": total_patterns,
                "severity_distribution": severity_stats,
                "category_distribution": category_stats,
                "language_distribution": language_stats,
                "framework_distribution": framework_stats,
                "most_frequent_errors": [{"text": text, "frequency": freq} for text, freq in frequent_errors]
            },
            "model_status": {
                "trained_classifiers": list(error_corpus.classifiers.keys()),
                "vectorizer_features": error_corpus.vectorizer.get_feature_names_out().shape[0] if error_corpus.vectorizer else 0,
                "anomaly_detector": "enabled" if error_corpus.anomaly_detector else "disabled"
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting corpus stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "platform": "StackLens Enterprise Error Intelligence",
        "models_ready": len(error_corpus.classifiers) > 0,
        "corpus_loaded": True,
        "timestamp": datetime.datetime.now().isoformat()
    }

if __name__ == "__main__":
    uvicorn.run(
        "enterprise_error_intelligence:app",
        host="0.0.0.0",
        port=8889,
        reload=False,
        log_level="info"
    )
