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
}
