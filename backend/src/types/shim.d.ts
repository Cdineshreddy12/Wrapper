declare module 'uuid' {
  export function v4(): string;
  export function v1(): string;
}

declare module '../utils/redis.js' {
  const _: unknown;
  export = _;
}

declare function getRedis(): { keys: (p: string) => Promise<string[]>; del: (k: string) => Promise<unknown>; hgetall: (k: string) => Promise<Record<string, string>> } | null;

declare module '@aws-sdk/client-route-53/dist-cjs/index.js' {
  import type { Route53ClientConfig } from '@aws-sdk/client-route-53';
  export class Route53Client {
    constructor(config: Route53ClientConfig);
    send: (command: unknown) => Promise<unknown>;
  }
  export class ChangeResourceRecordSetsCommand {}
  export class ListResourceRecordSetsCommand {}
  export class GetChangeCommand {}
  export class ListHostedZonesCommand {}
}
