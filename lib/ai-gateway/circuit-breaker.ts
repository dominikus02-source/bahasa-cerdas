import { recordProviderFailure, recordProviderSuccess, getProviderHealth, shouldSkipProvider } from "./provider-guard";

export { recordProviderFailure, recordProviderSuccess, getProviderHealth, shouldSkipProvider };

export interface CircuitBreakerState {
  provider: string;
  healthy: boolean;
  degraded: boolean;
  inCooldown: boolean;
}

export function getCircuitBreakerState(provider: string): CircuitBreakerState {
  const health = getProviderHealth(provider);
  return {
    provider,
    healthy: health.healthy,
    degraded: health.degraded,
    inCooldown: health.cooldownUntil !== null && health.cooldownUntil > Date.now(),
  };
}
