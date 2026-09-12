import assert from 'node:assert/strict';
import test from 'node:test';
import { OwnerAuth } from '../src/mastra/owner-auth.ts';
import { enableOwnerForm } from '../scripts/prepare-owner-signin.mjs';

const token = 'a'.repeat(64);
const request = new Request('https://factory.cogerentor.com/auth/signin');
test('requires a high-entropy-shaped owner key', () => {
  for (const invalid of ['', 'password', 'a'.repeat(63), 'g'.repeat(64)]) {
    assert.throws(() => new OwnerAuth(invalid));
  }
});
test('only the configured token authenticates, including object prototype names', async () => {
  const auth = new OwnerAuth(token);
  for (const invalid of ['', 'wrong', '__proto__', 'constructor', 'toString']) {
    assert.equal(await auth.authenticateToken(invalid, request), null);
    await assert.rejects(auth.signIn('owner', invalid, request));
  }
  const user = await auth.authenticateToken(token, request);
  assert.equal(user.id, 'cogerentor-owner');
  assert.equal(await auth.authorizeUser(user, request), true);
});
test('login cookie is HTTPS-only; registration is closed', async () => {
  const auth = new OwnerAuth(token);
  const result = await auth.signIn('owner', token, request);
  assert.ok(result.cookies.every(cookie => cookie.includes('Secure') && cookie.includes('HttpOnly') && cookie.includes('SameSite=Lax')));
  assert.equal(auth.isSignUpEnabled(), false);
  await assert.rejects(auth.signUp());
});
test('organization privileges are restricted to the one owner and org', async () => {
  const auth = new OwnerAuth(token);
  assert.equal(await auth.ensureOrganization('cogerentor-owner'), 'cogerentor-personal');
  assert.equal(await auth.ensureOrganization('foreign'), undefined);
  assert.equal(await auth.isOrganizationAdmin('cogerentor-personal', 'cogerentor-owner'), true);
  assert.equal(await auth.isOrganizationAdmin('other', 'cogerentor-owner'), false);
  assert.equal(await auth.isOrganizationAdmin('cogerentor-personal', 'other'), false);
});

test('Factory browser login sets a secure cookie without returning the secret', async () => {
  const auth = new OwnerAuth(token);
  const login = (password, origin = 'https://factory.cogerentor.com', email = 'owner@factory.cogerentor.com') => new Request(
    'https://factory.cogerentor.com/auth/api/sign-in/email', {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  const response = await auth.handleAuthRequest(login(token));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.user.id, 'cogerentor-owner');
  assert.ok(!JSON.stringify(body).includes(token));
  assert.match(response.headers.get('Set-Cookie'), /HttpOnly; SameSite=Lax; Max-Age=86400; Secure/);
  assert.equal((await auth.handleAuthRequest(login(token, 'https://evil.example'))).status, 403);
  assert.equal((await auth.handleAuthRequest(login(token, ''))).status, 403);
  assert.equal((await auth.handleAuthRequest(login(token, undefined, 'other@example.com'))).status, 401);
  assert.equal((await auth.handleAuthRequest(login('constructor'))).status, 401);
  assert.equal((await auth.handleAuthRequest(new Request('https://factory.cogerentor.com/auth/api/sign-up/email', { method: 'POST' }))).status, 404);
  const logout = await auth.handleAuthRequest(new Request('https://factory.cogerentor.com/auth/api/sign-out', { method: 'POST' }));
  assert.match(logout.headers.get('Set-Cookie'), /Secure; SameSite=Lax; Max-Age=0/);
});

test('UI compatibility change is exact and fails closed when upstream changes', () => {
  const source = 'const u=((g=t.data)==null?void 0:g.provider)==="better-auth",f=other;';
  assert.match(enableOwnerForm(source), /\["better-auth","Owner access"\]\.includes/);
  assert.throws(() => enableOwnerForm('unknown upstream'));
  assert.throws(() => enableOwnerForm(source + source));
});
