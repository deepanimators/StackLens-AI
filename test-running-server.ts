import fetch from 'node-fetch';

async function testRunningServer() {
    const baseUrl = 'http://localhost:4000';

    console.log('Testing running server at', baseUrl);

    // 1. Login to get token
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'deepanimators', // Trying the user from logs
            password: 'admin123' // Guessing password based on auth.ts dev login
        })
    });

    let token;

    if (loginRes.ok) {
        const data = await loginRes.json();
        token = data.token;
        console.log('Login successful, token obtained');
    } else {
        console.log('Login failed, trying to register temp user');
        const regRes = await fetch(`${baseUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: `test_${Date.now()}`,
                email: `test_${Date.now()}@example.com`,
                password: 'password123'
            })
        });

        if (regRes.ok) {
            const data = await regRes.json();
            token = data.token;
            console.log('Registration successful, token obtained');
        } else {
            console.error('Registration failed', await regRes.text());
            return;
        }
    }

    // 2. Hit /api/auth/me
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (meRes.ok) {
        const data = await meRes.json();
        console.log('/api/auth/me response:', JSON.stringify(data, null, 2));

        if (data.user && !data.id) {
            console.log('✅ SUCCESS: Server is returning wrapped user object');
        } else if (data.id && !data.user) {
            console.log('❌ FAILURE: Server is returning raw user object (OLD CODE)');
        } else {
            console.log('❓ UNKNOWN: Unexpected response structure');
        }
    } else {
        console.error('/api/auth/me failed', meRes.status, await meRes.text());
    }
}

testRunningServer().catch(console.error);
