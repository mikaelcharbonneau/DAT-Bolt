-- DAT-Bolt Azure PostgreSQL Schema
-- Converted from Supabase migrations for Azure Database for PostgreSQL

-- Note: Azure PostgreSQL doesn't have the auth schema like Supabase
-- We'll create our own user management system or integrate with Azure AD B2C

-- Azure PostgreSQL schema deployment
-- Using built-in PostgreSQL functions (no extensions needed)

-- Create enums
CREATE TYPE activity_type AS ENUM ('inspection', 'issue', 'report');
CREATE TYPE incident_severity AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE incident_status AS ENUM ('open', 'in-progress', 'resolved');

-- Create users table (replaces Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  encrypted_password text,
  full_name text,
  department text DEFAULT 'Data Center Operations',
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  is_active boolean DEFAULT true NOT NULL
);

-- Create indexes for users table
CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_created_at_idx ON users(created_at DESC);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  avatar_url text,
  phone text,
  department text NOT NULL DEFAULT 'Data Center Operations',
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create user_activities table
CREATE TABLE IF NOT EXISTS user_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type activity_type NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create user_stats table
CREATE TABLE IF NOT EXISTS user_stats (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  walkthroughs_completed integer DEFAULT 0 NOT NULL,
  issues_resolved integer DEFAULT 0 NOT NULL,
  reports_generated integer DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create AuditReports table (main table for audit data)
CREATE TABLE IF NOT EXISTS "AuditReports" (
  "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "UserEmail" text NOT NULL,
  "GeneratedBy" text,
  "Timestamp" timestamptz DEFAULT now() NOT NULL,
  "datacenter" text NOT NULL,
  "datahall" text NOT NULL,
  "issues_reported" integer DEFAULT 0 NOT NULL,
  "state" text DEFAULT 'Healthy' NOT NULL,
  "walkthrough_id" integer NOT NULL,
  "user_full_name" text NOT NULL,
  "ReportData" jsonb DEFAULT '{}' NOT NULL,
  CONSTRAINT state_check CHECK ("state" IN ('Healthy', 'Warning', 'Critical'))
);

-- Create incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location text NOT NULL,
  datahall text NOT NULL,
  description text NOT NULL DEFAULT '',
  severity incident_severity NOT NULL,
  status incident_status DEFAULT 'open' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  generated_by uuid REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  generated_at timestamptz DEFAULT now() NOT NULL,
  date_range_start timestamptz NOT NULL,
  date_range_end timestamptz NOT NULL,
  datacenter text,
  datahall text,
  status text NOT NULL DEFAULT 'draft',
  total_incidents integer DEFAULT 0 NOT NULL,
  report_data jsonb DEFAULT '{}' NOT NULL,
  CONSTRAINT status_check CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT type_check CHECK (status IN ('draft', 'published', 'archived'))
);

-- Create indexes for performance
-- AuditReports indexes
CREATE INDEX idx_audit_reports_timestamp ON "AuditReports"("Timestamp" DESC);
CREATE INDEX idx_audit_reports_datacenter ON "AuditReports"("datacenter");
CREATE INDEX idx_audit_reports_datahall ON "AuditReports"("datahall");
CREATE INDEX idx_audit_reports_state ON "AuditReports"("state");
CREATE INDEX idx_audit_reports_walkthrough_id ON "AuditReports"("walkthrough_id");
CREATE INDEX idx_audit_reports_user_email ON "AuditReports"("UserEmail");

-- User activities indexes
CREATE INDEX user_activities_user_id_idx ON user_activities(user_id);
CREATE INDEX user_activities_created_at_idx ON user_activities(created_at DESC);
CREATE INDEX user_activities_type_idx ON user_activities(type);

-- Incidents indexes
CREATE INDEX incidents_user_id_idx ON incidents(user_id);
CREATE INDEX incidents_status_idx ON incidents(status);
CREATE INDEX incidents_severity_idx ON incidents(severity);
CREATE INDEX incidents_created_at_idx ON incidents(created_at DESC);
CREATE INDEX incidents_description_idx ON incidents USING gin(to_tsvector('english', description));

-- Reports indexes
CREATE INDEX reports_generated_by_idx ON reports(generated_by);
CREATE INDEX reports_generated_at_idx ON reports(generated_at DESC);
CREATE INDEX reports_date_range_idx ON reports(date_range_start, date_range_end);
CREATE INDEX reports_status_idx ON reports(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create functions for common operations
-- Function to create or update user profile
CREATE OR REPLACE FUNCTION upsert_user_profile(
  p_user_id uuid,
  p_full_name text,
  p_department text DEFAULT 'Data Center Operations',
  p_phone text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO user_profiles (user_id, full_name, department, phone, avatar_url)
  VALUES (p_user_id, p_full_name, p_department, p_phone, p_avatar_url)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    full_name = EXCLUDED.full_name,
    department = EXCLUDED.department,
    phone = EXCLUDED.phone,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id uuid,
  p_type activity_type,
  p_description text
) RETURNS void AS $$
BEGIN
  INSERT INTO user_activities (user_id, type, description)
  VALUES (p_user_id, p_type, p_description);
  
  -- Update user stats
  IF p_type = 'inspection' THEN
    INSERT INTO user_stats (user_id, walkthroughs_completed)
    VALUES (p_user_id, 1)
    ON CONFLICT (user_id)
    DO UPDATE SET
      walkthroughs_completed = user_stats.walkthroughs_completed + 1,
      updated_at = now();
  ELSIF p_type = 'issue' THEN
    INSERT INTO user_stats (user_id, issues_resolved)
    VALUES (p_user_id, 1)
    ON CONFLICT (user_id)
    DO UPDATE SET
      issues_resolved = user_stats.issues_resolved + 1,
      updated_at = now();
  ELSIF p_type = 'report' THEN
    INSERT INTO user_stats (user_id, reports_generated)
    VALUES (p_user_id, 1)
    ON CONFLICT (user_id)
    DO UPDATE SET
      reports_generated = user_stats.reports_generated + 1,
      updated_at = now();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create view for user dashboard data
CREATE OR REPLACE VIEW user_dashboard AS
SELECT 
  u.id,
  u.email,
  up.full_name,
  up.department,
  us.walkthroughs_completed,
  us.issues_resolved,
  us.reports_generated,
  (
    SELECT COUNT(*) 
    FROM "AuditReports" ar 
    WHERE ar."UserEmail" = u.email 
    AND ar."Timestamp" >= CURRENT_DATE - INTERVAL '30 days'
  ) as recent_audits,
  (
    SELECT COUNT(*) 
    FROM incidents i 
    WHERE i.user_id = u.id 
    AND i.created_at >= CURRENT_DATE - INTERVAL '30 days'
  ) as recent_incidents
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_stats us ON u.id = us.user_id
WHERE u.is_active = true;

-- Note: Admin user creation removed due to Azure PostgreSQL limitations
-- Admin users should be created through the application after deployment
-- The application will handle password hashing using Node.js libraries

-- Add comments for documentation
COMMENT ON TABLE users IS 'Main users table replacing Supabase auth.users';
COMMENT ON TABLE user_profiles IS 'Extended user profile information';
COMMENT ON TABLE user_activities IS 'Log of user activities for audit trail';
COMMENT ON TABLE user_stats IS 'User statistics and metrics';
COMMENT ON TABLE "AuditReports" IS 'Main audit reports data';
COMMENT ON TABLE incidents IS 'Incident tracking and management';
COMMENT ON TABLE reports IS 'Generated reports and analytics';

COMMENT ON FUNCTION upsert_user_profile IS 'Creates or updates user profile information';
COMMENT ON FUNCTION log_user_activity IS 'Logs user activity and updates statistics';
COMMENT ON VIEW user_dashboard IS 'Consolidated view for user dashboard data';