-- Attach trigger to auto-create role + approval on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Allow superadmin to insert approvals (used by trigger via SECURITY DEFINER, but adding for completeness)
DROP POLICY IF EXISTS "superadmin inserts approvals" ON public.account_approvals;
CREATE POLICY "superadmin inserts approvals"
  ON public.account_approvals
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));
