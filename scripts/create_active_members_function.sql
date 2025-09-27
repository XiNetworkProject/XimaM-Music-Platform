-- Fonction SQL pour calculer le nombre de membres actifs
-- Un membre actif est un utilisateur qui a posté ou répondu dans les 30 derniers jours

CREATE OR REPLACE FUNCTION get_active_members_count()
RETURNS INTEGER AS $$
DECLARE
    active_count INTEGER;
    thirty_days_ago TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculer la date d'il y a 30 jours
    thirty_days_ago := NOW() - INTERVAL '30 days';
    
    -- Compter les utilisateurs uniques qui ont posté ou répondu dans les 30 derniers jours
    SELECT COUNT(DISTINCT user_id) INTO active_count
    FROM (
        -- Utilisateurs ayant posté dans les 30 derniers jours
        SELECT user_id FROM forum_posts 
        WHERE created_at >= thirty_days_ago
        
        UNION
        
        -- Utilisateurs ayant répondu dans les 30 derniers jours
        SELECT user_id FROM forum_replies 
        WHERE created_at >= thirty_days_ago
    ) AS active_users;
    
    RETURN COALESCE(active_count, 0);
END;
$$ LANGUAGE plpgsql;
