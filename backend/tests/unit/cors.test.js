import { describe, it, expect } from 'vitest';
import request from 'supertest';

process.env.CLIENT_URL = 'http://localhost:5173';
const { default: app } = await import('../../src/app.js');

// A browser asks permission first (OPTIONS) before any PUT/PATCH/DELETE.
// If the method is missing from the list the app shows "Could not reach the server".
describe('CORS preflight', () => {
  it.each(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])('allows %s from the app origin', async (method) => {
    const res = await request(app)
      .options('/api/receipts/opening')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', method);
    expect(res.headers['access-control-allow-methods']).toContain(method);
  });
});
