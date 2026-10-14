/** A local rejection with proof that no HTTP request reached the gateway. */
export class GatewayCallNotStartedError extends Error {
  constructor() {
    super('Gateway call was rejected before outbound');
  }
}
