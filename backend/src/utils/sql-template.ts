/**
 * SQL Template Utility
 * Provides a simple way to create SQL queries with proper escaping
 */

class SQLTemplate {
  queries: Map<string, unknown>;

  constructor() {
    this.queries = new Map();
  }

  /**
   * Create a SQL template with parameter placeholders
   */
  template(strings: TemplateStringsArray, ...values: unknown[]): string {
    let query = strings[0];

    for (let i = 0; i < values.length; i++) {
      // Simple parameter replacement
      // In production, use proper SQL parameterization
      const value = this.escapeValue(values[i]);
      query += value + strings[i + 1];
    }

    return query;
  }

  /**
   * Escape SQL values to prevent injection
   */
  escapeValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }

    if (typeof value === 'string') {
      // Escape single quotes by doubling them
      return `'${value.replace(/'/g, "''")}'`;
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    // For arrays, objects, etc., convert to JSON string
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }

  /**
   * Create a prepared statement-like query
   */
  prepare(query: string, params: unknown[] = []): { query: string; params: unknown[]; toString: () => string } {
    let paramIndex = 1;

    // Replace ? placeholders with $1, $2, etc.
    const preparedQuery = query.replace(/\?/g, () => {
      return `$${paramIndex++}`;
    });

    return {
      query: preparedQuery,
      params: params,
      toString: () => preparedQuery
    };
  }
}

// Export singleton instance
const sql = new SQLTemplate();
export { sql };
export default sql;
