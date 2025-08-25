#!/usr/bin/env python3
"""
StackLens AI - Production Error Analysis Platform
Advanced AI-powered error detection, classification, and pattern analysis system
"""

from fastapi import FastAPI, HTTPException
import uvicorn
from typing import List, Dict, Any, Optional
import json
import time
import datetime
import os
import pickle
import hashlib
import numpy as np
from sklearn.cluster import KMeans, DBSCAN
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import logging
from contextlib import asynccontextmanager
import re
import sqlite3
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data storage paths
DATA_DIR = Path("./stacklens_data")
CORPUS_DB = DATA_DIR / "error_corpus.db"
MODELS_DIR = DATA_DIR / "models"

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
MODELS_DIR.mkdir(exist_ok=True)

class ErrorCorpusManager:
    """Manages the comprehensive error pattern corpus with automatic learning"""
    
    def __init__(self):
        self.db_path = CORPUS_DB
        self.init_database()
        self.load_initial_corpus()
    
    def init_database(self):
        """Initialize SQLite database for error corpus"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS error_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                error_text TEXT NOT NULL,
                error_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                category TEXT NOT NULL,
                language TEXT,
                framework TEXT,
                frequency INTEGER DEFAULT 1,
                first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                hash TEXT UNIQUE,
                metadata TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS error_classifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern_id INTEGER,
                classification TEXT,
                confidence REAL,
                model_version TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (pattern_id) REFERENCES error_patterns (id)
            )
        """)
        
        conn.commit()
        conn.close()
    
    def load_initial_corpus(self):
        """Load comprehensive initial error corpus"""
        initial_patterns = [
            # Database Errors
            {"text": "ORA-00001: unique constraint violated", "type": "DatabaseError", "severity": "High", "category": "Database", "language": "SQL", "framework": "Oracle"},
            {"text": "ORA-00942: table or view does not exist", "type": "DatabaseError", "severity": "High", "category": "Database", "language": "SQL", "framework": "Oracle"},
            {"text": "ORA-01017: invalid username/password; logon denied", "type": "AuthenticationError", "severity": "Critical", "category": "Security", "language": "SQL", "framework": "Oracle"},
            {"text": "ERROR 1045 (28000): Access denied for user", "type": "AuthenticationError", "severity": "Critical", "category": "Security", "language": "SQL", "framework": "MySQL"},
            {"text": "ERROR 2003 (HY000): Can't connect to MySQL server", "type": "ConnectionError", "severity": "Critical", "category": "Database", "language": "SQL", "framework": "MySQL"},
            {"text": "FATAL: database does not exist", "type": "DatabaseError", "severity": "Critical", "category": "Database", "language": "SQL", "framework": "PostgreSQL"},
            {"text": "connection to server was lost", "type": "ConnectionError", "severity": "High", "category": "Database", "language": "SQL", "framework": "PostgreSQL"},
            {"text": "deadlock detected", "type": "DeadlockError", "severity": "High", "category": "Database", "language": "SQL", "framework": "General"},
            {"text": "timeout expired", "type": "TimeoutError", "severity": "Medium", "category": "Database", "language": "SQL", "framework": "General"},
            {"text": "too many connections", "type": "ResourceError", "severity": "Critical", "category": "Database", "language": "SQL", "framework": "General"},
            
            # Python Errors
            {"text": "AttributeError: 'NoneType' object has no attribute", "type": "AttributeError", "severity": "High", "category": "Runtime", "language": "Python", "framework": "General"},
            {"text": "IndexError: list index out of range", "type": "IndexError", "severity": "Medium", "category": "Runtime", "language": "Python", "framework": "General"},
            {"text": "KeyError: key not found in dictionary", "type": "KeyError", "severity": "Medium", "category": "Runtime", "language": "Python", "framework": "General"},
            {"text": "ValueError: invalid literal for int()", "type": "ValueError", "severity": "Medium", "category": "Runtime", "language": "Python", "framework": "General"},
            {"text": "TypeError: unsupported operand type(s)", "type": "TypeError", "severity": "Medium", "category": "Runtime", "language": "Python", "framework": "General"},
            {"text": "ImportError: No module named", "type": "ImportError", "severity": "High", "category": "Configuration", "language": "Python", "framework": "General"},
            {"text": "ModuleNotFoundError: No module named", "type": "ModuleNotFoundError", "severity": "High", "category": "Configuration", "language": "Python", "framework": "General"},
            {"text": "FileNotFoundError: No such file or directory", "type": "FileNotFoundError", "severity": "Medium", "category": "FileSystem", "language": "Python", "framework": "General"},
            {"text": "PermissionError: Permission denied", "type": "PermissionError", "severity": "Medium", "category": "FileSystem", "language": "Python", "framework": "General"},
            {"text": "MemoryError: cannot allocate memory", "type": "MemoryError", "severity": "Critical", "category": "System", "language": "Python", "framework": "General"},
            {"text": "RecursionError: maximum recursion depth exceeded", "type": "RecursionError", "severity": "High", "category": "Logic", "language": "Python", "framework": "General"},
            {"text": "IndentationError: expected an indented block", "type": "IndentationError", "severity": "Low", "category": "Syntax", "language": "Python", "framework": "General"},
            {"text": "SyntaxError: invalid syntax", "type": "SyntaxError", "severity": "Low", "category": "Syntax", "language": "Python", "framework": "General"},
            
            # JavaScript/Node.js Errors
            {"text": "ReferenceError: variable is not defined", "type": "ReferenceError", "severity": "Medium", "category": "Runtime", "language": "JavaScript", "framework": "General"},
            {"text": "TypeError: Cannot read property of undefined", "type": "TypeError", "severity": "Medium", "category": "Runtime", "language": "JavaScript", "framework": "General"},
            {"text": "RangeError: Maximum call stack size exceeded", "type": "RangeError", "severity": "High", "category": "Logic", "language": "JavaScript", "framework": "General"},
            {"text": "SyntaxError: Unexpected token", "type": "SyntaxError", "severity": "Low", "category": "Syntax", "language": "JavaScript", "framework": "General"},
            {"text": "Error: ENOENT: no such file or directory", "type": "FileSystemError", "severity": "Medium", "category": "FileSystem", "language": "JavaScript", "framework": "Node.js"},
            {"text": "Error: EACCES: permission denied", "type": "PermissionError", "severity": "Medium", "category": "FileSystem", "language": "JavaScript", "framework": "Node.js"},
            {"text": "Error: EMFILE: too many open files", "type": "ResourceError", "severity": "High", "category": "System", "language": "JavaScript", "framework": "Node.js"},
            {"text": "Error: connect ECONNREFUSED", "type": "ConnectionError", "severity": "High", "category": "Network", "language": "JavaScript", "framework": "Node.js"},
            {"text": "Error: socket hang up", "type": "NetworkError", "severity": "Medium", "category": "Network", "language": "JavaScript", "framework": "Node.js"},
            
            # Java Errors
            {"text": "java.lang.NullPointerException", "type": "NullPointerException", "severity": "High", "category": "Runtime", "language": "Java", "framework": "General"},
            {"text": "java.lang.ArrayIndexOutOfBoundsException", "type": "ArrayIndexOutOfBoundsException", "severity": "Medium", "category": "Runtime", "language": "Java", "framework": "General"},
            {"text": "java.lang.ClassNotFoundException", "type": "ClassNotFoundException", "severity": "High", "category": "Configuration", "language": "Java", "framework": "General"},
            {"text": "java.lang.OutOfMemoryError", "type": "OutOfMemoryError", "severity": "Critical", "category": "System", "language": "Java", "framework": "General"},
            {"text": "java.lang.StackOverflowError", "type": "StackOverflowError", "severity": "High", "category": "Logic", "language": "Java", "framework": "General"},
            {"text": "java.io.FileNotFoundException", "type": "FileNotFoundException", "severity": "Medium", "category": "FileSystem", "language": "Java", "framework": "General"},
            {"text": "java.net.ConnectException: Connection refused", "type": "ConnectException", "severity": "High", "category": "Network", "language": "Java", "framework": "General"},
            {"text": "java.net.SocketTimeoutException", "type": "SocketTimeoutException", "severity": "Medium", "category": "Network", "language": "Java", "framework": "General"},
            {"text": "java.sql.SQLException: Connection is not available", "type": "SQLException", "severity": "High", "category": "Database", "language": "Java", "framework": "JDBC"},
            
            # C/C++ Errors
            {"text": "segmentation fault (core dumped)", "type": "SegmentationFault", "severity": "Critical", "category": "Memory", "language": "C/C++", "framework": "General"},
            {"text": "double free or corruption", "type": "MemoryCorruption", "severity": "Critical", "category": "Memory", "language": "C/C++", "framework": "General"},
            {"text": "malloc: Cannot allocate memory", "type": "AllocationError", "severity": "Critical", "category": "Memory", "language": "C/C++", "framework": "General"},
            {"text": "stack smashing detected", "type": "BufferOverflow", "severity": "Critical", "category": "Security", "language": "C/C++", "framework": "General"},
            {"text": "undefined reference to", "type": "LinkError", "severity": "High", "category": "Compilation", "language": "C/C++", "framework": "General"},
            
            # Web Framework Errors
            {"text": "404 Not Found", "type": "HTTPError", "severity": "Medium", "category": "HTTP", "language": "General", "framework": "Web"},
            {"text": "500 Internal Server Error", "type": "HTTPError", "severity": "High", "category": "HTTP", "language": "General", "framework": "Web"},
            {"text": "403 Forbidden", "type": "HTTPError", "severity": "Medium", "category": "Security", "language": "General", "framework": "Web"},
            {"text": "502 Bad Gateway", "type": "HTTPError", "severity": "High", "category": "Network", "language": "General", "framework": "Web"},
            {"text": "503 Service Unavailable", "type": "HTTPError", "severity": "High", "category": "Service", "language": "General", "framework": "Web"},
            {"text": "CORS policy: No 'Access-Control-Allow-Origin' header", "type": "CORSError", "severity": "Medium", "category": "Security", "language": "JavaScript", "framework": "Web"},
            
            # Docker/Container Errors
            {"text": "docker: Error response from daemon: pull access denied", "type": "DockerError", "severity": "Medium", "category": "Container", "language": "General", "framework": "Docker"},
            {"text": "docker: Error response from daemon: container already exists", "type": "DockerError", "severity": "Low", "category": "Container", "language": "General", "framework": "Docker"},
            {"text": "docker: Error response from daemon: no space left on device", "type": "DiskSpaceError", "severity": "Critical", "category": "System", "language": "General", "framework": "Docker"},
            {"text": "OCI runtime create failed", "type": "ContainerError", "severity": "High", "category": "Container", "language": "General", "framework": "Container"},
            
            # Kubernetes Errors
            {"text": "ImagePullBackOff", "type": "KubernetesError", "severity": "High", "category": "Container", "language": "General", "framework": "Kubernetes"},
            {"text": "CrashLoopBackOff", "type": "KubernetesError", "severity": "High", "category": "Container", "language": "General", "framework": "Kubernetes"},
            {"text": "Insufficient cpu", "type": "ResourceError", "severity": "High", "category": "System", "language": "General", "framework": "Kubernetes"},
            {"text": "Insufficient memory", "type": "ResourceError", "severity": "High", "category": "System", "language": "General", "framework": "Kubernetes"},
            
            # Security Errors
            {"text": "SQL injection attempt detected", "type": "SecurityViolation", "severity": "Critical", "category": "Security", "language": "SQL", "framework": "General"},
            {"text": "Cross-site scripting (XSS) detected", "type": "SecurityViolation", "severity": "Critical", "category": "Security", "language": "JavaScript", "framework": "Web"},
            {"text": "CSRF token mismatch", "type": "SecurityViolation", "severity": "High", "category": "Security", "language": "General", "framework": "Web"},
            {"text": "Invalid JWT token", "type": "AuthenticationError", "severity": "High", "category": "Security", "language": "General", "framework": "JWT"},
            {"text": "SSL certificate verification failed", "type": "SSLError", "severity": "High", "category": "Security", "language": "General", "framework": "TLS"},
            
            # Performance Issues
            {"text": "Query execution time exceeded", "type": "PerformanceIssue", "severity": "Medium", "category": "Performance", "language": "SQL", "framework": "Database"},
            {"text": "Memory usage exceeds threshold", "type": "PerformanceIssue", "severity": "Medium", "category": "Performance", "language": "General", "framework": "System"},
            {"text": "High CPU utilization detected", "type": "PerformanceIssue", "severity": "Medium", "category": "Performance", "language": "General", "framework": "System"},
            {"text": "Thread pool exhausted", "type": "ResourceError", "severity": "High", "category": "Performance", "language": "General", "framework": "Threading"},
            
            # API Errors
            {"text": "Rate limit exceeded", "type": "APIError", "severity": "Medium", "category": "API", "language": "General", "framework": "REST"},
            {"text": "API key invalid or expired", "type": "AuthenticationError", "severity": "High", "category": "Security", "language": "General", "framework": "API"},
            {"text": "Malformed JSON request", "type": "ValidationError", "severity": "Low", "category": "API", "language": "JSON", "framework": "REST"},
            {"text": "Required parameter missing", "type": "ValidationError", "severity": "Low", "category": "API", "language": "General", "framework": "REST"},
            
            # System Errors
            {"text": "Disk space insufficient", "type": "DiskSpaceError", "severity": "Critical", "category": "System", "language": "General", "framework": "OS"},
            {"text": "Process killed by OOM killer", "type": "MemoryError", "severity": "Critical", "category": "System", "language": "General", "framework": "Linux"},
            {"text": "Failed to acquire lock", "type": "LockError", "severity": "Medium", "category": "Concurrency", "language": "General", "framework": "Threading"},
            {"text": "Resource temporarily unavailable", "type": "ResourceError", "severity": "Medium", "category": "System", "language": "General", "framework": "OS"},
        ]
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for pattern in initial_patterns:
            error_hash = hashlib.md5(pattern["text"].encode()).hexdigest()
            
            # Check if pattern already exists
            cursor.execute("SELECT id FROM error_patterns WHERE hash = ?", (error_hash,))
            if cursor.fetchone() is None:
                cursor.execute("""
                    INSERT INTO error_patterns 
                    (error_text, error_type, severity, category, language, framework, hash, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    pattern["text"], pattern["type"], pattern["severity"], 
                    pattern["category"], pattern["language"], pattern["framework"],
                    error_hash, json.dumps(pattern)
                ))
        
        conn.commit()
        conn.close()
        logger.info(f"✅ Loaded {len(initial_patterns)} initial error patterns")
    
    def add_new_error(self, error_text: str, metadata: Dict[str, Any] = None) -> bool:
        """Add new error to corpus and learn from it"""
        error_hash = hashlib.md5(error_text.encode()).hexdigest()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Check if error already exists
        cursor.execute("SELECT id, frequency FROM error_patterns WHERE hash = ?", (error_hash,))
        existing = cursor.fetchone()
        
        if existing:
            # Increment frequency and update last_seen
            cursor.execute("""
                UPDATE error_patterns 
                SET frequency = frequency + 1, last_seen = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (existing[0],))
            conn.commit()
            conn.close()
            return False
        else:
            # Classify new error automatically
            classification = self._classify_new_error(error_text)
            
            cursor.execute("""
                INSERT INTO error_patterns 
                (error_text, error_type, severity, category, language, framework, hash, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                error_text, 
                classification.get("type", "UnknownError"),
                classification.get("severity", "Medium"),
                classification.get("category", "General"),
                classification.get("language", "Unknown"),
                classification.get("framework", "Unknown"),
                error_hash,
                json.dumps(metadata or {})
            ))
            
            conn.commit()
            conn.close()
            logger.info(f"🆕 Added new error pattern: {error_text[:50]}...")
            return True
    
    def _classify_new_error(self, error_text: str) -> Dict[str, str]:
        """Automatically classify new error using pattern matching and ML"""
        classification = {
            "type": "UnknownError",
            "severity": "Medium", 
            "category": "General",
            "language": "Unknown",
            "framework": "Unknown"
        }
        
        error_lower = error_text.lower()
        
        # Language detection
        if any(keyword in error_lower for keyword in ["java.lang", "exception", "java.io", "java.net"]):
            classification["language"] = "Java"
        elif any(keyword in error_lower for keyword in ["error:", "traceback", "attributeerror", "keyerror"]):
            classification["language"] = "Python"
        elif any(keyword in error_lower for keyword in ["referenceerror", "typeerror", "syntaxerror", "rangeerror"]):
            classification["language"] = "JavaScript"
        elif any(keyword in error_lower for keyword in ["segmentation fault", "core dumped", "malloc"]):
            classification["language"] = "C/C++"
        elif any(keyword in error_lower for keyword in ["ora-", "error 1", "mysql", "postgresql"]):
            classification["language"] = "SQL"
        
        # Framework detection
        if any(keyword in error_lower for keyword in ["docker", "container", "image"]):
            classification["framework"] = "Docker"
        elif any(keyword in error_lower for keyword in ["kubernetes", "k8s", "pod", "imagepullbackoff"]):
            classification["framework"] = "Kubernetes"
        elif any(keyword in error_lower for keyword in ["cors", "http", "404", "500", "502", "503"]):
            classification["framework"] = "Web"
        elif any(keyword in error_lower for keyword in ["node", "npm", "enoent", "eacces"]):
            classification["framework"] = "Node.js"
        
        # Severity detection
        if any(keyword in error_lower for keyword in ["critical", "fatal", "segmentation fault", "out of memory", "security"]):
            classification["severity"] = "Critical"
        elif any(keyword in error_lower for keyword in ["error", "exception", "failed", "denied", "timeout"]):
            classification["severity"] = "High"
        elif any(keyword in error_lower for keyword in ["warning", "deprecated", "minor"]):
            classification["severity"] = "Low"
        
        # Category detection
        if any(keyword in error_lower for keyword in ["database", "sql", "connection", "mysql", "postgresql", "oracle"]):
            classification["category"] = "Database"
        elif any(keyword in error_lower for keyword in ["network", "socket", "connection", "timeout", "refused"]):
            classification["category"] = "Network"
        elif any(keyword in error_lower for keyword in ["memory", "malloc", "allocation", "oom"]):
            classification["category"] = "Memory"
        elif any(keyword in error_lower for keyword in ["file", "directory", "permission", "access"]):
            classification["category"] = "FileSystem"
        elif any(keyword in error_lower for keyword in ["auth", "login", "permission", "access", "token", "ssl"]):
            classification["category"] = "Security"
        elif any(keyword in error_lower for keyword in ["syntax", "parse", "compile"]):
            classification["category"] = "Syntax"
        elif any(keyword in error_lower for keyword in ["performance", "slow", "cpu", "thread"]):
            classification["category"] = "Performance"
        
        return classification
    
    def get_all_patterns(self) -> List[Dict[str, Any]]:
        """Get all error patterns from corpus"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT error_text, error_type, severity, category, language, 
                   framework, frequency, first_seen, last_seen 
            FROM error_patterns 
            ORDER BY frequency DESC
        """)
        
        patterns = []
        for row in cursor.fetchall():
            patterns.append({
                "text": row[0],
                "type": row[1],
                "severity": row[2],
                "category": row[3],
                "language": row[4],
                "framework": row[5],
                "frequency": row[6],
                "first_seen": row[7],
                "last_seen": row[8]
            })
        
        conn.close()
        return patterns
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get corpus statistics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Total patterns
        cursor.execute("SELECT COUNT(*) FROM error_patterns")
        total_patterns = cursor.fetchone()[0]
        
        # By category
        cursor.execute("""
            SELECT category, COUNT(*) 
            FROM error_patterns 
            GROUP BY category 
            ORDER BY COUNT(*) DESC
        """)
        by_category = dict(cursor.fetchall())
        
        # By severity
        cursor.execute("""
            SELECT severity, COUNT(*) 
            FROM error_patterns 
            GROUP BY severity 
            ORDER BY COUNT(*) DESC
        """)
        by_severity = dict(cursor.fetchall())
        
        # By language
        cursor.execute("""
            SELECT language, COUNT(*) 
            FROM error_patterns 
            GROUP BY language 
            ORDER BY COUNT(*) DESC
        """)
        by_language = dict(cursor.fetchall())
        
        conn.close()
        
        return {
            "total_patterns": total_patterns,
            "by_category": by_category,
            "by_severity": by_severity,
            "by_language": by_language,
            "last_updated": datetime.datetime.now().isoformat()
        }

class AdvancedErrorAnalyzer:
    """Advanced error analysis with multiple ML models"""
    
    def __init__(self):
        self.corpus_manager = ErrorCorpusManager()
        self.vectorizer = TfidfVectorizer(max_features=5000, stop_words='english', ngram_range=(1, 3))
        self.anomaly_detector = IsolationForest(contamination=0.1, random_state=42)
        self.classifier = RandomForestClassifier(n_estimators=100, random_state=42)
        self.severity_classifier = MultinomialNB()
        self.category_classifier = SVC(probability=True, random_state=42)
        self.is_trained = False
        self.train_models()
    
    def train_models(self):
        """Train all ML models with current corpus"""
        try:
            patterns = self.corpus_manager.get_all_patterns()
            if len(patterns) < 10:
                logger.warning("Not enough patterns for training, using basic models")
                return
            
            texts = [p["text"] for p in patterns]
            types = [p["type"] for p in patterns]
            severities = [p["severity"] for p in patterns]
            categories = [p["category"] for p in patterns]
            
            # Train vectorizer and anomaly detector
            vectors = self.vectorizer.fit_transform(texts)
            self.anomaly_detector.fit(vectors.toarray())
            
            # Train classifiers if we have enough diverse data
            if len(set(types)) > 1:
                self.classifier.fit(vectors.toarray(), types)
            if len(set(severities)) > 1:
                self.severity_classifier.fit(vectors.toarray(), severities)
            if len(set(categories)) > 1:
                self.category_classifier.fit(vectors.toarray(), categories)
            
            self.is_trained = True
            logger.info(f"✅ Trained models on {len(patterns)} error patterns")
            
            # Save models
            self._save_models()
            
        except Exception as e:
            logger.error(f"❌ Model training failed: {e}")
    
    def _save_models(self):
        """Save trained models to disk"""
        try:
            models = {
                'vectorizer': self.vectorizer,
                'anomaly_detector': self.anomaly_detector,
                'classifier': self.classifier,
                'severity_classifier': self.severity_classifier,
                'category_classifier': self.category_classifier
            }
            
            with open(MODELS_DIR / "stacklens_models.pkl", "wb") as f:
                pickle.dump(models, f)
                
        except Exception as e:
            logger.error(f"Failed to save models: {e}")
    
    def _load_models(self):
        """Load saved models from disk"""
        try:
            model_path = MODELS_DIR / "stacklens_models.pkl"
            if model_path.exists():
                with open(model_path, "rb") as f:
                    models = pickle.load(f)
                
                self.vectorizer = models['vectorizer']
                self.anomaly_detector = models['anomaly_detector']
                self.classifier = models['classifier']
                self.severity_classifier = models['severity_classifier']
                self.category_classifier = models['category_classifier']
                self.is_trained = True
                logger.info("✅ Loaded saved models")
                return True
        except Exception as e:
            logger.error(f"Failed to load models: {e}")
        
        return False
    
    def analyze_error(self, error_text: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Comprehensive error analysis"""
        # Add to corpus (learning)
        is_new = self.corpus_manager.add_new_error(error_text, context)
        
        # If new error added, retrain periodically
        if is_new and not hasattr(self, '_last_retrain'):
            self._last_retrain = time.time()
        elif is_new and time.time() - self._last_retrain > 3600:  # Retrain every hour
            self.train_models()
            self._last_retrain = time.time()
        
        if not self.is_trained:
            return self._basic_analysis(error_text)
        
        try:
            # Vectorize error
            vector = self.vectorizer.transform([error_text])
            vector_array = vector.toarray()
            
            # Anomaly detection
            is_anomaly = self.anomaly_detector.predict(vector_array)[0] == -1
            anomaly_score = self.anomaly_detector.score_samples(vector_array)[0]
            
            # Classifications
            error_type = self.classifier.predict(vector_array)[0] if hasattr(self.classifier, 'classes_') else "Unknown"
            type_confidence = max(self.classifier.predict_proba(vector_array)[0]) if hasattr(self.classifier, 'classes_') else 0.5
            
            severity = self.severity_classifier.predict(vector_array)[0] if hasattr(self.severity_classifier, 'classes_') else "Medium"
            severity_confidence = max(self.severity_classifier.predict_proba(vector_array)[0]) if hasattr(self.severity_classifier, 'classes_') else 0.5
            
            category = self.category_classifier.predict(vector_array)[0] if hasattr(self.category_classifier, 'classes_') else "General"
            category_confidence = max(self.category_classifier.predict_proba(vector_array)[0]) if hasattr(self.category_classifier, 'classes_') else 0.5
            
            # Find similar errors
            similar_errors = self._find_similar_errors(error_text, k=3)
            
            # Extract technical details
            technical_details = self._extract_technical_details(error_text)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(error_type, category, technical_details)
            
            return {
                "error_text": error_text,
                "analysis": {
                    "is_new_pattern": is_new,
                    "is_anomaly": bool(is_anomaly),
                    "anomaly_score": float(anomaly_score),
                    "error_type": error_type,
                    "type_confidence": float(type_confidence),
                    "severity": severity,
                    "severity_confidence": float(severity_confidence),
                    "category": category,
                    "category_confidence": float(category_confidence),
                    "technical_details": technical_details,
                    "similar_errors": similar_errors,
                    "recommendations": recommendations
                },
                "timestamp": datetime.datetime.now().isoformat(),
                "model_version": "stacklens_v1.0"
            }
            
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            return self._basic_analysis(error_text)
    
    def _basic_analysis(self, error_text: str) -> Dict[str, Any]:
        """Basic analysis when models aren't trained"""
        classification = self.corpus_manager._classify_new_error(error_text)
        
        return {
            "error_text": error_text,
            "analysis": {
                "is_new_pattern": True,
                "is_anomaly": False,
                "anomaly_score": 0.0,
                "error_type": classification["type"],
                "type_confidence": 0.7,
                "severity": classification["severity"],
                "severity_confidence": 0.7,
                "category": classification["category"],
                "category_confidence": 0.7,
                "technical_details": self._extract_technical_details(error_text),
                "similar_errors": [],
                "recommendations": ["Add more error patterns to improve analysis accuracy"]
            },
            "timestamp": datetime.datetime.now().isoformat(),
            "model_version": "stacklens_basic"
        }
    
    def _find_similar_errors(self, error_text: str, k: int = 3) -> List[Dict[str, Any]]:
        """Find similar errors using cosine similarity"""
        try:
            patterns = self.corpus_manager.get_all_patterns()
            if not patterns:
                return []
            
            corpus_texts = [p["text"] for p in patterns]
            all_texts = [error_text] + corpus_texts
            
            vectors = self.vectorizer.transform(all_texts)
            query_vector = vectors[0:1]
            corpus_vectors = vectors[1:]
            
            similarities = (corpus_vectors * query_vector.T).toarray().flatten()
            top_indices = np.argsort(similarities)[::-1][:k]
            
            similar = []
            for idx in top_indices:
                if similarities[idx] > 0.1:  # Minimum similarity threshold
                    pattern = patterns[idx]
                    similar.append({
                        "text": pattern["text"],
                        "type": pattern["type"],
                        "similarity": float(similarities[idx]),
                        "frequency": pattern["frequency"]
                    })
            
            return similar
            
        except Exception as e:
            logger.error(f"Similar error search failed: {e}")
            return []
    
    def _extract_technical_details(self, error_text: str) -> Dict[str, Any]:
        """Extract technical details from error text"""
        details = {
            "error_codes": [],
            "file_paths": [],
            "line_numbers": [],
            "function_names": [],
            "stack_trace": False,
            "ip_addresses": [],
            "ports": [],
            "urls": []
        }
        
        # Extract error codes (like ORA-00001, HTTP 404, etc.)
        error_codes = re.findall(r'(?:ORA-\d+|ERROR \d+|HTTP \d+|\d{3} [A-Za-z ]+)', error_text)
        details["error_codes"] = list(set(error_codes))
        
        # Extract file paths
        file_paths = re.findall(r'(?:/[A-Za-z0-9._/-]+\.[A-Za-z]+|[A-Za-z]:\\[A-Za-z0-9._\\-]+\.[A-Za-z]+)', error_text)
        details["file_paths"] = list(set(file_paths))
        
        # Extract line numbers
        line_numbers = re.findall(r'line (\d+)|:(\d+):', error_text)
        details["line_numbers"] = [int(num) for group in line_numbers for num in group if num]
        
        # Extract function names (common patterns)
        function_names = re.findall(r'(?:function|method|procedure) ([A-Za-z_][A-Za-z0-9_]*)|([A-Za-z_][A-Za-z0-9_]*)\(\)', error_text)
        details["function_names"] = [name for group in function_names for name in group if name]
        
        # Check for stack trace
        details["stack_trace"] = any(keyword in error_text.lower() for keyword in ["traceback", "stack trace", "call stack", "at "])
        
        # Extract IP addresses
        ip_addresses = re.findall(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', error_text)
        details["ip_addresses"] = list(set(ip_addresses))
        
        # Extract ports
        ports = re.findall(r':(\d{1,5})\b', error_text)
        details["ports"] = [int(port) for port in set(ports) if 1 <= int(port) <= 65535]
        
        # Extract URLs
        urls = re.findall(r'https?://[A-Za-z0-9.-]+(?:/[A-Za-z0-9._/?=&-]*)?', error_text)
        details["urls"] = list(set(urls))
        
        return details
    
    def _generate_recommendations(self, error_type: str, category: str, technical_details: Dict) -> List[str]:
        """Generate contextual recommendations"""
        recommendations = []
        
        # Type-based recommendations
        if "NullPointer" in error_type or "AttributeError" in error_type:
            recommendations.append("Add null/None checks before accessing object properties")
            recommendations.append("Initialize variables properly before use")
        elif "Index" in error_type or "Range" in error_type:
            recommendations.append("Validate array/list bounds before access")
            recommendations.append("Check collection size before iteration")
        elif "Connection" in error_type:
            recommendations.append("Implement connection retry logic with exponential backoff")
            recommendations.append("Check network connectivity and firewall settings")
        elif "Memory" in error_type or "OutOfMemory" in error_type:
            recommendations.append("Review memory usage patterns and optimize allocation")
            recommendations.append("Increase heap size or optimize garbage collection")
        elif "Authentication" in error_type or "Permission" in error_type:
            recommendations.append("Verify credentials and access permissions")
            recommendations.append("Check authentication token expiration")
        
        # Category-based recommendations
        if category == "Database":
            recommendations.append("Check database connection pool configuration")
            recommendations.append("Review query performance and add appropriate indexes")
        elif category == "Network":
            recommendations.append("Implement circuit breaker pattern for external services")
            recommendations.append("Add request timeout and retry mechanisms")
        elif category == "Security":
            recommendations.append("Review security policies and access controls")
            recommendations.append("Enable security monitoring and alerting")
        elif category == "Performance":
            recommendations.append("Profile application performance and identify bottlenecks")
            recommendations.append("Consider caching strategies for frequently accessed data")
        
        # Technical details-based recommendations
        if technical_details["stack_trace"]:
            recommendations.append("Analyze the full stack trace to identify the root cause")
        if technical_details["line_numbers"]:
            recommendations.append(f"Focus debugging on line {technical_details['line_numbers'][0]}")
        if technical_details["file_paths"]:
            recommendations.append("Check file permissions and path validity")
        
        return list(set(recommendations))  # Remove duplicates

# Initialize global analyzer
error_analyzer = AdvancedErrorAnalyzer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown"""
    # Startup
    logger.info("🚀 Starting StackLens AI Error Analysis Platform...")
    
    # Try to load existing models
    if not error_analyzer._load_models():
        error_analyzer.train_models()
    
    logger.info("✅ StackLens AI Platform ready for error analysis")
    
    yield
    
    # Shutdown
    logger.info("🔄 Shutting down StackLens AI Platform...")

app = FastAPI(
    title="StackLens AI Error Analysis Platform", 
    version="1.0.0",
    description="Production-ready AI platform for comprehensive error detection, classification, and pattern analysis",
    lifespan=lifespan
)

@app.get("/health")
def health_check():
    """Health check endpoint"""
    stats = error_analyzer.corpus_manager.get_statistics()
    return {
        "status": "healthy",
        "service": "stacklens_error_analyzer",
        "timestamp": time.time(),
        "models_trained": error_analyzer.is_trained,
        "corpus_size": stats["total_patterns"],
        "version": "1.0.0"
    }

@app.get("/")
def root():
    """Root endpoint with service info"""
    return {
        "message": "StackLens AI Error Analysis Platform",
        "version": "1.0.0",
        "description": "Advanced AI-powered error detection and analysis",
        "capabilities": [
            "Comprehensive Error Classification",
            "Pattern Recognition & Learning",
            "Anomaly Detection",
            "Severity Assessment", 
            "Technical Detail Extraction",
            "Contextual Recommendations",
            "Multi-language Support",
            "Automatic Corpus Building"
        ],
        "supported_languages": ["Python", "Java", "JavaScript", "C/C++", "SQL", "General"],
        "supported_frameworks": ["Web", "Docker", "Kubernetes", "Node.js", "Database", "API"],
        "endpoints": [
            "/health", "/analyze-error", "/add-error-pattern", 
            "/get-corpus-stats", "/search-patterns", "/get-recommendations",
            "/detect-anomalies", "/classify-errors", "/train-models"
        ]
    }

@app.post("/analyze-error")
def analyze_error_endpoint(data: Dict[str, Any]):
    """Comprehensive error analysis endpoint"""
    try:
        error_text = data.get("error_text", "")
        context = data.get("context", {})
        
        if not error_text:
            raise HTTPException(status_code=400, detail="error_text is required")
        
        analysis = error_analyzer.analyze_error(error_text, context)
        return analysis
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/add-error-pattern")
def add_error_pattern(data: Dict[str, Any]):
    """Add new error pattern to corpus"""
    try:
        error_text = data.get("error_text", "")
        metadata = data.get("metadata", {})
        
        if not error_text:
            raise HTTPException(status_code=400, detail="error_text is required")
        
        is_new = error_analyzer.corpus_manager.add_new_error(error_text, metadata)
        
        return {
            "status": "success",
            "is_new_pattern": is_new,
            "message": "Error pattern added to corpus" if is_new else "Error pattern frequency updated"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add pattern: {str(e)}")

@app.get("/get-corpus-stats")
def get_corpus_statistics():
    """Get comprehensive corpus statistics"""
    try:
        return error_analyzer.corpus_manager.get_statistics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")

@app.post("/search-patterns")
def search_error_patterns(data: Dict[str, Any]):
    """Search for error patterns in corpus"""
    try:
        query = data.get("query", "")
        category = data.get("category")
        severity = data.get("severity")
        language = data.get("language")
        limit = data.get("limit", 10)
        
        patterns = error_analyzer.corpus_manager.get_all_patterns()
        
        # Filter patterns
        filtered = []
        for pattern in patterns:
            # Text search
            if query and query.lower() not in pattern["text"].lower():
                continue
            # Category filter
            if category and pattern["category"] != category:
                continue
            # Severity filter
            if severity and pattern["severity"] != severity:
                continue
            # Language filter
            if language and pattern["language"] != language:
                continue
            
            filtered.append(pattern)
        
        # Sort by frequency and limit
        filtered.sort(key=lambda x: x["frequency"], reverse=True)
        return {
            "patterns": filtered[:limit],
            "total_found": len(filtered),
            "total_corpus": len(patterns)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.post("/detect-anomalies")
def detect_anomalies(data: Dict[str, List[str]]):
    """Detect anomalous error patterns"""
    try:
        error_texts = data.get("error_texts", [])
        if not error_texts:
            raise HTTPException(status_code=400, detail="error_texts list is required")
        
        if not error_analyzer.is_trained:
            raise HTTPException(status_code=503, detail="Models not trained yet")
        
        # Transform texts
        vectors = error_analyzer.vectorizer.transform(error_texts)
        
        # Predict anomalies
        predictions = error_analyzer.anomaly_detector.predict(vectors.toarray())
        scores = error_analyzer.anomaly_detector.score_samples(vectors.toarray())
        
        results = []
        for i, text in enumerate(error_texts):
            results.append({
                "error_text": text,
                "is_anomaly": bool(predictions[i] == -1),
                "anomaly_score": float(scores[i]),
                "index": i
            })
        
        anomaly_count = sum(1 for r in results if r["is_anomaly"])
        
        return {
            "results": results,
            "anomaly_count": anomaly_count,
            "total_analyzed": len(error_texts),
            "anomaly_rate": anomaly_count / len(error_texts) if error_texts else 0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {str(e)}")

@app.post("/classify-errors")
def classify_errors(data: Dict[str, List[str]]):
    """Classify multiple errors"""
    try:
        error_texts = data.get("error_texts", [])
        if not error_texts:
            raise HTTPException(status_code=400, detail="error_texts list is required")
        
        results = []
        for text in error_texts:
            analysis = error_analyzer.analyze_error(text)
            results.append({
                "error_text": text,
                "type": analysis["analysis"]["error_type"],
                "severity": analysis["analysis"]["severity"],
                "category": analysis["analysis"]["category"],
                "confidence": analysis["analysis"]["type_confidence"]
            })
        
        return {
            "classifications": results,
            "total_classified": len(results)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")

@app.post("/get-recommendations")
def get_error_recommendations(data: Dict[str, str]):
    """Get recommendations for specific error"""
    try:
        error_text = data.get("error_text", "")
        if not error_text:
            raise HTTPException(status_code=400, detail="error_text is required")
        
        analysis = error_analyzer.analyze_error(error_text)
        
        return {
            "error_text": error_text,
            "recommendations": analysis["analysis"]["recommendations"],
            "technical_details": analysis["analysis"]["technical_details"],
            "similar_errors": analysis["analysis"]["similar_errors"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation generation failed: {str(e)}")

@app.post("/train-models")
def retrain_models():
    """Manually trigger model retraining"""
    try:
        error_analyzer.train_models()
        stats = error_analyzer.corpus_manager.get_statistics()
        
        return {
            "status": "training_complete",
            "models_trained": error_analyzer.is_trained,
            "corpus_size": stats["total_patterns"],
            "training_timestamp": datetime.datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

if __name__ == "__main__":
    logger.info("🎯 Starting StackLens AI Error Analysis Platform on port 8888")
    uvicorn.run(app, host="0.0.0.0", port=8888, log_level="info")
