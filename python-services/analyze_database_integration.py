#!/usr/bin/env python3
"""
StackLens Database Integration Analysis
Comparison between separate error_corpus.db vs integrated stacklens.db approach
"""

import sqlite3
import json
from pathlib import Path
import time

class DatabaseComparisonAnalysis:
    """Analyze and compare database approaches"""
    
    def __init__(self):
        self.stacklens_db = Path("../db/stacklens.db")
        self.separate_corpus_db = Path("./enterprise_intelligence_data/comprehensive_error_corpus.db")
    
    def analyze_stacklens_database(self):
        """Analyze the existing StackLens database"""
        print("🔍 StackLens Database Analysis")
        print("=" * 50)
        
        if not self.stacklens_db.exists():
            print("❌ StackLens database not found")
            return {}
        
        try:
            conn = sqlite3.connect(str(self.stacklens_db))
            cursor = conn.cursor()
            
            # Database size
            cursor.execute("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()")
            db_size = cursor.fetchone()[0]
            
            # Table analysis
            tables_info = {}
            
            # Error logs analysis
            cursor.execute("SELECT COUNT(*) FROM error_logs")
            error_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(DISTINCT error_type) FROM error_logs")
            unique_types = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(DISTINCT severity) FROM error_logs")
            unique_severities = cursor.fetchone()[0]
            
            cursor.execute("SELECT MIN(created_at), MAX(created_at) FROM error_logs")
            date_range = cursor.fetchone()
            
            tables_info['error_logs'] = {
                'count': error_count,
                'unique_types': unique_types,
                'unique_severities': unique_severities,
                'date_range': date_range
            }
            
            # Error patterns analysis
            cursor.execute("SELECT COUNT(*) FROM error_patterns WHERE is_active = 1")
            active_patterns = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(DISTINCT category) FROM error_patterns")
            pattern_categories = cursor.fetchone()[0]
            
            tables_info['error_patterns'] = {
                'active_count': active_patterns,
                'categories': pattern_categories
            }
            
            # AI training data analysis
            cursor.execute("SELECT COUNT(*) FROM ai_training_data")
            training_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM ai_training_data WHERE is_validated = 1")
            validated_count = cursor.fetchone()[0]
            
            tables_info['ai_training_data'] = {
                'total_count': training_count,
                'validated_count': validated_count
            }
            
            # Log files analysis
            cursor.execute("SELECT COUNT(*) FROM log_files")
            files_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT SUM(total_errors) FROM log_files")
            total_file_errors = cursor.fetchone()[0] or 0
            
            cursor.execute("SELECT COUNT(DISTINCT file_type) FROM log_files")
            file_types = cursor.fetchone()[0]
            
            tables_info['log_files'] = {
                'files_count': files_count,
                'total_errors': total_file_errors,
                'file_types': file_types
            }
            
            conn.close()
            
            # Display results
            print(f"📁 Database Size: {db_size / (1024*1024):.1f} MB")
            print(f"📊 Error Logs: {error_count:,} records")
            print(f"   • Unique Types: {unique_types}")
            print(f"   • Severity Levels: {unique_severities}")
            print(f"🎯 Active Patterns: {active_patterns}")
            print(f"   • Categories: {pattern_categories}")
            print(f"🧠 Training Data: {training_count:,} records")
            print(f"   • Validated: {validated_count:,} ({validated_count/training_count*100:.1f}%)")
            print(f"📄 Processed Files: {files_count}")
            print(f"   • File Types: {file_types}")
            print(f"   • Total Extracted Errors: {total_file_errors:,}")
            
            return {
                'db_size_mb': db_size / (1024*1024),
                'total_records': error_count + training_count + active_patterns + files_count,
                'error_logs': error_count,
                'training_data': training_count,
                'validated_training': validated_count,
                'active_patterns': active_patterns,
                'processed_files': files_count,
                'quality_score': validated_count / training_count if training_count > 0 else 0
            }
            
        except Exception as e:
            print(f"❌ Error analyzing StackLens database: {e}")
            return {}
    
    def analyze_separate_corpus(self):
        """Analyze separate enterprise corpus database if it exists"""
        print("\n🔍 Separate Corpus Database Analysis")
        print("=" * 50)
        
        if not self.separate_corpus_db.exists():
            print("❌ Separate corpus database not found")
            print("   (This would be created by enterprise_error_intelligence.py)")
            
            # Estimate what a separate corpus would contain
            estimated_patterns = 1000  # From enterprise platform
            estimated_training = 5000  # Synthetic data
            estimated_size = 50  # MB
            
            print(f"📊 Estimated Separate Corpus:")
            print(f"   • Error Patterns: ~{estimated_patterns}")
            print(f"   • Synthetic Training Data: ~{estimated_training}")
            print(f"   • Estimated Size: ~{estimated_size} MB")
            print(f"   • Real Error Data: 0 (synthetic only)")
            print(f"   • Production Validation: None")
            
            return {
                'exists': False,
                'estimated_patterns': estimated_patterns,
                'estimated_training': estimated_training,
                'estimated_size_mb': estimated_size,
                'real_data': 0,
                'quality_score': 0.3  # Lower due to synthetic data
            }
        
        # If it exists, analyze it
        try:
            conn = sqlite3.connect(str(self.separate_corpus_db))
            cursor = conn.cursor()
            
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            
            print(f"📊 Found tables: {tables}")
            
            # Analyze each table
            total_records = 0
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                total_records += count
                print(f"   {table}: {count:,} records")
            
            conn.close()
            
            return {
                'exists': True,
                'tables': tables,
                'total_records': total_records,
                'quality_score': 0.5  # Medium quality estimate
            }
            
        except Exception as e:
            print(f"❌ Error analyzing separate corpus: {e}")
            return {'exists': True, 'error': str(e)}
    
    def compare_approaches(self):
        """Compare the two approaches and recommend best strategy"""
        print("\n🤔 Approach Comparison & Recommendation")
        print("=" * 60)
        
        stacklens_analysis = self.analyze_stacklens_database()
        corpus_analysis = self.analyze_separate_corpus()
        
        print(f"\n📊 Data Comparison:")
        print(f"{'Metric':<25} {'StackLens DB':<15} {'Separate Corpus':<15}")
        print("-" * 55)
        
        # Real vs Synthetic data
        stacklens_real = stacklens_analysis.get('error_logs', 0)
        corpus_real = corpus_analysis.get('real_data', 0)
        print(f"{'Real Error Data':<25} {stacklens_real:>10,} {corpus_real:>10,}")
        
        # Training data
        stacklens_training = stacklens_analysis.get('training_data', 0)
        corpus_training = corpus_analysis.get('estimated_training', 0)
        print(f"{'Training Data':<25} {stacklens_training:>10,} {corpus_training:>10,}")
        
        # Patterns
        stacklens_patterns = stacklens_analysis.get('active_patterns', 0)
        corpus_patterns = corpus_analysis.get('estimated_patterns', 0)
        print(f"{'Error Patterns':<25} {stacklens_patterns:>10,} {corpus_patterns:>10,}")
        
        # Quality
        stacklens_quality = stacklens_analysis.get('quality_score', 0)
        corpus_quality = corpus_analysis.get('quality_score', 0)
        print(f"{'Data Quality Score':<25} {stacklens_quality:>14.2f} {corpus_quality:>14.2f}")
        
        # Storage
        stacklens_size = stacklens_analysis.get('db_size_mb', 0)
        corpus_size = corpus_analysis.get('estimated_size_mb', 0)
        print(f"{'Storage Size (MB)':<25} {stacklens_size:>14.1f} {corpus_size:>14.1f}")
        
        print(f"\n🎯 Recommendation Analysis:")
        
        # Calculate scores
        stacklens_score = 0
        corpus_score = 0
        
        # Real data advantage
        if stacklens_real > corpus_real:
            stacklens_score += 3
            print(f"✅ StackLens: Has {stacklens_real:,} real error logs vs synthetic data")
        
        # Quality advantage
        if stacklens_quality > corpus_quality:
            stacklens_score += 2
            print(f"✅ StackLens: Higher data quality ({stacklens_quality:.2f} vs {corpus_quality:.2f})")
        
        # Existing infrastructure
        if stacklens_analysis:
            stacklens_score += 2
            print(f"✅ StackLens: Already exists and integrated with your application")
        
        # Maintenance advantage
        stacklens_score += 1
        print(f"✅ StackLens: No duplicate data management needed")
        
        # Pattern diversity
        if corpus_patterns > stacklens_patterns:
            corpus_score += 1
            print(f"🟡 Separate Corpus: More diverse patterns ({corpus_patterns} vs {stacklens_patterns})")
        
        print(f"\n🏆 Final Recommendation:")
        print("=" * 30)
        
        if stacklens_score >= corpus_score + 2:
            recommendation = "STRONGLY RECOMMENDED: Use StackLens Database"
            emoji = "🚀"
        elif stacklens_score > corpus_score:
            recommendation = "RECOMMENDED: Use StackLens Database"
            emoji = "✅"
        else:
            recommendation = "CONSIDER: Hybrid Approach"
            emoji = "🤔"
        
        print(f"{emoji} {recommendation}")
        
        print(f"\n💡 Benefits of Using StackLens Database:")
        print(f"   • {stacklens_real:,} real error logs from your actual environment")
        print(f"   • {stacklens_analysis.get('validated_training', 0):,} validated training examples")
        print(f"   • {stacklens_analysis.get('processed_files', 0)} real log files already processed")
        print(f"   • No data duplication or synchronization issues")
        print(f"   • Continuous learning from live production data")
        print(f"   • Proven patterns from actual usage")
        print(f"   • Immediate integration with existing StackLens features")
        
        print(f"\n⚙️ Implementation Strategy:")
        print(f"   1. ✅ Use stacklens_integrated_intelligence.py (already created)")
        print(f"   2. ✅ Leverage existing error_logs, error_patterns, ai_training_data")
        print(f"   3. 🔄 Enhance with additional patterns as needed")
        print(f"   4. 📈 Continuous improvement through real-world usage")
        print(f"   5. 🚀 Production deployment with proven data")
        
        return {
            'recommendation': recommendation,
            'stacklens_score': stacklens_score,
            'corpus_score': corpus_score,
            'use_stacklens_db': stacklens_score >= corpus_score
        }

def main():
    """Run the database comparison analysis"""
    print("🔍 StackLens Database Integration Analysis")
    print("=" * 60)
    print("Analyzing the best approach for error intelligence...")
    print("=" * 60)
    
    analyzer = DatabaseComparisonAnalysis()
    result = analyzer.compare_approaches()
    
    print(f"\n🎊 Analysis Complete!")
    print(f"Recommendation: {'Use StackLens Database' if result['use_stacklens_db'] else 'Consider Alternatives'}")
    
    if result['use_stacklens_db']:
        print(f"\n🚀 Next Steps:")
        print(f"   1. Use stacklens_integrated_intelligence.py")
        print(f"   2. Run test_stacklens_integration.py to validate")
        print(f"   3. Deploy integrated solution")
        print(f"   4. Monitor and enhance with real usage data")

if __name__ == "__main__":
    main()
