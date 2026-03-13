import { and, eq } from 'drizzle-orm';
import { db, systemDbConnection } from '../../../db/index.js';
import { creditConfigurations } from '../../../db/schema/index.js';

export class CreditConfigRepository {
  static async getAllGlobalConfigs(): Promise<Array<typeof creditConfigurations.$inferSelect>> {
    return systemDbConnection
      .select()
      .from(creditConfigurations)
      .where(eq(creditConfigurations.isGlobal, true))
      .orderBy(creditConfigurations.operationCode);
  }

  static async getTenantOperationConfig(
    operationCode: string,
    tenantId: string
  ): Promise<typeof creditConfigurations.$inferSelect | null> {
    const [config] = await db
      .select()
      .from(creditConfigurations)
      .where(
        and(
          eq(creditConfigurations.operationCode, operationCode),
          eq(creditConfigurations.tenantId, tenantId),
          eq(creditConfigurations.isGlobal, false)
        )
      )
      .limit(1);
    return config ?? null;
  }

  static async getGlobalOperationConfig(
    operationCode: string
  ): Promise<typeof creditConfigurations.$inferSelect | null> {
    const [config] = await db
      .select()
      .from(creditConfigurations)
      .where(and(eq(creditConfigurations.operationCode, operationCode), eq(creditConfigurations.isGlobal, true)))
      .limit(1);
    return config ?? null;
  }
}
