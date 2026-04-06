-- Migration: Dashboard statistics function (SECURITY DEFINER)

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_inbox_ids UUID[] DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'pending_review', (
            SELECT COUNT(*) FROM drafts
            WHERE status = 'pending_review'
            AND (p_inbox_ids IS NULL OR message_id IN (
                SELECT id FROM messages WHERE inbox_id = ANY(p_inbox_ids)
            ))
        ),
        'auto_sent_today', (
            SELECT COUNT(*) FROM drafts
            WHERE status = 'sent' AND sent_at >= CURRENT_DATE
            AND reviewed_by IS NULL
            AND (p_inbox_ids IS NULL OR message_id IN (
                SELECT id FROM messages WHERE inbox_id = ANY(p_inbox_ids)
            ))
        ),
        'approved_today', (
            SELECT COUNT(*) FROM drafts
            WHERE status IN ('approved', 'edited_approved', 'sent')
            AND reviewed_at >= CURRENT_DATE
            AND reviewed_by IS NOT NULL
            AND (p_inbox_ids IS NULL OR message_id IN (
                SELECT id FROM messages WHERE inbox_id = ANY(p_inbox_ids)
            ))
        ),
        'avg_tone_confidence', (
            SELECT COALESCE(AVG(tone_confidence), 0) FROM drafts
            WHERE created_at >= CURRENT_DATE
            AND (p_inbox_ids IS NULL OR message_id IN (
                SELECT id FROM messages WHERE inbox_id = ANY(p_inbox_ids)
            ))
        ),
        'avg_response_time_minutes', (
            SELECT COALESCE(
                AVG(EXTRACT(EPOCH FROM (d.sent_at - m.received_at)) / 60), 0
            )
            FROM drafts d
            JOIN messages m ON d.message_id = m.id
            WHERE d.sent_at >= CURRENT_DATE
            AND (p_inbox_ids IS NULL OR m.inbox_id = ANY(p_inbox_ids))
        ),
        'channel_counts', (
            SELECT json_object_agg(channel, cnt) FROM (
                SELECT channel, COUNT(*) as cnt
                FROM messages
                WHERE received_at >= CURRENT_DATE
                AND (p_inbox_ids IS NULL OR inbox_id = ANY(p_inbox_ids))
                GROUP BY channel
            ) sub
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
