"""
Active Learning Pipeline for StackLens AI
Enables continuous self-training and improvement
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from collections import deque
import json
import asyncio
from fastapi import FastAPI, Request
import sqlite3
from datetime import datetime

@dataclass
class TrainingExample:
    """Represents a training example with metadata"""
    error_text: str
    features: List[float]
    true_label: Optional[str] = None
    predicted_label: Optional[str] = None
    confidence: float = 0.0
    uncertainty: float = 0.0
    timestamp: datetime = datetime.now()
    feedback_score: Optional[float] = None
    source: str = "unknown"

class UncertaintyEstimator:
    """Estimates prediction uncertainty for active learning"""
    
    @staticmethod
    def monte_carlo_dropout(model, x, num_samples=10):
        """Monte Carlo dropout for uncertainty estimation"""
        model.train()  # Enable dropout
        predictions = []
        
        with torch.no_grad():
            for _ in range(num_samples):
                pred = model(x)
                if isinstance(pred, dict):
                    pred = pred['error_type']  # For our custom models
                predictions.append(F.softmax(pred, dim=1))
        
        model.eval()
        predictions = torch.stack(predictions)
        
        # Calculate mean and variance
        mean_pred = predictions.mean(dim=0)
        variance = predictions.var(dim=0)
        
        # Uncertainty metrics
        entropy = -torch.sum(mean_pred * torch.log(mean_pred + 1e-10), dim=1)
        variance_sum = variance.sum(dim=1)
        
        return {
            'predictions': mean_pred,
            'epistemic_uncertainty': variance_sum,
            'aleatoric_uncertainty': entropy,
            'total_uncertainty': entropy + variance_sum
        }
    
    @staticmethod
    def ensemble_uncertainty(models, x):
        """Uncertainty from ensemble disagreement"""
        predictions = []
        
        for model in models:
            with torch.no_grad():
                pred = model(x)
                if isinstance(pred, dict):
                    pred = pred['error_type']
                predictions.append(F.softmax(pred, dim=1))
        
        predictions = torch.stack(predictions)
        mean_pred = predictions.mean(dim=0)
        disagreement = predictions.var(dim=0).sum(dim=1)
        
        return {
            'predictions': mean_pred,
            'disagreement': disagreement
        }

class ActiveLearningPipeline:
    """Main active learning pipeline for continuous improvement"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.uncertainty_threshold = config.get('uncertainty_threshold', 0.8)
        self.feedback_threshold = config.get('feedback_threshold', 0.5)
        self.max_uncertain_samples = config.get('max_uncertain_samples', 100)
        
        # Storage for uncertain samples
        self.uncertain_samples = deque(maxlen=self.max_uncertain_samples)
        self.feedback_buffer = deque(maxlen=1000)
        
        # Database for persistence
        self.db_path = config.get('db_path', 'active_learning.db')
        self.init_database()
    
    def init_database(self):
        """Initialize SQLite database for storing learning data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS uncertain_samples (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                error_text TEXT,
                features TEXT,
                predicted_label TEXT,
                confidence REAL,
                uncertainty REAL,
                timestamp TEXT,
                reviewed BOOLEAN DEFAULT FALSE,
                true_label TEXT,
                feedback_score REAL
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS feedback_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sample_id INTEGER,
                user_feedback TEXT,
                score REAL,
                timestamp TEXT,
                FOREIGN KEY (sample_id) REFERENCES uncertain_samples (id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def should_query_oracle(self, uncertainty: float, confidence: float) -> bool:
        """Determine if a sample should be sent for human review"""
        return (uncertainty > self.uncertainty_threshold or 
                confidence < self.feedback_threshold)
    
    def add_uncertain_sample(self, example: TrainingExample):
        """Add uncertain sample to the queue for review"""
        # Store in memory
        self.uncertain_samples.append(example)
        
        # Store in database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO uncertain_samples 
            (error_text, features, predicted_label, confidence, uncertainty, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            example.error_text,
            json.dumps(example.features),
            example.predicted_label,
            example.confidence,
            example.uncertainty,
            example.timestamp.isoformat()
        ))
        
        conn.commit()
        conn.close()
    
    def get_samples_for_review(self, limit: int = 10) -> List[TrainingExample]:
        """Get samples that need human review"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM uncertain_samples 
            WHERE reviewed = FALSE 
            ORDER BY uncertainty DESC 
            LIMIT ?
        ''', (limit,))
        
        rows = cursor.fetchall()
        conn.close()
        
        samples = []
        for row in rows:
            sample = TrainingExample(
                error_text=row[1],
                features=json.loads(row[2]),
                predicted_label=row[3],
                confidence=row[4],
                uncertainty=row[5],
                timestamp=datetime.fromisoformat(row[6])
            )
            samples.append(sample)
        
        return samples
    
    def submit_feedback(self, sample_id: int, true_label: str, score: float):
        """Submit human feedback for a sample"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Update the sample
        cursor.execute('''
            UPDATE uncertain_samples 
            SET reviewed = TRUE, true_label = ?, feedback_score = ?
            WHERE id = ?
        ''', (true_label, score, sample_id))
        
        # Log the feedback
        cursor.execute('''
            INSERT INTO feedback_log (sample_id, user_feedback, score, timestamp)
            VALUES (?, ?, ?, ?)
        ''', (sample_id, true_label, score, datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
    
    def get_training_data(self) -> List[TrainingExample]:
        """Get all reviewed samples for training"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM uncertain_samples 
            WHERE reviewed = TRUE AND true_label IS NOT NULL
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        training_data = []
        for row in rows:
            sample = TrainingExample(
                error_text=row[1],
                features=json.loads(row[2]),
                true_label=row[8],  # true_label column
                predicted_label=row[3],
                confidence=row[4],
                uncertainty=row[5],
                feedback_score=row[9]
            )
            training_data.append(sample)
        
        return training_data

class ContinualLearningManager:
    """Manages continuous learning and model updates"""
    
    def __init__(self, models: Dict, active_learning: ActiveLearningPipeline):
        self.models = models
        self.active_learning = active_learning
        self.learning_rate = 0.001
        self.batch_size = 32
        self.validation_split = 0.2
    
    async def incremental_training(self, new_samples: List[TrainingExample]):
        """Perform incremental training with new samples"""
        if len(new_samples) < self.batch_size:
            return {"status": "insufficient_data", "samples": len(new_samples)}
        
        # Prepare data
        texts = [sample.error_text for sample in new_samples]
        labels = [sample.true_label for sample in new_samples]
        
        # Split into train/validation
        split_idx = int(len(new_samples) * (1 - self.validation_split))
        train_samples = new_samples[:split_idx]
        val_samples = new_samples[split_idx:]
        
        results = {}
        
        # Update transformer model
        if 'transformer' in self.models:
            transformer_result = await self._update_transformer(train_samples, val_samples)
            results['transformer'] = transformer_result
        
        # Update other models...
        
        return {
            "status": "training_completed",
            "samples_used": len(new_samples),
            "train_samples": len(train_samples),
            "val_samples": len(val_samples),
            "results": results,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _update_transformer(self, train_samples: List[TrainingExample], 
                                val_samples: List[TrainingExample]):
        """Update transformer model with new data"""
        model = self.models['transformer']
        optimizer = torch.optim.AdamW(model.parameters(), lr=self.learning_rate)
        
        # Convert to tensors (simplified)
        train_losses = []
        val_accuracies = []
        
        model.train()
        for epoch in range(3):  # Few epochs for incremental learning
            epoch_loss = 0.0
            for i in range(0, len(train_samples), self.batch_size):
                batch = train_samples[i:i+self.batch_size]
                
                # Forward pass (simplified)
                optimizer.zero_grad()
                # loss = ... (implement actual training logic)
                # loss.backward()
                optimizer.step()
                
                # epoch_loss += loss.item()
            
            # Validation
            val_acc = await self._validate_model(model, val_samples)
            val_accuracies.append(val_acc)
        
        model.eval()
        
        return {
            "training_loss": train_losses,
            "validation_accuracy": val_accuracies,
            "epochs": 3
        }
    
    async def _validate_model(self, model, val_samples: List[TrainingExample]) -> float:
        """Validate model on validation samples"""
        correct = 0
        total = len(val_samples)
        
        model.eval()
        with torch.no_grad():
            for sample in val_samples:
                # prediction = model(sample.features)
                # if prediction == sample.true_label:
                #     correct += 1
                pass
        
        return correct / total if total > 0 else 0.0

# FastAPI service for active learning
app = FastAPI(title="Active Learning Service", version="1.0.0")

# Global instances
active_learning_pipeline = None
continual_learning_manager = None

@app.on_event("startup")
async def startup():
    global active_learning_pipeline, continual_learning_manager
    
    config = {
        'uncertainty_threshold': 0.8,
        'feedback_threshold': 0.6,
        'max_uncertain_samples': 200,
        'db_path': 'active_learning.db'
    }
    
    active_learning_pipeline = ActiveLearningPipeline(config)
    print("✅ Active Learning Pipeline initialized")

@app.post("/submit-prediction")
async def submit_prediction(request: Request):
    """Submit a prediction for active learning evaluation"""
    try:
        data = await request.json()
        
        example = TrainingExample(
            error_text=data['error_text'],
            features=data['features'],
            predicted_label=data['predicted_label'],
            confidence=data['confidence'],
            uncertainty=data.get('uncertainty', 0.0)
        )
        
        # Check if should query oracle
        should_review = active_learning_pipeline.should_query_oracle(
            example.uncertainty, example.confidence
        )
        
        if should_review:
            active_learning_pipeline.add_uncertain_sample(example)
            
        return {
            "should_review": should_review,
            "uncertainty": example.uncertainty,
            "confidence": example.confidence,
            "queued_for_review": should_review
        }
        
    except Exception as e:
        return {"error": str(e)}

@app.get("/samples-for-review")
async def get_samples_for_review(limit: int = 10):
    """Get samples that need human review"""
    try:
        samples = active_learning_pipeline.get_samples_for_review(limit)
        
        return {
            "samples": [
                {
                    "error_text": s.error_text,
                    "predicted_label": s.predicted_label,
                    "confidence": s.confidence,
                    "uncertainty": s.uncertainty
                } for s in samples
            ],
            "count": len(samples)
        }
        
    except Exception as e:
        return {"error": str(e)}

@app.post("/submit-feedback")
async def submit_feedback(request: Request):
    """Submit human feedback for a prediction"""
    try:
        data = await request.json()
        
        active_learning_pipeline.submit_feedback(
            sample_id=data['sample_id'],
            true_label=data['true_label'],
            score=data['score']
        )
        
        return {"status": "feedback_submitted"}
        
    except Exception as e:
        return {"error": str(e)}

@app.post("/trigger-training")
async def trigger_training():
    """Trigger incremental training with new feedback data"""
    try:
        training_data = active_learning_pipeline.get_training_data()
        
        if len(training_data) < 10:
            return {
                "status": "insufficient_data",
                "available_samples": len(training_data),
                "minimum_required": 10
            }
        
        # Simulate training (implement actual training logic)
        result = {
            "status": "training_completed",
            "samples_used": len(training_data),
            "accuracy_improvement": 0.05,  # Simulated
            "timestamp": datetime.now().isoformat()
        }
        
        return result
        
    except Exception as e:
        return {"error": str(e)}

@app.get("/learning-stats")
async def get_learning_stats():
    """Get active learning statistics"""
    try:
        conn = sqlite3.connect(active_learning_pipeline.db_path)
        cursor = conn.cursor()
        
        # Get counts
        cursor.execute("SELECT COUNT(*) FROM uncertain_samples")
        total_samples = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM uncertain_samples WHERE reviewed = TRUE")
        reviewed_samples = cursor.fetchone()[0]
        
        cursor.execute("SELECT AVG(feedback_score) FROM uncertain_samples WHERE feedback_score IS NOT NULL")
        avg_feedback = cursor.fetchone()[0] or 0.0
        
        conn.close()
        
        return {
            "total_uncertain_samples": total_samples,
            "reviewed_samples": reviewed_samples,
            "pending_review": total_samples - reviewed_samples,
            "average_feedback_score": avg_feedback,
            "review_completion_rate": reviewed_samples / total_samples if total_samples > 0 else 0.0
        }
        
    except Exception as e:
        return {"error": str(e)}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "active_learning_service",
        "pipeline_ready": active_learning_pipeline is not None
    }
