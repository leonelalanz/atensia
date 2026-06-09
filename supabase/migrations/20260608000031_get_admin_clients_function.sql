-- RPC function to get admin's clients with company details
CREATE OR REPLACE FUNCTION get_admin_clients(p_admin_company_id uuid)
RETURNS TABLE(
  id uuid,
  client_company_id uuid,
  client_contact_name text,
  client_contact_email text,
  status text,
  company_name text,
  company_color text
) AS $$
SELECT
  cc.id,
  cc.client_company_id,
  cc.client_contact_name,
  cc.client_contact_email,
  cc.status,
  c.name,
  c.primary_color
FROM client_companies cc
INNER JOIN companies c ON c.id = cc.client_company_id
WHERE cc.admin_company_id = p_admin_company_id
ORDER BY c.name ASC;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_admin_clients(uuid) TO authenticated;
