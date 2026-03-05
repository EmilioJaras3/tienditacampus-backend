/**
 * Consultas SQL para el módulo de Benchmarking
 * Extraído para cumplir con las mejores prácticas de de-hardcoding.
 */
export const BenchmarkingQueries = {
    DAILY_EXPORT: 'SELECT * FROM v_daily_export',
    RESET_STATEMENTS: 'SELECT pg_stat_statements_reset()',
    QUERY_METRICS: `
        SELECT 
            queryid::text as id,
            LEFT(query, 120) as query,
            calls,
            ROUND(total_exec_time::numeric, 2) as total_time_ms,
            ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
            rows as rows_returned,
            shared_blks_hit,
            shared_blks_read
        FROM pg_stat_statements
        WHERE calls > 0
        AND query NOT LIKE '%pg_stat_statements%'
        ORDER BY calls DESC
        LIMIT $1
    `
};
