/** No biometric samples, IDs, or provider payloads are persisted by this app. */
export interface AgeProvider {
  start(): Promise<{challengeId:string; instructions:string}>;
  verify(challengeId:string, assertion:string): Promise<boolean>;
}
/** Development simulation ONLY. Not age assurance. Never enable in public production. */
export class MockAgeProvider implements AgeProvider {
  private challenges = new Map<string,number>();
  async start() {
    const {randomUUID} = await import('node:crypto');
    const challengeId = randomUUID();
    this.challenges.set(challengeId,Date.now()+5*60_000);
    return {challengeId,instructions:'LOCAL DEMO ONLY: click Simulate 18+ approval. This does not verify your age.'};
  }
  async verify(challengeId:string, assertion:string) {
    const expires = this.challenges.get(challengeId);
    this.challenges.delete(challengeId);
    return Boolean(expires && expires>Date.now() && assertion==='MOCK_APPROVED');
  }
}
/** Replace with a vendor adapter using server-side signed token/webhook verification;
 * check signature, session binding, expiry, replay and provider evidence.
 * The vendor must host all biometric capture: never send images through this API.
 */
export function getAgeProvider():AgeProvider {
  if(process.env.NODE_ENV === 'production' || process.env.AGE_PROVIDER !== 'mock' || process.env.ALLOW_MOCK_AGE !== 'true') {
    throw new Error('A real age-assurance provider must be configured. Mock age checks are development-only.');
  }
  return new MockAgeProvider();
}