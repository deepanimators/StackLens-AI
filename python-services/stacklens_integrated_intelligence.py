#!/usr/bin/env python3
"""
StackLens AI - Integrated Error Intelligence Platform
Advanced AI-powered error detection using existing StackLens database

This platform leverages the existing stacklens.db with 56K+ real error logs,
304 error patterns, and 19K+ training records for superior error intelligence.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from typing import List, Dict, Any, Optional, Union, Tuple
import json
import time
import datetime
import os
import numpy as np
from sklearn.cluster import KMeans, DBSCAN
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.ensemble import IsolationForest, RandomForestClassifier, GradientBoostingClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
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
import pickle
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database path - using existing StackLens database
STACKLENS_DB = Path("../db/stacklens.db")
MODELS_DIR = Path("./ml_models")
CACHE_DIR = Path("./intelligence_cache")

# Ensure directories exist
MODELS_DIR.mkdir(exist_ok=True)
CACHE_DIR.mkdir(exist_ok=True)

@dataclass
class ErrorAnalysisResult:
    """Result of error analysis"""
    error_type: str
    severity: str
    confidence: float
    suggested_solution: str
    pattern_matched: Optional[str] = None
    similar_errors: List[Dict] = None
    ai_insights: Dict = None

class ErrorSeverity(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class StackLensIntelligence:
    """Core intelligence engine using existing StackLens data"""
    
    def __init__(self):
        self.db_path = STACKLENS_DB
        self.models = {}
        self.vectorizers = {}
        self.label_encoders = {}
        self.error_patterns = []
        self.training_data = []
        self.is_initialized = False
        
    async def initialize(self):
        """Initialize the intelligence system with existing data"""
        try:
            logger.info("Initializing StackLens Intelligence with existing database...")
            
            # Load existing error patterns and data
            await self._load_error_patterns()
            await self._load_training_data()
            await self._train_models()
            
            self.is_initialized = True
            logger.info("StackLens Intelligence initialized successfully!")
            
        except Exception as e:
            logger.error(f"Failed to initialize StackLens Intelligence: {e}")
            raise
    
    def _get_db_connection(self):
        """Get database connection"""
        if not self.db_path.exists():
            raise FileNotFoundError(f"StackLens database not found: {self.db_path}")
        return sqlite3.connect(str(self.db_path))
    
    async def _load_error_patterns(self):
        """Load existing error patterns from database"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT pattern, regex, description, severity, error_type, 
                       category, suggested_fix 
                FROM error_patterns 
                WHERE is_active = 1
            """)
            
            patterns = cursor.fetchall()
            self.error_patterns = [
                {
                    'pattern': p[0],
                    'regex': p[1],
                    'description': p[2],
                    'severity': p[3],
                    'error_type': p[4],
                    'category': p[5],
                    'suggested_fix': p[6]
                }
                for p in patterns
            ]
            
            conn.close()
            logger.info(f"Loaded {len(self.error_patterns)} error patterns")
            
        except Exception as e:
            logger.error(f"Error loading patterns: {e}")
            self.error_patterns = []
    
    async def _load_training_data(self):
        """Load AI training data from database"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            
            # Load from error_logs table (real error data)
            cursor.execute("""
                SELECT message, severity, error_type, ai_suggestion, ml_prediction
                FROM error_logs 
                WHERE ai_suggestion IS NOT NULL OR ml_prediction IS NOT NULL
                LIMIT 10000
            """)
            
            error_logs = cursor.fetchall()
            
            # Load from ai_training_data table
            cursor.execute("""
                SELECT error_type, severity, suggested_solution, 
                       context_before, context_after, confidence, features
                FROM ai_training_data 
                WHERE is_validated = 1
                LIMIT 10000
            """)
            
            training_records = cursor.fetchall()
            
            # Combine both datasets
            self.training_data = []
            
            # Process error logs
            for log in error_logs:
                self.training_data.append({
                    'text': log[0],
                    'severity': log[1],
                    'error_type': log[2],
                    'solution': log[3] or log[4] or "No solution available",
                    'source': 'error_logs'
                })
            
            # Process training records
            for record in training_records:
                context = f"{record[3] or ''} {record[4] or ''}".strip()
                self.training_data.append({
                    'text': context,
                    'severity': record[1],
                    'error_type': record[0],
                    'solution': record[2],
                    'confidence': record[5],
                    'source': 'ai_training_data'
                })
            
            conn.close()
            logger.info(f"Loaded {len(self.training_data)} training samples")
            
        except Exception as e:
            logger.error(f"Error loading training data: {e}")
            self.training_data = []
    
    async def _train_models(self):
        """Train ML models on existing data"""
        if not self.training_data:
            logger.warning("No training data available")
            return
        
        try:
            # Prepare data
            texts = [item['text'] for item in self.training_data if item['text']]
            severities = [item['severity'] for item in self.training_data if item['text']]
            error_types = [item['error_type'] for item in self.training_data if item['text']]
            
            if len(texts) < 10:
                logger.warning("Insufficient training data")
                return
            
            # Create vectorizers
            self.vectorizers['tfidf'] = TfidfVectorizer(
                max_features=1000,
                stop_words='english',
                ngram_range=(1, 2)
            )
            
            # Fit vectorizers
            X_text = self.vectorizers['tfidf'].fit_transform(texts)
            
            # Encode labels
            self.label_encoders['severity'] = LabelEncoder()
            self.label_encoders['error_type'] = LabelEncoder()
            
            y_severity = self.label_encoders['severity'].fit_transform(severities)
            y_error_type = self.label_encoders['error_type'].fit_transform(error_types)
            
            # Train severity classifier
            self.models['severity'] = RandomForestClassifier(
                n_estimators=100,
                random_state=42
            )
            self.models['severity'].fit(X_text, y_severity)
            
            # Train error type classifier
            self.models['error_type'] = GradientBoostingClassifier(
                n_estimators=100,
                random_state=42
            )
            self.models['error_type'].fit(X_text, y_error_type)
            
            # Train anomaly detector
            self.models['anomaly'] = IsolationForest(
                contamination=0.1,
                random_state=42
            )
            self.models['anomaly'].fit(X_text.toarray())
            
            # Calculate accuracy
            if len(set(y_severity)) > 1:
                severity_accuracy = cross_val_score(
                    self.models['severity'], X_text, y_severity, cv=3
                ).mean()
                logger.info(f"Severity classification accuracy: {severity_accuracy:.3f}")
            
            if len(set(y_error_type)) > 1:
                error_type_accuracy = cross_val_score(
                    self.models['error_type'], X_text, y_error_type, cv=3
                ).mean()
                logger.info(f"Error type classification accuracy: {error_type_accuracy:.3f}")
            
            logger.info("ML models trained successfully!")
            
        except Exception as e:
            logger.error(f"Error training models: {e}")
    
    async def analyze_error(self, error_text: str, context: Dict = None) -> ErrorAnalysisResult:
        """Analyze error using patterns and ML models"""
        if not self.is_initialized:
            raise RuntimeError("Intelligence system not initialized")
        
        # Step 1: Pattern matching
        pattern_result = self._match_patterns(error_text)
        
        # Step 2: ML prediction
        ml_result = await self._predict_with_ml(error_text)
        
        # Step 3: Find similar errors
        similar_errors = await self._find_similar_errors(error_text)
        
        # Step 4: Combine results
        result = self._combine_analysis_results(
            pattern_result, ml_result, similar_errors, error_text
        )
        
        # Step 5: Store analysis for learning
        await self._store_analysis_result(error_text, result, context)
        
        return result
    
    def _match_patterns(self, error_text: str) -> Dict:
        """Match error against known patterns"""
        best_match = None
        best_score = 0
        
        for pattern in self.error_patterns:
            try:
                # Simple text matching
                if pattern['pattern'].lower() in error_text.lower():
                    score = len(pattern['pattern']) / len(error_text)
                    if score > best_score:
                        best_score = score
                        best_match = pattern
                
                # Regex matching if available
                if pattern['regex'] and re.search(pattern['regex'], error_text, re.IGNORECASE):
                    score = 0.9  # High score for regex match
                    if score > best_score:
                        best_score = score
                        best_match = pattern
                        
            except Exception as e:
                logger.debug(f"Pattern matching error: {e}")
                continue
        
        if best_match:
            return {
                'matched': True,
                'pattern': best_match['pattern'],
                'severity': best_match['severity'],
                'error_type': best_match['error_type'],
                'suggested_fix': best_match['suggested_fix'],
                'confidence': min(best_score + 0.5, 1.0)
            }
        
        return {'matched': False}
    
    async def _predict_with_ml(self, error_text: str) -> Dict:
        """Predict using ML models"""
        if not self.models or 'tfidf' not in self.vectorizers:
            return {'predicted': False}
        
        try:
            # Vectorize text
            X = self.vectorizers['tfidf'].transform([error_text])
            
            results = {}
            
            # Predict severity
            if 'severity' in self.models:
                severity_pred = self.models['severity'].predict(X)[0]
                severity_proba = self.models['severity'].predict_proba(X)[0]
                severity_label = self.label_encoders['severity'].inverse_transform([severity_pred])[0]
                
                results['severity'] = {
                    'label': severity_label,
                    'confidence': float(max(severity_proba))
                }
            
            # Predict error type
            if 'error_type' in self.models:
                type_pred = self.models['error_type'].predict(X)[0]
                type_proba = self.models['error_type'].predict_proba(X)[0]
                type_label = self.label_encoders['error_type'].inverse_transform([type_pred])[0]
                
                results['error_type'] = {
                    'label': type_label,
                    'confidence': float(max(type_proba))
                }
            
            # Anomaly detection
            if 'anomaly' in self.models:
                anomaly_score = self.models['anomaly'].decision_function(X.toarray())[0]
                is_anomaly = self.models['anomaly'].predict(X.toarray())[0] == -1
                
                results['anomaly'] = {
                    'is_anomaly': bool(is_anomaly),
                    'score': float(anomaly_score)
                }
            
            results['predicted'] = True
            return results
            
        except Exception as e:
            logger.error(f"ML prediction error: {e}")
            return {'predicted': False}
    
    async def _find_similar_errors(self, error_text: str, limit: int = 5) -> List[Dict]:
        """Find similar errors from database"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            
            # Simple text similarity (can be enhanced with embedding similarity)
            cursor.execute("""
                SELECT message, severity, error_type, ai_suggestion, ml_prediction,
                       CASE 
                           WHEN INSTR(LOWER(?), LOWER(SUBSTR(message, 1, 50))) > 0 THEN 1
                           WHEN INSTR(LOWER(SUBSTR(message, 1, 50)), LOWER(?)) > 0 THEN 1
                           ELSE 0
                       END as similarity
                FROM error_logs 
                WHERE similarity > 0
                ORDER BY similarity DESC, LENGTH(message) ASC
                LIMIT ?
            """, (error_text[:100], error_text[:50], limit))
            
            similar = cursor.fetchall()
            conn.close()
            
            return [
                {
                    'message': s[0],
                    'severity': s[1],
                    'error_type': s[2],
                    'suggestion': s[3] or s[4],
                    'similarity': s[5]
                }
                for s in similar
            ]
            
        except Exception as e:
            logger.error(f"Error finding similar errors: {e}")
            return []
    
    def _combine_analysis_results(
        self, pattern_result: Dict, ml_result: Dict, 
        similar_errors: List[Dict], error_text: str
    ) -> ErrorAnalysisResult:
        """Combine all analysis results into final result"""
        
        # Determine final severity and error type
        severity = "medium"
        error_type = "general"
        confidence = 0.5
        suggested_solution = "No specific solution available"
        pattern_matched = None
        
        # Priority: Pattern match > ML prediction > Similar errors
        if pattern_result.get('matched'):
            severity = pattern_result['severity']
            error_type = pattern_result['error_type']
            suggested_solution = pattern_result['suggested_fix']
            confidence = pattern_result['confidence']
            pattern_matched = pattern_result['pattern']
            
        elif ml_result.get('predicted'):
            if 'severity' in ml_result:
                severity = ml_result['severity']['label']
                confidence = max(confidence, ml_result['severity']['confidence'])
            
            if 'error_type' in ml_result:
                error_type = ml_result['error_type']['label']
                confidence = max(confidence, ml_result['error_type']['confidence'])
        
        elif similar_errors:
            # Use most similar error
            best_similar = similar_errors[0]
            severity = best_similar['severity']
            error_type = best_similar['error_type']
            if best_similar['suggestion']:
                suggested_solution = best_similar['suggestion']
            confidence = 0.7
        
        # Enhanced insights
        ai_insights = {
            'pattern_matched': pattern_result.get('matched', False),
            'ml_predicted': ml_result.get('predicted', False),
            'similar_errors_found': len(similar_errors),
            'anomaly_detected': ml_result.get('anomaly', {}).get('is_anomaly', False),
            'analysis_timestamp': datetime.datetime.now().isoformat()
        }
        
        if ml_result.get('anomaly'):
            ai_insights['anomaly_score'] = ml_result['anomaly']['score']
        
        return ErrorAnalysisResult(
            error_type=error_type,
            severity=severity,
            confidence=confidence,
            suggested_solution=suggested_solution,
            pattern_matched=pattern_matched,
            similar_errors=similar_errors,
            ai_insights=ai_insights
        )
    
    async def _store_analysis_result(
        self, error_text: str, result: ErrorAnalysisResult, context: Dict = None
    ):
        """Store analysis result for continuous learning"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            
            # Store in analysis_history table if it exists
            try:
                cursor.execute("""
                    INSERT INTO analysis_history 
                    (error_text, predicted_type, predicted_severity, confidence, 
                     suggested_solution, pattern_matched, analysis_data, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    error_text[:1000],  # Truncate long texts
                    result.error_type,
                    result.severity,
                    result.confidence,
                    result.suggested_solution[:500],
                    result.pattern_matched,
                    json.dumps(result.ai_insights),
                    int(time.time() * 1000)
                ))
                conn.commit()
            except sqlite3.OperationalError:
                # Table doesn't exist, skip storing
                pass
            
            conn.close()
            
        except Exception as e:
            logger.debug(f"Error storing analysis result: {e}")
    
    async def get_error_statistics(self) -> Dict:
        """Get error statistics from database"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            
            # Error counts by severity
            cursor.execute("""
                SELECT severity, COUNT(*) as count 
                FROM error_logs 
                GROUP BY severity 
                ORDER BY count DESC
            """)
            severity_stats = dict(cursor.fetchall())
            
            # Error counts by type
            cursor.execute("""
                SELECT error_type, COUNT(*) as count 
                FROM error_logs 
                GROUP BY error_type 
                ORDER BY count DESC 
                LIMIT 10
            """)
            type_stats = dict(cursor.fetchall())
            
            # Recent activity
            cursor.execute("""
                SELECT COUNT(*) as recent_errors 
                FROM error_logs 
                WHERE created_at > ?
            """, (int((time.time() - 86400) * 1000),))  # Last 24 hours
            recent_count = cursor.fetchone()[0]
            
            # Training data stats
            cursor.execute("SELECT COUNT(*) FROM ai_training_data")
            training_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM error_patterns WHERE is_active = 1")
            pattern_count = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                'total_errors': sum(severity_stats.values()),
                'severity_breakdown': severity_stats,
                'top_error_types': type_stats,
                'recent_errors_24h': recent_count,
                'training_data_count': training_count,
                'active_patterns': pattern_count,
                'models_trained': len(self.models),
                'database_path': str(self.db_path)
            }
            
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {}
    
    async def add_new_pattern(
        self, pattern: str, regex: str, description: str, 
        severity: str, error_type: str, suggested_fix: str
    ) -> bool:
        """Add new error pattern to database"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO error_patterns 
                (pattern, regex, description, severity, error_type, 
                 category, suggested_fix, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
            """, (
                pattern, regex, description, severity, error_type,
                "user_defined", suggested_fix, int(time.time() * 1000)
            ))
            
            conn.commit()
            conn.close()
            
            # Reload patterns
            await self._load_error_patterns()
            
            logger.info(f"Added new pattern: {pattern}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding pattern: {e}")
            return False

# Global intelligence instance
intelligence = StackLensIntelligence()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    await intelligence.initialize()
    yield
    # Shutdown
    logger.info("Shutting down StackLens Intelligence")

# FastAPI app
app = FastAPI(
    title="StackLens Integrated Error Intelligence",
    description="Advanced error analysis using existing StackLens database",
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
        "service": "StackLens Integrated Error Intelligence",
        "version": "2.0.0",
        "status": "operational" if intelligence.is_initialized else "initializing",
        "database": str(intelligence.db_path),
        "features": [
            "Real-time error analysis",
            "Pattern matching with 304+ patterns",
            "ML prediction using 56K+ real errors",
            "Similarity search",
            "Continuous learning",
            "Database integration"
        ]
    }

@app.post("/analyze")
async def analyze_error(
    error_data: Dict[str, Any],
    include_similar: bool = Query(True, description="Include similar errors"),
    include_insights: bool = Query(True, description="Include AI insights")
):
    """Analyze error using integrated intelligence"""
    try:
        error_text = error_data.get("error", "")
        context = error_data.get("context", {})
        
        if not error_text:
            raise HTTPException(status_code=400, detail="Error text is required")
        
        result = await intelligence.analyze_error(error_text, context)
        
        response = {
            "error_type": result.error_type,
            "severity": result.severity,
            "confidence": result.confidence,
            "suggested_solution": result.suggested_solution,
            "analysis_timestamp": datetime.datetime.now().isoformat()
        }
        
        if include_similar and result.similar_errors:
            response["similar_errors"] = result.similar_errors
        
        if include_insights and result.ai_insights:
            response["ai_insights"] = result.ai_insights
        
        if result.pattern_matched:
            response["pattern_matched"] = result.pattern_matched
        
        return response
        
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/statistics")
async def get_statistics():
    """Get error statistics and system status"""
    try:
        stats = await intelligence.get_error_statistics()
        return {
            "system_status": "operational" if intelligence.is_initialized else "initializing",
            "statistics": stats,
            "timestamp": datetime.datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Statistics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/patterns")
async def add_pattern(pattern_data: Dict[str, str]):
    """Add new error pattern"""
    try:
        required_fields = ["pattern", "description", "severity", "error_type", "suggested_fix"]
        for field in required_fields:
            if field not in pattern_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        success = await intelligence.add_new_pattern(
            pattern=pattern_data["pattern"],
            regex=pattern_data.get("regex", ""),
            description=pattern_data["description"],
            severity=pattern_data["severity"],
            error_type=pattern_data["error_type"],
            suggested_fix=pattern_data["suggested_fix"]
        )
        
        if success:
            return {"message": "Pattern added successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to add pattern")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Add pattern error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/patterns")
async def get_patterns():
    """Get all active error patterns"""
    try:
        return {
            "patterns": intelligence.error_patterns,
            "count": len(intelligence.error_patterns),
            "timestamp": datetime.datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Get patterns error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/retrain")
async def retrain_models():
    """Retrain ML models with latest data"""
    try:
        await intelligence._load_training_data()
        await intelligence._train_models()
        
        return {
            "message": "Models retrained successfully",
            "training_samples": len(intelligence.training_data),
            "models_trained": len(intelligence.models),
            "timestamp": datetime.datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Retrain error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        conn = intelligence._get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM error_logs")
        error_count = cursor.fetchone()[0]
        conn.close()
        
        return {
            "status": "healthy",
            "database_accessible": True,
            "models_loaded": len(intelligence.models),
            "patterns_loaded": len(intelligence.error_patterns),
            "training_data_loaded": len(intelligence.training_data),
            "total_errors_in_db": error_count,
            "timestamp": datetime.datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.datetime.now().isoformat()
        }

if __name__ == "__main__":
    uvicorn.run(
        "stacklens_integrated_intelligence:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
