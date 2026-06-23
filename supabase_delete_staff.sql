-- This script deletes all staff members created with the '@poker.local' fake domain.
-- This cleans up any corrupted staff accounts so you can start fresh.

-- (It will NOT delete any real email addresses, so your main Admin account is perfectly safe!)

DELETE FROM auth.users 
WHERE email LIKE '%@poker.local' AND email != 'admin1@poker.local' AND email != 'admin2@poker.local';
