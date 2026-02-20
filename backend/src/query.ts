import { entities } from './db/schema/organizations/unified-entities.js';
import { systemDbConnection } from './db/index.js';

async function retrieveCreditConfigurations(): Promise<void> {
  try {
    const result = (await systemDbConnection.select().from(entities)) as any;
    console.log('Result:', result);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error:', error);
  }
}
retrieveCreditConfigurations();
