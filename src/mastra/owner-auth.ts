import { SimpleAuth } from '@mastra/core/server';

const OWNER_ID = 'cogerentor-owner';
const ORGANIZATION_ID = 'cogerentor-personal';
const OWNER = {
  id: OWNER_ID,
  name: 'Owner',
  email: 'owner@factory.cogerentor.com',
  organizationId: ORGANIZATION_ID,
  role: 'owner',
};

/** Closed, single-owner deployment using Mastra's built-in token sign-in. */
export class OwnerAuth extends SimpleAuth<typeof OWNER> {
  constructor(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) {
      throw new Error('FACTORY_OWNER_TOKEN must be a generated 32-byte hexadecimal secret.');
    }
    const tokens = Object.create(null) as Record<string, typeof OWNER>;
    tokens[token] = OWNER;
    super({ name: 'Owner access', tokens });
  }

  async ensureOrganization(userId: string) {
    return userId === OWNER_ID ? ORGANIZATION_ID : undefined;
  }

  async isOrganizationAdmin(organizationId: string, userId: string) {
    return organizationId === ORGANIZATION_ID && userId === OWNER_ID;
  }

  override async signIn(email: string, password: string, request: Request) {
    const result = await super.signIn(email, password, request);
    return { ...result, cookies: result.cookies?.map(cookie => `${cookie}; Secure`) };
  }

  /** Factory's credential form uses the better-auth-shaped HTTP endpoints. */
  async handleAuthRequest(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    const origin = request.headers.get('Origin');
    if (origin && origin !== 'https://factory.cogerentor.com') {
      return Response.json({ message: 'Invalid origin' }, { status: 403 });
    }
    if (request.method === 'POST' && path === '/auth/api/sign-in/email') {
      if (origin !== 'https://factory.cogerentor.com') {
        return Response.json({ message: 'Origin required' }, { status: 403 });
      }
      try {
        const { email, password } = await request.json() as Record<string, unknown>;
        if (email !== OWNER.email || typeof password !== 'string') {
          return Response.json({ message: 'Invalid email or password' }, { status: 401 });
        }
        const result = await this.signIn(email, password, request);
        const headers = new Headers({ 'Cache-Control': 'no-store' });
        for (const cookie of result.cookies ?? []) headers.append('Set-Cookie', cookie);
        // The credential remains in the HttpOnly cookie, never in a JSON body.
        return Response.json({ user: result.user }, { headers });
      } catch {
        return Response.json({ message: 'Invalid email or password' }, { status: 401 });
      }
    }
    if (request.method === 'POST' && path === '/auth/api/sign-out') {
      return Response.json({ ok: true }, { headers: {
        'Set-Cookie': 'mastra-token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
        'Cache-Control': 'no-store',
      } });
    }
    return Response.json({ message: 'Not found' }, { status: 404 });
  }
}
