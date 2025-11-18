import { Pool } from 'pg';

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://stacklens:password@localhost:5432/stacklens'
});

export const initDb = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS raw_logs (
        id SERIAL PRIMARY KEY,
        request_id UUID,
        trace_id TEXT,
        service TEXT,
        level TEXT,
        timestamp TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        issue_code TEXT,
        severity TEXT,
        suggested_fix TEXT,
        status TEXT DEFAULT 'new',
        jira_issue_key TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
        console.log('Database initialized');
    } catch (err) {
        console.error('Failed to init DB', err);
    } finally {
        client.release();
    }
};

export const persistLog = async (log: any) => {
    try {
        await pool.query(
            'INSERT INTO raw_logs (request_id, trace_id, service, level, timestamp) VALUES ($1, $2, $3, $4, $5)',
            [log.request_id, log.trace_id, log.service, log.level, log.timestamp]
        );
    } catch (err) {
        console.error('Failed to persist log to DB', err);
    }
};

export const persistAlert = async (alert: any) => {
    try {
        const res = await pool.query(
            'INSERT INTO alerts (issue_code, severity, suggested_fix, status) VALUES ($1, $2, $3, $4) RETURNING id',
            [alert.issue_code, alert.severity, alert.suggested_fix, 'new']
        );
        return res.rows[0].id;
    } catch (err) {
        console.error('Failed to persist alert', err);
    }
};
