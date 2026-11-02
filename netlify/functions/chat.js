/**
 * Serverless Zero-Auth AI Proxy Function for Netlify
 * Enables seamless AI chat without requiring user logins or credentials.
 * Compatible with Netlify Functions v1 and v2 runtimes.
 */

exports.handler = async (event, context) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const messages = body.messages || [];

        // Forward from server-side Node runtime (bypasses browser Cloudflare WAF checks)
        const upstream = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'SignLanguageStudio/1.0'
            },
            body: JSON.stringify({
                messages: messages,
                seed: Math.floor(Math.random() * 1000000)
            })
        });

        if (!upstream.ok) {
            const errText = await upstream.text();
            return {
                statusCode: upstream.status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: `Upstream error ${upstream.status}: ${errText}` })
            };
        }

        const reply = await upstream.text();
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ reply: reply.trim() })
        };

    } catch (err) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: err.message || 'Internal proxy error' })
        };
    }
};
