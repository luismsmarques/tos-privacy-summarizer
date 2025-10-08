-- Optimized Database Indexes for ToS & Privacy Summarizer
-- Implements composite indexes and materialized views for better performance

-- Composite indexes for frequent queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_summaries_user_created_success 
ON summaries(user_id, created_at DESC, success) 
WHERE success = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_summaries_url_hash 
ON summaries USING hash(url);

-- Partial index for recent summaries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_summaries_recent 
ON summaries(created_at DESC) 
WHERE created_at > NOW() - INTERVAL '30 days';

-- Index for analytics by hour
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_hourly_composite 
ON performance_hourly(date DESC, hour DESC);

-- Index for text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_summaries_text_search 
ON summaries USING gin(to_tsvector('portuguese', summary));

-- Index for document type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_summaries_document_type 
ON summaries(document_type, created_at DESC);

-- Index for user activity patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_activity 
ON users(last_seen DESC, total_requests DESC);

-- Index for credits management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_credits 
ON users(credits, user_id) WHERE credits > 0;

-- Index for request logging
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_timestamp_status 
ON requests(timestamp DESC, status_code);

-- Index for user-specific request patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_user_timestamp 
ON requests(user_id, timestamp DESC) WHERE user_id IS NOT NULL;

-- Materialized views for heavy analytics queries
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_summaries,
    COUNT(CASE WHEN success = true THEN 1 END) as successful_summaries,
    COUNT(CASE WHEN success = false THEN 1 END) as failed_summaries,
    AVG(CASE WHEN success = true THEN duration END) as avg_duration,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(CASE WHEN document_type = 'privacy_policy' THEN 1 END) as privacy_policies,
    COUNT(CASE WHEN document_type = 'terms_of_service' THEN 1 END) as terms_of_service,
    COUNT(CASE WHEN document_type = 'unknown' THEN 1 END) as unknown_docs,
    AVG(CASE WHEN success = true THEN word_count END) as avg_word_count,
    AVG(CASE WHEN success = true THEN rating_complexidade END) as avg_complexity,
    AVG(CASE WHEN success = true THEN rating_boas_praticas END) as avg_good_practices,
    AVG(CASE WHEN success = true THEN risk_score END) as avg_risk_score
FROM summaries
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_daily_stats_date ON mv_daily_stats(date);

-- Materialized view for hourly performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_hourly_performance AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN status_code >= 200 AND status_code < 400 THEN 1 END) as successful_requests,
    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed_requests,
    AVG(duration) as avg_response_time,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration) as median_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) as p95_response_time,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips
FROM requests
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;

-- Index on hourly performance view
CREATE INDEX IF NOT EXISTS idx_mv_hourly_performance_hour ON mv_hourly_performance(hour);

-- Materialized view for user statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_stats AS
SELECT 
    user_id,
    COUNT(*) as total_summaries,
    COUNT(CASE WHEN success = true THEN 1 END) as successful_summaries,
    COUNT(CASE WHEN success = false THEN 1 END) as failed_summaries,
    AVG(CASE WHEN success = true THEN duration END) as avg_duration,
    MAX(created_at) as last_summary_date,
    MIN(created_at) as first_summary_date,
    COUNT(CASE WHEN document_type = 'privacy_policy' THEN 1 END) as privacy_policies,
    COUNT(CASE WHEN document_type = 'terms_of_service' THEN 1 END) as terms_of_service,
    AVG(CASE WHEN success = true THEN word_count END) as avg_word_count,
    AVG(CASE WHEN success = true THEN rating_complexidade END) as avg_complexity,
    AVG(CASE WHEN success = true THEN rating_boas_praticas END) as avg_good_practices,
    AVG(CASE WHEN success = true THEN risk_score END) as avg_risk_score
FROM summaries
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY user_id
HAVING COUNT(*) >= 1
ORDER BY total_summaries DESC;

-- Index on user stats view
CREATE INDEX IF NOT EXISTS idx_mv_user_stats_user_id ON mv_user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_mv_user_stats_total_summaries ON mv_user_stats(total_summaries DESC);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hourly_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_stats;
    
    -- Update statistics
    ANALYZE mv_daily_stats;
    ANALYZE mv_hourly_performance;
    ANALYZE mv_user_stats;
    
    RAISE NOTICE 'Analytics views refreshed successfully';
END;
$$ LANGUAGE plpgsql;

-- Function to get optimized analytics overview
CREATE OR REPLACE FUNCTION get_analytics_overview_optimized()
RETURNS TABLE (
    total_users bigint,
    total_summaries bigint,
    successful_summaries bigint,
    failed_summaries bigint,
    avg_duration numeric,
    today_summaries bigint,
    week_summaries bigint,
    month_summaries bigint,
    avg_complexity numeric,
    avg_good_practices numeric,
    avg_risk_score numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM summaries) as total_summaries,
        (SELECT COUNT(*) FROM summaries WHERE success = true) as successful_summaries,
        (SELECT COUNT(*) FROM summaries WHERE success = false) as failed_summaries,
        (SELECT AVG(duration) FROM summaries WHERE success = true) as avg_duration,
        (SELECT COUNT(*) FROM summaries WHERE created_at >= CURRENT_DATE) as today_summaries,
        (SELECT COUNT(*) FROM summaries WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_summaries,
        (SELECT COUNT(*) FROM summaries WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as month_summaries,
        (SELECT AVG(rating_complexidade) FROM summaries WHERE success = true AND rating_complexidade > 0) as avg_complexity,
        (SELECT AVG(rating_boas_praticas) FROM summaries WHERE success = true AND rating_boas_praticas > 0) as avg_good_practices,
        (SELECT AVG(risk_score) FROM summaries WHERE success = true AND risk_score > 0) as avg_risk_score;
END;
$$ LANGUAGE plpgsql;

-- Function to get optimized user summaries with pagination
CREATE OR REPLACE FUNCTION get_user_summaries_optimized(
    p_user_id varchar,
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id integer,
    summary_id varchar,
    user_id varchar,
    url text,
    title text,
    document_type varchar,
    success boolean,
    duration integer,
    text_length integer,
    word_count integer,
    summary text,
    processing_time numeric,
    rating_complexidade integer,
    rating_boas_praticas integer,
    risk_score integer,
    created_at timestamp,
    updated_at timestamp
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id, s.summary_id, s.user_id, s.url, s.title, s.document_type,
        s.success, s.duration, s.text_length, s.word_count, s.summary,
        s.processing_time, s.rating_complexidade, s.rating_boas_praticas,
        s.risk_score, s.created_at, s.updated_at
    FROM summaries s
    WHERE s.user_id = p_user_id
    ORDER BY s.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get popular summaries
CREATE OR REPLACE FUNCTION get_popular_summaries(
    p_days integer DEFAULT 7,
    p_limit integer DEFAULT 50
)
RETURNS TABLE (
    url text,
    title text,
    document_type varchar,
    frequency bigint,
    avg_duration numeric,
    last_created timestamp,
    avg_complexity numeric,
    avg_good_practices numeric,
    avg_risk_score numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.url,
        s.title,
        s.document_type,
        COUNT(*) as frequency,
        AVG(s.duration) as avg_duration,
        MAX(s.created_at) as last_created,
        AVG(s.rating_complexidade) as avg_complexity,
        AVG(s.rating_boas_praticas) as avg_good_practices,
        AVG(s.risk_score) as avg_risk_score
    FROM summaries s
    WHERE s.created_at > NOW() - (p_days || ' days')::interval
    AND s.success = true
    GROUP BY s.url, s.title, s.document_type
    HAVING COUNT(*) >= 2
    ORDER BY frequency DESC, last_created DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get user activity patterns
CREATE OR REPLACE FUNCTION get_user_activity_patterns(
    p_user_id varchar,
    p_days integer DEFAULT 30
)
RETURNS TABLE (
    document_type varchar,
    count bigint,
    last_activity timestamp,
    avg_duration numeric,
    avg_complexity numeric,
    avg_good_practices numeric,
    avg_risk_score numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.document_type,
        COUNT(*) as count,
        MAX(s.created_at) as last_activity,
        AVG(s.duration) as avg_duration,
        AVG(s.rating_complexidade) as avg_complexity,
        AVG(s.rating_boas_praticas) as avg_good_practices,
        AVG(s.risk_score) as avg_risk_score
    FROM summaries s
    WHERE s.user_id = p_user_id
    AND s.created_at > NOW() - (p_days || ' days')::interval
    GROUP BY s.document_type
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
DECLARE
    deleted_summaries integer;
    deleted_requests integer;
BEGIN
    -- Delete old summaries (older than 1 year)
    DELETE FROM summaries 
    WHERE created_at < NOW() - INTERVAL '1 year';
    GET DIAGNOSTICS deleted_summaries = ROW_COUNT;
    
    -- Delete old requests (older than 6 months)
    DELETE FROM requests 
    WHERE timestamp < NOW() - INTERVAL '6 months';
    GET DIAGNOSTICS deleted_requests = ROW_COUNT;
    
    -- Vacuum analyze tables
    VACUUM ANALYZE summaries;
    VACUUM ANALYZE requests;
    
    RAISE NOTICE 'Cleanup completed: % summaries, % requests deleted', deleted_summaries, deleted_requests;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job to refresh materialized views (if pg_cron is available)
-- SELECT cron.schedule('refresh-analytics', '*/15 * * * *', 'SELECT refresh_analytics_views();');

-- Create scheduled job to cleanup old data (if pg_cron is available)
-- SELECT cron.schedule('cleanup-old-data', '0 2 * * 0', 'SELECT cleanup_old_data();');

-- Grant permissions
GRANT EXECUTE ON FUNCTION refresh_analytics_views() TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_analytics_overview_optimized() TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_summaries_optimized(varchar, integer, integer) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_popular_summaries(integer, integer) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_activity_patterns(varchar, integer) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_old_data() TO PUBLIC;
