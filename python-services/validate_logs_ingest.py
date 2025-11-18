#!/usr/bin/env python3
"""Quick validation of Logs Ingest API schema"""

from logs_ingest_service import LogEventSchema
from pydantic import ValidationError

print("Testing Logs Ingest API Schema Validation...\n")

tests_passed = 0
tests_failed = 0

# Test 1: Valid full log
try:
    log = LogEventSchema(
        request_id='test-1',
        service='pos-demo',
        env='test',
        timestamp='2025-11-18T10:00:00.000Z',
        action='create_order',
        level='error',
        message='Test error',
        error_code='PRICE_MISSING',
        price=None
    )
    print('✅ Test 1 PASS: Valid full log')
    tests_passed += 1
except Exception as e:
    print(f'❌ Test 1 FAIL: {e}')
    tests_failed += 1

# Test 2: Valid minimal log
try:
    log = LogEventSchema(
        request_id='test-2',
        service='pos-demo',
        env='test',
        timestamp='2025-11-18T10:00:00.000Z',
        action='list',
        level='info',
        message='Test'
    )
    print('✅ Test 2 PASS: Valid minimal log')
    tests_passed += 1
except Exception as e:
    print(f'❌ Test 2 FAIL: {e}')
    tests_failed += 1

# Test 3: Invalid level should fail
try:
    log = LogEventSchema(
        request_id='test-3',
        service='pos-demo',
        env='test',
        timestamp='2025-11-18T10:00:00.000Z',
        action='test',
        level='invalid-level',
        message='Test'
    )
    print('❌ Test 3 FAIL: Should have rejected invalid level')
    tests_failed += 1
except ValidationError:
    print('✅ Test 3 PASS: Correctly rejected invalid level')
    tests_passed += 1

# Test 4: Invalid timestamp should fail
try:
    log = LogEventSchema(
        request_id='test-4',
        service='pos-demo',
        env='test',
        timestamp='not-a-timestamp',
        action='test',
        level='info',
        message='Test'
    )
    print('❌ Test 4 FAIL: Should have rejected invalid timestamp')
    tests_failed += 1
except ValidationError:
    print('✅ Test 4 PASS: Correctly rejected invalid timestamp')
    tests_passed += 1

# Test 5: Missing required field should fail
try:
    log = LogEventSchema(
        service='pos-demo',
        env='test',
        timestamp='2025-11-18T10:00:00.000Z',
        action='test',
        level='info',
        message='Test'
    )
    print('❌ Test 5 FAIL: Should have rejected missing request_id')
    tests_failed += 1
except ValidationError:
    print('✅ Test 5 PASS: Correctly rejected missing request_id')
    tests_passed += 1

# Test 6: Invalid required field missing
try:
    log = LogEventSchema(
        request_id='test-6',
        env='test',
        timestamp='2025-11-18T10:00:00.000Z',
        action='test',
        level='info',
        message='Test'
    )
    print('❌ Test 6 FAIL: Should have rejected missing service')
    tests_failed += 1
except ValidationError:
    print('✅ Test 6 PASS: Correctly rejected missing service')
    tests_passed += 1

# Test 7: Valid with optional fields
try:
    log = LogEventSchema(
        request_id='test-7',
        service='pos-demo',
        env='production',
        timestamp='2025-11-18T15:30:00.000Z',
        action='order_placed',
        level='info',
        message='Order processed',
        user_id='user-123',
        product_id='prod-456',
        price=999.99,
        quantity=2,
        error_code=None,
        app_version='1.0.0'
    )
    print('✅ Test 7 PASS: Valid with all optional fields')
    tests_passed += 1
except Exception as e:
    print(f'❌ Test 7 FAIL: {e}')
    tests_failed += 1

# Test 8: Wrong type for price
try:
    log = LogEventSchema(
        request_id='test-8',
        service='pos-demo',
        env='test',
        timestamp='2025-11-18T10:00:00.000Z',
        action='test',
        level='info',
        message='Test',
        price='not-a-number'
    )
    print('❌ Test 8 FAIL: Should have rejected non-numeric price')
    tests_failed += 1
except ValidationError:
    print('✅ Test 8 PASS: Correctly rejected non-numeric price')
    tests_passed += 1

# Test 9: Valid log levels
try:
    for level in ['debug', 'info', 'warn', 'error', 'critical']:
        log = LogEventSchema(
            request_id=f'test-level-{level}',
            service='pos-demo',
            env='test',
            timestamp='2025-11-18T10:00:00.000Z',
            action='test',
            level=level,
            message=f'Testing level {level}'
        )
    print('✅ Test 9 PASS: All valid log levels accepted')
    tests_passed += 1
except Exception as e:
    print(f'❌ Test 9 FAIL: {e}')
    tests_failed += 1

# Summary
print(f"\n{'='*50}")
print(f"Tests Passed: {tests_passed}")
print(f"Tests Failed: {tests_failed}")
print(f"{'='*50}")

if tests_failed == 0:
    print("✅ All schema validation tests passed!")
else:
    print(f"❌ {tests_failed} test(s) failed")
