-- Removes accounts and data created by the smoke test (e-mails ending in @volunteerhub.test).
DELETE FROM budget_items WHERE campaign_id IN (SELECT id FROM campaigns WHERE organizer_id IN (SELECT id FROM users WHERE email LIKE 'e2e-%@volunteerhub.test'));
DELETE FROM campaign_updates WHERE campaign_id IN (SELECT id FROM campaigns WHERE organizer_id IN (SELECT id FROM users WHERE email LIKE 'e2e-%@volunteerhub.test'));
DELETE FROM campaign_attachments WHERE campaign_id IN (SELECT id FROM campaigns WHERE organizer_id IN (SELECT id FROM users WHERE email LIKE 'e2e-%@volunteerhub.test'));
DELETE FROM campaign_views WHERE campaign_id IN (SELECT id FROM campaigns WHERE organizer_id IN (SELECT id FROM users WHERE email LIKE 'e2e-%@volunteerhub.test'));
DELETE FROM follows WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'e2e-%@volunteerhub.test') OR campaign_id IN (SELECT id FROM campaigns WHERE organizer_id IN (SELECT id FROM users WHERE email LIKE 'e2e-%@volunteerhub.test'));
DELETE FROM saves WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'e2e-%@volunteerhub.test');
DELETE FROM shares WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'e2e-%@volunteerhub.test');
DELETE FROM campaigns WHERE organizer_id IN (SELECT id FROM users WHERE email LIKE 'e2e-%@volunteerhub.test');
DELETE FROM xp_events WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'e2e-%@volunteerhub.test');
DELETE FROM user_achievements WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'e2e-%@volunteerhub.test');
DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'e2e-%@volunteerhub.test');
DELETE FROM files WHERE owner_id IN (SELECT id FROM users WHERE email LIKE 'e2e-%@volunteerhub.test');
DELETE FROM login_attempts WHERE key LIKE '%@volunteerhub.test';
DELETE FROM users WHERE email LIKE 'e2e-%@volunteerhub.test';
