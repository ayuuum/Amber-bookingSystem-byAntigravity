-- Invitations table for staff/store manager invites
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  email text NOT NULL,
  token text UNIQUE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('store_admin', 'field_staff')),
  invited_by uuid REFERENCES auth.users(id) NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON public.invitations(organization_id);

-- RLS for invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view invitations for their organization
CREATE POLICY "Users can view org invitations" ON public.invitations
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy: HQ admins can create invitations
CREATE POLICY "HQ admins can create invitations" ON public.invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'hq_admin'
      AND organization_id = invitations.organization_id
    )
  );

-- Policy: HQ admins can update invitations
CREATE POLICY "HQ admins can update invitations" ON public.invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'hq_admin'
      AND organization_id = invitations.organization_id
    )
  );



