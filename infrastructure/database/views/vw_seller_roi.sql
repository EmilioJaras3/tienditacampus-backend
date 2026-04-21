CREATE OR REPLACE VIEW vw_seller_roi AS
SELECT
    seller_id,
    SUM(total_investment) as global_investment,
    SUM(total_revenue) as global_revenue,
    (SUM(total_revenue) - SUM(total_investment)) as global_net_profit,
    CASE
        WHEN SUM(total_investment) > 0
        THEN ((SUM(total_revenue) - SUM(total_investment)) / SUM(total_investment)) * 100
        ELSE 0
    END as global_roi_pct
FROM
    daily_sales
GROUP BY
    seller_id;