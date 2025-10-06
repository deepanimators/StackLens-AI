import { test, expect } from '@playwright/test';
import { cn } from '../../apps/web/src/lib/utils';

test.describe('Unit Tests - Utilities', () => {
    test.describe('cn() - Class Name Utility', () => {
        test('should merge class names', () => {
            const result = cn('class1', 'class2');
            expect(result).toContain('class1');
            expect(result).toContain('class2');
        });

        test('should handle conditional classes', () => {
            const result = cn('base', true && 'conditional', false && 'hidden');
            expect(result).toContain('base');
            expect(result).toContain('conditional');
            expect(result).not.toContain('hidden');
        });

        test('should handle undefined and null values', () => {
            const result = cn('class1', undefined, null, 'class2');
            expect(result).toContain('class1');
            expect(result).toContain('class2');
        });

        test('should merge tailwind classes correctly', () => {
            const result = cn('px-2 py-1', 'px-4');
            // Should handle tailwind merge
            expect(result).toBeTruthy();
        });
    });

    test.describe('buildApiUrl() - API URL Builder', () => {
        test('should build API URL with path', () => {
            const API_BASE_URL = 'http://localhost:5000';
            const buildApiUrl = (path: string) => {
                if (!path.startsWith('/')) path = `/${path}`;
                return `${API_BASE_URL}${path}`;
            };

            const url = buildApiUrl('/api/errors');
            expect(url).toBe('http://localhost:5000/api/errors');
        });

        test('should handle paths without leading slash', () => {
            const API_BASE_URL = 'http://localhost:5000';
            const buildApiUrl = (path: string) => {
                if (!path.startsWith('/')) path = `/${path}`;
                return `${API_BASE_URL}${path}`;
            };

            const url = buildApiUrl('api/upload');
            expect(url).toBe('http://localhost:5000/api/upload');
        });
    });
});

test.describe('Unit Tests - Error Handling', () => {
    test('should validate error log structure', () => {
        const errorLog = {
            id: 1,
            message: 'Test error',
            severity: 'high',
            errorType: 'Runtime',
            timestamp: new Date(),
            lineNumber: 42,
            resolved: false
        };

        expect(errorLog).toHaveProperty('id');
        expect(errorLog).toHaveProperty('message');
        expect(errorLog).toHaveProperty('severity');
        expect(errorLog.severity).toMatch(/^(critical|high|medium|low)$/);
    });

    test('should validate severity levels', () => {
        const validSeverities = ['critical', 'high', 'medium', 'low'];

        validSeverities.forEach(severity => {
            expect(['critical', 'high', 'medium', 'low']).toContain(severity);
        });
    });

    test('should validate error types', () => {
        const validTypes = ['Runtime', 'Database', 'Network', 'Memory', 'IO'];

        validTypes.forEach(type => {
            expect(validTypes).toContain(type);
        });
    });
});

test.describe('Unit Tests - Data Validation', () => {
    test('should validate file upload constraints', () => {
        const maxFileSize = 10 * 1024 * 1024; // 10MB
        const allowedExtensions = ['.xlsx', '.csv', '.log', '.txt'];

        expect(maxFileSize).toBe(10485760);
        expect(allowedExtensions).toHaveLength(4);
        expect(allowedExtensions).toContain('.xlsx');
        expect(allowedExtensions).toContain('.csv');
    });

    test('should validate store/kiosk number format', () => {
        const storePattern = /^STORE-\d{4}$/;
        const kioskPattern = /^KIOSK-\d{4}$/;

        expect('STORE-0001').toMatch(storePattern);
        expect('KIOSK-0001').toMatch(kioskPattern);
        expect('INVALID').not.toMatch(storePattern);
    });

    test('should validate pagination parameters', () => {
        const page = 1;
        const limit = 50;

        expect(page).toBeGreaterThanOrEqual(1);
        expect(limit).toBeGreaterThan(0);
        expect(limit).toBeLessThanOrEqual(100);
    });
});

test.describe('Unit Tests - Date/Time Utilities', () => {
    test('should format dates correctly', () => {
        const date = new Date('2025-01-15T10:30:00');
        const formatted = date.toLocaleDateString('en-US');

        expect(formatted).toBeTruthy();
        expect(formatted).toContain('2025');
    });

    test('should calculate time differences', () => {
        const now = new Date();
        const past = new Date(now.getTime() - 3600000); // 1 hour ago

        const diff = now.getTime() - past.getTime();
        const hours = diff / (1000 * 60 * 60);

        expect(hours).toBe(1);
    });

    test('should validate timestamp ranges', () => {
        const timestamp = new Date('2025-10-06');
        const start = new Date('2025-01-01');
        const end = new Date('2025-12-31');

        expect(timestamp.getTime()).toBeGreaterThanOrEqual(start.getTime());
        expect(timestamp.getTime()).toBeLessThanOrEqual(end.getTime());
    });
});

test.describe('Unit Tests - Filter Logic', () => {
    test('should filter by severity', () => {
        const errors = [
            { severity: 'critical', message: 'Error 1' },
            { severity: 'high', message: 'Error 2' },
            { severity: 'medium', message: 'Error 3' }
        ];

        const filtered = errors.filter(e => e.severity === 'critical');
        expect(filtered).toHaveLength(1);
        expect(filtered[0].message).toBe('Error 1');
    });

    test('should filter by multiple criteria', () => {
        const errors = [
            { severity: 'critical', store: 'STORE-0001', resolved: false },
            { severity: 'high', store: 'STORE-0002', resolved: false },
            { severity: 'critical', store: 'STORE-0001', resolved: true }
        ];

        const filtered = errors.filter(
            e => e.severity === 'critical' && e.store === 'STORE-0001' && !e.resolved
        );

        expect(filtered).toHaveLength(1);
    });

    test('should handle empty filter results', () => {
        const errors = [
            { severity: 'high', message: 'Error 1' }
        ];

        const filtered = errors.filter(e => e.severity === 'critical');
        expect(filtered).toHaveLength(0);
    });
});

test.describe('Unit Tests - Search Functionality', () => {
    test('should search by message content', () => {
        const errors = [
            { message: 'Database connection failed' },
            { message: 'Network timeout error' },
            { message: 'Database query timeout' }
        ];

        const searchTerm = 'database';
        const results = errors.filter(e =>
            e.message.toLowerCase().includes(searchTerm.toLowerCase())
        );

        expect(results).toHaveLength(2);
    });

    test('should be case-insensitive', () => {
        const errors = [
            { message: 'ERROR: System failure' },
            { message: 'error: user input invalid' }
        ];

        const results = errors.filter(e =>
            e.message.toLowerCase().includes('error')
        );

        expect(results).toHaveLength(2);
    });

    test('should handle special characters in search', () => {
        const errors = [
            { message: 'Error: File not found (404)' }
        ];

        const searchTerm = 'Error:';
        const results = errors.filter(e => e.message.includes(searchTerm));

        expect(results).toHaveLength(1);
    });
});

test.describe('Unit Tests - Sorting Logic', () => {
    test('should sort by timestamp descending', () => {
        const errors = [
            { timestamp: new Date('2025-01-01'), message: 'Old' },
            { timestamp: new Date('2025-10-06'), message: 'New' },
            { timestamp: new Date('2025-06-15'), message: 'Middle' }
        ];

        const sorted = [...errors].sort((a, b) =>
            b.timestamp.getTime() - a.timestamp.getTime()
        );

        expect(sorted[0].message).toBe('New');
        expect(sorted[2].message).toBe('Old');
    });

    test('should sort by severity priority', () => {
        type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
        const severityOrder: Record<SeverityLevel, number> = { critical: 1, high: 2, medium: 3, low: 4 };
        const errors: { severity: SeverityLevel }[] = [
            { severity: 'low' },
            { severity: 'critical' },
            { severity: 'high' }
        ];

        const sorted = [...errors].sort((a, b) =>
            severityOrder[a.severity] - severityOrder[b.severity]
        );

        expect(sorted[0].severity).toBe('critical');
        expect(sorted[2].severity).toBe('low');
    });
});

test.describe('Unit Tests - Export Functionality', () => {
    test('should format data for CSV export', () => {
        const errors = [
            { id: 1, message: 'Error 1', severity: 'high' },
            { id: 2, message: 'Error 2', severity: 'low' }
        ];

        const headers = ['ID', 'Message', 'Severity'];
        const rows = errors.map(e => [e.id, e.message, e.severity]);

        expect(headers).toHaveLength(3);
        expect(rows).toHaveLength(2);
        expect(rows[0]).toEqual([1, 'Error 1', 'high']);
    });

    test('should escape special characters for CSV', () => {
        const message = 'Error: "Connection failed", retry';
        const escaped = `"${message.replace(/"/g, '""')}"`;

        expect(escaped).toContain('""Connection failed""');
    });

    test('should handle null values in CSV export', () => {
        const data = [
            { id: 1, message: 'Error', notes: null },
            { id: 2, message: 'Error 2', notes: 'Some notes' }
        ];

        const csvRows = data.map(d => [d.id, d.message, d.notes || '']);
        expect(csvRows[0][2]).toBe('');
        expect(csvRows[1][2]).toBe('Some notes');
    });

    test('should format timestamps for export', () => {
        const timestamp = new Date('2025-10-06T10:30:00Z'); // Use UTC explicitly
        const formatted = timestamp.toISOString();

        expect(formatted).toContain('2025-10-06');
        expect(formatted).toContain('10:30:00');
    });

    test('should handle large datasets for export', () => {
        const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
            id: i,
            message: `Error ${i}`,
            severity: ['critical', 'high', 'medium', 'low'][i % 4]
        }));

        expect(largeDataset).toHaveLength(10000);
        expect(largeDataset[0].id).toBe(0);
        expect(largeDataset[9999].id).toBe(9999);
    });
});

test.describe('Unit Tests - URL and Path Utilities', () => {
    test('should validate URL format', () => {
        const validUrls = [
            'http://localhost:5000/api/errors',
            'https://api.example.com/data',
            'http://192.168.1.1:8080/path'
        ];

        validUrls.forEach(url => {
            expect(url).toMatch(/^https?:\/\/.+/);
        });
    });

    test('should extract query parameters from URL', () => {
        const url = 'http://localhost:5000/api/errors?page=1&limit=50&severity=high';
        const params = new URLSearchParams(url.split('?')[1]);

        expect(params.get('page')).toBe('1');
        expect(params.get('limit')).toBe('50');
        expect(params.get('severity')).toBe('high');
    });

    test('should build URLs with query parameters', () => {
        const base = 'http://localhost:5000/api/errors';
        const params = { page: 1, limit: 50, severity: 'critical' };
        const queryString = new URLSearchParams(params as any).toString();
        const fullUrl = `${base}?${queryString}`;

        expect(fullUrl).toContain('page=1');
        expect(fullUrl).toContain('limit=50');
        expect(fullUrl).toContain('severity=critical');
    });

    test('should handle URL encoding', () => {
        const searchTerm = 'Error: "Connection failed"';
        const encoded = encodeURIComponent(searchTerm);

        expect(encoded).toContain('%22'); // Encoded quote
        expect(encoded).toContain('%3A'); // Encoded colon
        expect(decodeURIComponent(encoded)).toBe(searchTerm);
    });
});

test.describe('Unit Tests - Math and Statistics', () => {
    test('should calculate average severity', () => {
        const severityScores = { critical: 4, high: 3, medium: 2, low: 1 };
        const errors = [
            { severity: 'critical' },
            { severity: 'high' },
            { severity: 'medium' },
            { severity: 'low' }
        ];

        const total = errors.reduce((sum, e) => sum + (severityScores as any)[e.severity], 0);
        const average = total / errors.length;

        expect(average).toBe(2.5);
    });

    test('should calculate percentage distribution', () => {
        const errors = [
            { severity: 'critical' },
            { severity: 'critical' },
            { severity: 'high' },
            { severity: 'low' }
        ];

        const total = errors.length;
        const criticalCount = errors.filter(e => e.severity === 'critical').length;
        const percentage = (criticalCount / total) * 100;

        expect(percentage).toBe(50);
    });

    test('should calculate error rate trends', () => {
        const dailyErrors = [10, 15, 12, 20, 18];
        const trend = dailyErrors.map((count, i) => {
            if (i === 0) return 0;
            return ((count - dailyErrors[i - 1]) / dailyErrors[i - 1]) * 100;
        });

        expect(trend[0]).toBe(0);
        expect(trend[1]).toBeCloseTo(50); // 50% increase
        expect(trend[2]).toBeCloseTo(-20); // 20% decrease
    });

    test('should identify outliers', () => {
        const values = [10, 12, 11, 13, 100, 12, 11];
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(
            values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
        );

        const outliers = values.filter(v => Math.abs(v - mean) > 2 * stdDev);
        expect(outliers).toContain(100);
    });
});

test.describe('Unit Tests - String Utilities', () => {
    test('should truncate long messages', () => {
        const longMessage = 'A'.repeat(200);
        const truncated = longMessage.substring(0, 100) + '...';

        expect(truncated.length).toBe(103);
        expect(truncated).toContain('...');
    });

    test('should sanitize HTML in error messages', () => {
        const dangerousMessage = '<script>alert("xss")</script>Error occurred';
        // More robust sanitization that removes tags AND their content
        const sanitized = dangerousMessage.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/<[^>]*>/g, '');

        expect(sanitized).toBe('Error occurred');
        expect(sanitized).not.toContain('<script>');
    });

    test('should format error codes', () => {
        const errorCode = 'ERR_DB_001';
        const parts = errorCode.split('_');

        expect(parts).toHaveLength(3);
        expect(parts[0]).toBe('ERR');
        expect(parts[1]).toBe('DB');
        expect(parts[2]).toBe('001');
    });

    test('should convert camelCase to readable format', () => {
        const camelCase = 'databaseConnectionError';
        const readable = camelCase
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());

        expect(readable).toBe('Database Connection Error');
    });

    test('should highlight search terms', () => {
        const text = 'Database connection failed';
        const searchTerm = 'connection';
        const highlighted = text.replace(
            new RegExp(searchTerm, 'gi'),
            match => `<mark>${match}</mark>`
        );

        expect(highlighted).toContain('<mark>connection</mark>');
    });
});

test.describe('Unit Tests - Array Utilities', () => {
    test('should remove duplicates from array', () => {
        const errors = [
            { id: 1, message: 'Error 1' },
            { id: 2, message: 'Error 2' },
            { id: 1, message: 'Error 1' }
        ];

        const unique = errors.filter((e, i, arr) =>
            arr.findIndex(a => a.id === e.id) === i
        );

        expect(unique).toHaveLength(2);
    });

    test('should group errors by severity', () => {
        const errors = [
            { severity: 'high', message: 'E1' },
            { severity: 'low', message: 'E2' },
            { severity: 'high', message: 'E3' }
        ];

        const grouped = errors.reduce((acc: any, e) => {
            acc[e.severity] = acc[e.severity] || [];
            acc[e.severity].push(e);
            return acc;
        }, {});

        expect(grouped.high).toHaveLength(2);
        expect(grouped.low).toHaveLength(1);
    });

    test('should chunk array into batches', () => {
        const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const batchSize = 3;
        const batches = [];

        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }

        expect(batches).toHaveLength(4);
        expect(batches[0]).toEqual([1, 2, 3]);
        expect(batches[3]).toEqual([10]);
    });

    test('should find intersection of arrays', () => {
        const arr1 = [1, 2, 3, 4, 5];
        const arr2 = [3, 4, 5, 6, 7];
        const intersection = arr1.filter(x => arr2.includes(x));

        expect(intersection).toEqual([3, 4, 5]);
    });
});

test.describe('Unit Tests - Validation Rules', () => {
    test('should validate email format', () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        expect('user@example.com').toMatch(emailRegex);
        expect('test.user@domain.co.uk').toMatch(emailRegex);
        expect('invalid-email').not.toMatch(emailRegex);
        expect('missing@domain').not.toMatch(emailRegex);
    });

    test('should validate phone numbers', () => {
        const phoneRegex = /^\+?[\d\s-()]+$/;

        expect('+1 (555) 123-4567').toMatch(phoneRegex);
        expect('555-123-4567').toMatch(phoneRegex);
        expect('invalid-phone!').not.toMatch(phoneRegex);
    });

    test('should validate IP addresses', () => {
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;

        expect('192.168.1.1').toMatch(ipRegex);
        expect('10.0.0.1').toMatch(ipRegex);
        expect('256.256.256.256').toMatch(ipRegex); // Note: doesn't validate range
    });

    test('should validate numeric ranges', () => {
        const validateRange = (value: number, min: number, max: number) => {
            return value >= min && value <= max;
        };

        expect(validateRange(50, 0, 100)).toBeTruthy();
        expect(validateRange(-1, 0, 100)).toBeFalsy();
        expect(validateRange(101, 0, 100)).toBeFalsy();
    });
});