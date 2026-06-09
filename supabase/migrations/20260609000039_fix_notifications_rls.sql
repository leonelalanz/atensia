-- Drop existing policies on notifications
DROP POLICY IF EXISTS "Users can read their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- SELECT: Allow users to read their own notifications
CREATE POLICY "notifications_select"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: Allow system to insert notifications (service role or authenticated users)
CREATE POLICY "notifications_insert"
  ON notifications FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- UPDATE: Allow users to update their own notifications
CREATE POLICY "notifications_update"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
