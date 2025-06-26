# HPE Audit Portal - Beta Release

A web application designed to facilitate, record, and report on audit workflows for datacenter operations. It streamlines the process of submitting, tracking, and generating reports for audits performed by internal users (typically datacenter technicians).

## Tech Stack

- **Frontend:** React with Grommet (HPE Design System)
- **Database:** Supabase
- **API:** Node.js API deployed as Netlify Functions
- **Hosting:** Netlify

## Features

1. **Audit Submission**
   - Submit new inspections via a dynamic form
   - Auto-generation of ID and timestamp
   - Collection of environmental readings and system checks

2. **Audit Listing**
   - View all submitted inspections
   - Filter and search capabilities
   - Sort by date, status, and more

3. **Report Generation**
   - View detailed reports for each inspection
   - Download reports for sharing
   - Track urgent issues across all inspections

## Local Development

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/mikaelcharbonneau/Audit-Portal-Alpha.git
   cd Audit-Portal-Alpha
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env.local` file in the root directory with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://osovotilbxkrurqbbrxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb3ZvdGlsYnhrcnVycWJicnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMDIyNDksImV4cCI6MjA2MjY3ODI0OX0.oCH9U2z4GpIOoLZpxJ0Li124idiWrV6nbbOKdO6NMtE
   SUPABASE_URL=https://osovotilbxkrurqbbrxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. Start the development server:
   ```
   npm run dev
   ```

## Database Setup

The application uses a single table in Supabase called `AuditReports` with the following schema:

```sql
CREATE TABLE "AuditReports" (
  "Id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "UserEmail" TEXT NOT NULL,
  "Timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ReportData" JSONB NOT NULL
);

-- Enable Row Level Security with policies that allow anyone to read/write
ALTER TABLE "AuditReports" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous select" ON "AuditReports" FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON "AuditReports" FOR INSERT WITH CHECK (true);
```

### Test Data

A test record has been added to the database to verify connectivity:

```sql
-- ID: e03d35dd-0f4d-4762-a5c4-a7bc2adefcf1
-- UserEmail: test@example.com
-- Timestamp: 2025-05-13T03:59:41.1802Z
-- ReportData: Contains sample inspection data for Hall A
```

## Deployment

This project is configured for deployment on Netlify at <https://hpedcaudit.netlify.app>.

1. Push your code to GitHub

2. Connect your GitHub repository to Netlify

3. Configure the following environment variables in Netlify:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
   - `VITE_SUPABASE_URL`: Your Supabase project URL (for frontend)
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key (for frontend)

4. Deploy the project

## API Endpoints

- `POST /api/SubmitInspection`: Accepts inspection data and stores it
- `GET /api/GetInspections`: Returns the latest 50 audits
- `GET /api/GenerateReport?id=<inspection_id>`: Returns details for a specific inspection

## License

This project is for internal HPE use only.
