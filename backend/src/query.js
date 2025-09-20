import { creditConfigurations } from './db/schema/credit_configurations.js';
import { eq, sql } from 'drizzle-orm';
import { systemDbConnection } from './db/index.js';
async function retrieveCreditConfigurations() {
  try {
   
    //fetched all the global credit configurations
      const result = await systemDbConnection 
      .select().from(creditConfigurations)
      .where(eq(creditConfigurations. isGlobal, true));

      //i want to find the duplicate operation codes in the result
      const duplicateOperationCodes = result.filter((item, index, self) =>
        self.findIndex(t => t.operationCode === item.operationCode) !== index
      );

      // //i want to update the global credit configurations costs of all operations in lead module
      // const updatedResult = await systemDbConnection
      //   .update(creditConfigurations)
      //   .set({ creditCost: '10.0000' })
      //   .where(sql`${creditConfigurations.operationCode} LIKE '%leads%'`)
      //   .where(eq(creditConfigurations.isGlobal, true))
      //   .returning();
      // console.log('✅ Updated result:', updatedResult);
      console.log('✅ Duplicate operation codes:', duplicateOperationCodes);

  } catch (error) {
    console.error('❌ Error fetching credit configurations:', error);
  } 
}
retrieveCreditConfigurations();