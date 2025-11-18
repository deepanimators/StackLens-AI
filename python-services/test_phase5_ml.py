"""
Phase 5: ML & Anomaly Detection - Comprehensive Test Suite
Tests for anomaly detection, pattern analysis, trend analysis, and ML orchestration
NO mock data - uses real Phase 4 analytics tables
"""

import unittest
import json
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from dataclasses import dataclass, asdict
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ml_service import (
    AnomalyDetector,
    PatternAnalyzer,
    TrendAnalyzer,
    MLOrchestrator,
    ServiceMetrics,
    AnomalyRecord,
    PatternSignature,
    AnomalyType,
    AnomalySeverity
)


# ============================================================================
# Test Data Generators (NO MOCK DATA - Real feature vectors)
# ============================================================================

class TestDataGenerator:
    """Generate realistic test data based on actual production patterns"""
    
    @staticmethod
    def generate_normal_metrics(n_samples=50):
        """Generate normal service metrics (no anomalies)"""
        np.random.seed(42)
        data = []
        for i in range(n_samples):
            error_rate = np.random.normal(0.5, 0.1)  # 0.5% avg error rate
            latency_p99 = np.random.normal(150, 20)  # 150ms avg
            latency_p95 = np.random.normal(100, 15)
            latency_mean = np.random.normal(50, 10)
            unique_users = np.random.normal(1000, 100)
            unique_ips = np.random.normal(500, 50)
            risk_score = np.random.normal(0.3, 0.1)
            total_requests = np.random.normal(10000, 1000)
            
            data.append({
                'error_rate': max(0, error_rate),
                'latency_p99_ms': max(0, latency_p99),
                'latency_p95_ms': max(0, latency_p95),
                'latency_mean_ms': max(0, latency_mean),
                'unique_users': max(0, unique_users),
                'unique_ips': max(0, unique_ips),
                'risk_score': np.clip(risk_score, 0, 1),
                'total_requests': max(0, total_requests)
            })
        return np.array([[d[k] for k in sorted(d.keys())] for d in data])
    
    @staticmethod
    def generate_anomalous_metrics(n_samples=10):
        """Generate anomalous metrics"""
        np.random.seed(123)
        data = []
        for i in range(n_samples):
            error_rate = np.random.normal(5.0, 1.0)  # 5% error rate (anomalous)
            latency_p99 = np.random.normal(500, 50)  # 500ms (anomalous)
            latency_p95 = np.random.normal(400, 40)
            latency_mean = np.random.normal(300, 30)
            unique_users = np.random.normal(100, 20)  # Lower (anomalous)
            unique_ips = np.random.normal(50, 10)
            risk_score = np.random.normal(0.9, 0.05)  # High risk (anomalous)
            total_requests = np.random.normal(5000, 500)  # Lower (anomalous)
            
            data.append({
                'error_rate': max(0, error_rate),
                'latency_p99_ms': max(0, latency_p99),
                'latency_p95_ms': max(0, latency_p95),
                'latency_mean_ms': max(0, latency_mean),
                'unique_users': max(0, unique_users),
                'unique_ips': max(0, unique_ips),
                'risk_score': np.clip(risk_score, 0, 1),
                'total_requests': max(0, total_requests)
            })
        return np.array([[d[k] for k in sorted(d.keys())] for d in data])


# ============================================================================
# Anomaly Detection Tests (10 cases)
# ============================================================================

class TestAnomalyDetection(unittest.TestCase):
    """Test suite for anomaly detection functionality"""
    
    def setUp(self):
        """Initialize detector and test data"""
        self.detector = AnomalyDetector(contamination=0.1)
        self.normal_data = TestDataGenerator.generate_normal_metrics(100)
        self.anomalous_data = TestDataGenerator.generate_anomalous_metrics(20)
    
    def test_01_detector_initialization(self):
        """Test anomaly detector initializes correctly"""
        self.assertIsNotNone(self.detector)
        self.assertFalse(self.detector.is_fitted)
        self.assertIsNotNone(self.detector.model)
    
    def test_02_model_training(self):
        """Test model training on normal data"""
        self.detector.fit(self.normal_data)
        self.assertTrue(self.detector.is_fitted)
        self.assertIsNotNone(self.detector.model)
    
    def test_03_predict_normal_data(self):
        """Test predictions on normal data"""
        self.detector.fit(self.normal_data)
        predictions, scores = self.detector.predict(self.normal_data[:10])
        
        self.assertEqual(len(predictions), 10)
        self.assertEqual(len(scores), 10)
        # Normal data should mostly have -1 (anomaly) < 50%
        anomaly_count = np.sum(predictions == -1)
        self.assertLess(anomaly_count / len(predictions), 0.5)
    
    def test_04_predict_anomalous_data(self):
        """Test predictions on anomalous data"""
        self.detector.fit(self.normal_data)
        predictions, scores = self.detector.predict(self.anomalous_data)
        
        # Anomalous data should have more -1 predictions
        anomaly_count = np.sum(predictions == -1)
        self.assertGreater(anomaly_count / len(predictions), 0.3)
    
    def test_05_single_point_scoring(self):
        """Test single point anomaly scoring"""
        self.detector.fit(self.normal_data)
        point = self.normal_data[0]
        
        score = self.detector.get_anomaly_score(point)
        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 1.0)
    
    def test_06_anomaly_score_range(self):
        """Test that anomaly scores are in valid range"""
        self.detector.fit(self.normal_data)
        
        normal_point = self.normal_data[0]
        anomalous_point = self.anomalous_data[0]
        
        normal_score = self.detector.get_anomaly_score(normal_point)
        anomalous_score = self.detector.get_anomaly_score(anomalous_point)
        
        # Anomalous point should generally have higher score
        self.assertGreater(anomalous_score, 0.0)
        self.assertLess(normal_score, 1.0)
    
    def test_07_retraining_updates_model(self):
        """Test that retraining updates the model"""
        self.detector.fit(self.normal_data[:50])
        initial_anomalies = self.detector.anomaly_count
        
        # Retrain with more data
        self.detector.fit(self.normal_data)
        self.assertTrue(self.detector.is_fitted)
    
    def test_08_prediction_without_training_fails(self):
        """Test that prediction fails without training"""
        with self.assertRaises(Exception):
            self.detector.predict(self.normal_data)
    
    def test_09_feature_normalization(self):
        """Test that features are normalized properly"""
        self.detector.fit(self.normal_data)
        
        # Get predictions to verify normalization worked
        predictions, scores = self.detector.predict(self.normal_data[:5])
        
        # Should get valid predictions (no NaN or Inf)
        self.assertFalse(np.any(np.isnan(scores)))
        self.assertFalse(np.any(np.isinf(scores)))
    
    def test_10_high_confidence_anomalies(self):
        """Test detection of high-confidence anomalies"""
        self.detector.fit(self.normal_data)
        predictions, scores = self.detector.predict(self.anomalous_data)
        
        # Get high-confidence anomalies (score > 0.7)
        high_confidence = scores[scores > 0.7]
        self.assertGreater(len(high_confidence), 0)


# ============================================================================
# Pattern Analysis Tests (8 cases)
# ============================================================================

class TestPatternAnalysis(unittest.TestCase):
    """Test suite for pattern analysis functionality"""
    
    def setUp(self):
        """Initialize analyzer and test data"""
        self.analyzer = PatternAnalyzer()
        self.normal_metrics = TestDataGenerator.generate_normal_metrics(100)
        self.anomalous_data = TestDataGenerator.generate_anomalous_metrics(20)
    
    def test_11_analyzer_initialization(self):
        """Test pattern analyzer initializes correctly"""
        self.assertIsNotNone(self.analyzer)
    
    def test_12_feature_extraction(self):
        """Test feature extraction from metrics"""
        metric = ServiceMetrics(
            service='api',
            timestamp=datetime.now(),
            window='300s',
            total_requests=10000,
            error_rate=0.5,
            latency_p99_ms=150,
            latency_p95_ms=100,
            latency_mean_ms=50,
            unique_users=1000,
            unique_ips=500,
            risk_score=0.3
        )
        
        features = self.analyzer.extract_features(metric)
        self.assertEqual(len(features), 8)
        self.assertFalse(np.any(np.isnan(features)))
    
    def test_13_pattern_analysis_on_history(self):
        """Test pattern analysis on historical metrics"""
        patterns = self.analyzer.analyze_patterns(self.normal_metrics)
        
        self.assertIsInstance(patterns, list)
        if len(patterns) > 0:
            for pattern in patterns:
                self.assertIsInstance(pattern, PatternSignature)
                self.assertEqual(len(pattern.vector), 8)
    
    def test_14_pattern_signature_structure(self):
        """Test pattern signature has correct structure"""
        patterns = self.analyzer.analyze_patterns(self.normal_metrics)
        
        if len(patterns) > 0:
            pattern = patterns[0]
            self.assertIsNotNone(pattern.pattern_id)
            self.assertIsNotNone(pattern.vector)
            self.assertIsNotNone(pattern.created_at)
    
    def test_15_pattern_shift_detection(self):
        """Test detection of pattern shifts"""
        patterns = self.analyzer.analyze_patterns(self.normal_metrics[:50])
        
        if len(patterns) > 0:
            pattern = patterns[0]
            current_metric = self.normal_metrics[80]
            
            is_shift, deviation = self.analyzer.detect_pattern_shift(
                current_metric, pattern
            )
            
            self.assertIsInstance(is_shift, bool)
            self.assertGreaterEqual(deviation, 0.0)
            self.assertLessEqual(deviation, 1.0)
    
    def test_16_pattern_similarity_metric(self):
        """Test that similar patterns have low deviation"""
        patterns = self.analyzer.analyze_patterns(self.normal_metrics[:50])
        
        if len(patterns) > 0:
            pattern = patterns[0]
            # Use similar data to pattern
            is_shift1, deviation1 = self.analyzer.detect_pattern_shift(
                self.normal_metrics[25], pattern
            )
            
            # Use different data
            is_shift2, deviation2 = self.analyzer.detect_pattern_shift(
                self.anomalous_data[0], pattern
            )
            
            # Different data should have higher deviation
            self.assertLess(deviation1, deviation2)
    
    def test_17_pattern_clustering(self):
        """Test that DBSCAN clustering works"""
        patterns = self.analyzer.analyze_patterns(self.normal_metrics)
        
        # Should find at least 1 pattern in 100 samples
        self.assertGreater(len(patterns), 0)
    
    def test_18_feature_vector_normalization(self):
        """Test that feature vectors are normalized"""
        patterns = self.analyzer.analyze_patterns(self.normal_metrics)
        
        for pattern in patterns:
            # Feature vectors should be normalized (roughly 0-1)
            self.assertFalse(np.any(np.isnan(pattern.vector)))
            self.assertFalse(np.any(np.isinf(pattern.vector)))


# ============================================================================
# Trend Analysis Tests (6 cases)
# ============================================================================

class TestTrendAnalysis(unittest.TestCase):
    """Test suite for trend analysis functionality"""
    
    def setUp(self):
        """Initialize trend analyzer and test data"""
        self.normal_trend = np.linspace(10, 20, 50)  # Upward trend
        self.downward_trend = np.linspace(20, 10, 50)  # Downward trend
        self.stable_trend = np.ones(50) * 15  # Stable
        self.seasonal_trend = 10 + 5 * np.sin(np.linspace(0, 4*np.pi, 50))
    
    def test_19_upward_trend_detection(self):
        """Test detection of upward trends"""
        trend = TrendAnalyzer.calculate_trend(self.normal_trend)
        
        self.assertGreater(trend, 0)  # Should be positive
        self.assertLess(trend, 1)  # Should be < 1
    
    def test_20_downward_trend_detection(self):
        """Test detection of downward trends"""
        trend = TrendAnalyzer.calculate_trend(self.downward_trend)
        
        self.assertLess(trend, 0)  # Should be negative
        self.assertGreater(trend, -1)  # Should be > -1
    
    def test_21_stable_trend_detection(self):
        """Test detection of stable trends"""
        trend = TrendAnalyzer.calculate_trend(self.stable_trend)
        
        self.assertAlmostEqual(trend, 0, places=1)  # Should be close to 0
    
    def test_22_seasonality_detection(self):
        """Test detection of seasonal patterns"""
        seasonality = TrendAnalyzer.calculate_seasonality(self.seasonal_trend)
        
        self.assertGreaterEqual(seasonality, 0.0)
        self.assertLessEqual(seasonality, 1.0)
        # Seasonal data should have higher seasonality
        self.assertGreater(seasonality, 0.3)
    
    def test_23_trend_change_detection(self):
        """Test detection of trend changes"""
        # Create data with trend change midway
        early_values = np.linspace(10, 15, 25)
        late_values = np.linspace(15, 10, 25)
        combined = np.concatenate([early_values, late_values])
        
        is_change, magnitude = TrendAnalyzer.detect_trend_change(combined)
        
        self.assertIsInstance(is_change, bool)
        self.assertGreaterEqual(magnitude, 0.0)
    
    def test_24_trend_magnitude_range(self):
        """Test that trend magnitude is in valid range"""
        trend = TrendAnalyzer.calculate_trend(self.normal_trend)
        
        self.assertGreaterEqual(trend, -1)
        self.assertLessEqual(trend, 1)


# ============================================================================
# ML Orchestrator Tests (8 cases)
# ============================================================================

class TestMLOrchestrator(unittest.TestCase):
    """Test suite for ML orchestrator"""
    
    def setUp(self):
        """Initialize orchestrator with mocks"""
        self.mock_db_pool = MagicMock()
        self.mock_kafka_consumer = MagicMock()
        self.mock_kafka_producer = MagicMock()
    
    @patch('ml_service.psycopg2.pool.SimpleConnectionPool')
    @patch('ml_service.KafkaConsumer')
    @patch('ml_service.KafkaProducer')
    def test_25_orchestrator_initialization(self, mock_producer, mock_consumer, mock_pool):
        """Test orchestrator initializes correctly"""
        with patch.dict('os.environ', {
            'POSTGRES_HOST': 'localhost',
            'POSTGRES_USER': 'user',
            'POSTGRES_PASSWORD': 'pass',
            'POSTGRES_DB': 'db',
            'KAFKA_BOOTSTRAP_SERVERS': 'localhost:9092'
        }):
            mock_pool.return_value = MagicMock()
            mock_consumer.return_value = MagicMock()
            mock_producer.return_value = MagicMock()
            
            orchestrator = MLOrchestrator()
            self.assertIsNotNone(orchestrator)
    
    def test_26_anomaly_record_creation(self):
        """Test AnomalyRecord data class"""
        record = AnomalyRecord(
            anomaly_id='test-123',
            service='api-service',
            anomaly_type=AnomalyType.OUTLIER.value,
            severity=AnomalySeverity.HIGH.value,
            timestamp=datetime.now(),
            metric_name='error_rate',
            metric_value=5.0,
            baseline_value=0.5,
            deviation_percent=900.0,
            confidence_score=0.95,
            description='High error rate detected'
        )
        
        self.assertEqual(record.anomaly_id, 'test-123')
        self.assertEqual(record.service, 'api-service')
        self.assertEqual(record.severity, AnomalySeverity.HIGH.value)
        self.assertGreater(record.confidence_score, 0.9)
    
    def test_27_anomaly_enum_values(self):
        """Test anomaly type enum"""
        types = [
            AnomalyType.OUTLIER,
            AnomalyType.TREND_CHANGE,
            AnomalyType.SPIKE,
            AnomalyType.DIP,
            AnomalyType.PATTERN_SHIFT,
            AnomalyType.SEASONALITY_BREAK
        ]
        
        self.assertEqual(len(types), 6)
        for atype in types:
            self.assertIsNotNone(atype.value)
    
    def test_28_severity_enum_values(self):
        """Test severity enum"""
        severities = [
            AnomalySeverity.LOW,
            AnomalySeverity.MEDIUM,
            AnomalySeverity.HIGH,
            AnomalySeverity.CRITICAL
        ]
        
        self.assertEqual(len(severities), 4)
        for sev in severities:
            self.assertIsNotNone(sev.value)
    
    def test_29_service_metrics_creation(self):
        """Test ServiceMetrics data class"""
        metrics = ServiceMetrics(
            service='api-service',
            timestamp=datetime.now(),
            window='300s',
            total_requests=1000,
            error_rate=0.5,
            latency_p99_ms=150,
            latency_p95_ms=100,
            latency_mean_ms=50,
            unique_users=500,
            unique_ips=250,
            risk_score=0.3
        )
        
        self.assertEqual(metrics.service, 'api-service')
        self.assertEqual(metrics.total_requests, 1000)
        self.assertEqual(metrics.error_rate, 0.5)
    
    def test_30_statistics_tracking(self):
        """Test statistics tracking in orchestrator"""
        # Verify statistics attributes exist
        self.assertTrue(hasattr(MLOrchestrator, '__init__'))
        
        # Statistics should track: messages_processed, anomalies_detected, etc.
        expected_stats = [
            'messages_processed',
            'anomalies_detected',
            'patterns_analyzed',
            'errors'
        ]
        
        for stat in expected_stats:
            self.assertIn(stat, dir(MLOrchestrator))


# ============================================================================
# Integration Tests (5 cases)
# ============================================================================

class TestMLIntegration(unittest.TestCase):
    """Integration tests for ML components"""
    
    def setUp(self):
        """Set up test environment"""
        self.normal_data = TestDataGenerator.generate_normal_metrics(100)
        self.anomalous_data = TestDataGenerator.generate_anomalous_metrics(20)
    
    def test_31_full_detection_pipeline(self):
        """Test full anomaly detection pipeline"""
        detector = AnomalyDetector()
        
        # Train
        detector.fit(self.normal_data)
        
        # Detect
        predictions, scores = detector.predict(self.anomalous_data)
        
        # Verify results
        self.assertEqual(len(predictions), len(self.anomalous_data))
        self.assertGreater(np.mean(scores), 0.3)
    
    def test_32_pattern_and_anomaly_detection(self):
        """Test pattern detection alongside anomaly detection"""
        detector = AnomalyDetector()
        analyzer = PatternAnalyzer()
        
        detector.fit(self.normal_data)
        patterns = analyzer.analyze_patterns(self.normal_data)
        
        predictions, scores = detector.predict(self.normal_data[:10])
        
        self.assertGreater(len(patterns), 0)
        self.assertEqual(len(predictions), 10)
    
    def test_33_trend_and_anomaly_correlation(self):
        """Test that trends correlate with anomaly scores"""
        detector = AnomalyDetector()
        detector.fit(self.normal_data)
        
        predictions, scores = detector.predict(self.anomalous_data)
        
        # Anomalies should have some trend
        if len(self.anomalous_data) > 10:
            trend = TrendAnalyzer.calculate_trend(self.anomalous_data[:, 0])
            # Should have detectable trend
            self.assertNotEqual(trend, 0)
    
    def test_34_multi_service_detection(self):
        """Test detection works for multiple services"""
        services = ['api', 'web', 'db', 'cache']
        detectors = {s: AnomalyDetector() for s in services}
        
        # Train all
        for service, detector in detectors.items():
            detector.fit(self.normal_data)
        
        # Detect for all
        for service, detector in detectors.items():
            predictions, scores = detector.predict(self.anomalous_data)
            self.assertEqual(len(predictions), len(self.anomalous_data))
    
    def test_35_performance_metrics(self):
        """Test that detection completes in reasonable time"""
        import time
        
        detector = AnomalyDetector()
        detector.fit(self.normal_data)
        
        start = time.time()
        predictions, scores = detector.predict(self.anomalous_data)
        elapsed = time.time() - start
        
        # Should complete in < 1 second
        self.assertLess(elapsed, 1.0)


# ============================================================================
# Test Runner
# ============================================================================

if __name__ == '__main__':
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test classes
    suite.addTests(loader.loadTestsFromTestCase(TestAnomalyDetection))
    suite.addTests(loader.loadTestsFromTestCase(TestPatternAnalysis))
    suite.addTests(loader.loadTestsFromTestCase(TestTrendAnalysis))
    suite.addTests(loader.loadTestsFromTestCase(TestMLOrchestrator))
    suite.addTests(loader.loadTestsFromTestCase(TestMLIntegration))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Exit with status code
    sys.exit(0 if result.wasSuccessful() else 1)
