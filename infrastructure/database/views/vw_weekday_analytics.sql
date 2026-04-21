CREATE OR REPLACE VIEW vw_weekday_analytics AS
SELECT
    seller_id,
    EXTRACT(DOW FROM CAST(sale_date AS DATE)) as weekday_index,
    TO_CHAR(CAST(sale_date AS DATE), 'Day') as weekday_name,
    AVG(total_revenue) as avg_revenue,
    AVG(total_investment) as avg_investment,
    SUM(units_sold) as total_units_sold,
    SUM(units_lost) as total_units_lost
FROM
    daily_sales
GROUP BY
    seller_id,
    weekday_index,
    weekday_name
ORDER BY
    seller_id,
    weekday_index;