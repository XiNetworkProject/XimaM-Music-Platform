-- scripts/delete_test_user.sql
-- Script pour supprimer l'utilisateur test (@testuser) de la base de données

-- 1. Rechercher l'utilisateur test
SELECT id, username, email, name FROM users WHERE username = 'testuser';

-- 2. Supprimer les données associées dans l'ordre (décommenter les lignes une par une)

-- Supprimer les likes
-- DELETE FROM likes WHERE user_id = (SELECT id FROM users WHERE username = 'testuser');

-- Supprimer les commentaires
-- DELETE FROM comments WHERE user_id = (SELECT id FROM users WHERE username = 'testuser');

-- Supprimer les écoutes
-- DELETE FROM plays WHERE user_id = (SELECT id FROM users WHERE username = 'testuser');

-- Supprimer les tracks de l'utilisateur
-- DELETE FROM tracks WHERE artist_id = (SELECT id FROM users WHERE username = 'testuser');

-- Supprimer les générations IA
-- DELETE FROM ai_generations WHERE user_id = (SELECT id FROM users WHERE username = 'testuser');

-- Supprimer les playlists
-- DELETE FROM playlists WHERE user_id = (SELECT id FROM users WHERE username = 'testuser');

-- Supprimer les follows (où l'utilisateur est follower ou following)
-- DELETE FROM follows WHERE follower_id = (SELECT id FROM users WHERE username = 'testuser') OR following_id = (SELECT id FROM users WHERE username = 'testuser');

-- Supprimer les notifications
-- DELETE FROM notifications WHERE user_id = (SELECT id FROM users WHERE username = 'testuser');

-- Supprimer les sessions
-- DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = 'testuser');

-- Supprimer les comptes
-- DELETE FROM accounts WHERE user_id = (SELECT id FROM users WHERE username = 'testuser');

-- 3. Enfin, supprimer l'utilisateur
-- DELETE FROM users WHERE username = 'testuser';

-- 4. Vérifier que l'utilisateur a été supprimé
-- SELECT * FROM users WHERE username = 'testuser';
