import assert from 'node:assert/strict';
import test from 'node:test';
import { OwnerAuth } from '../src/mastra/owner-auth.ts';

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
