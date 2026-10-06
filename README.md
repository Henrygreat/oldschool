# GCUOBA Digital Alumni Network

A production-ready professional and social networking platform for Old Boys of Government College Umuahia.

## Product Overview

The GCUOBA Digital Alumni Network is a multi-tenant SaaS platform designed to help Old Boys quickly find, recognize, and reconnect with the people they attended Government College Umuahia with. The platform combines:

- Old Boys directory
- Social networking
- Professional networking
- Set communities
- House communities
- Chapters/branches
- Messaging
- GCU memories
- Association communications

## Technology Stack

- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript (strict mode)
- **UI:** React 19, Tailwind CSS, shadcn/ui
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** Auth.js (NextAuth v5)
- **Validation:** Zod
- **Containerization:** Docker

## Architecture

This is a modular monolith built as a multi-tenant SaaS platform from day one. While initially deployed for GCUOBA, the architecture supports multiple schools and alumni associations with strict tenant isolation.

### Key Architectural Principles

1. **Multi-tenant by design** - Every tenant-owned record is scoped to its school/association
2. **Configurable terminology** - School-specific branding and terms (e.g., "Set", "Old Boy") come from tenant data
3. **Discovery-first** - Optimized for the core use case: finding schoolmates
4. **Privacy-conscious** - Granular privacy controls and data protection
5. **Production-ready** - Built for deployment on Coolify/Docker/Hetzner

## Requirements

- Node.js 20+
- PostgreSQL 14+
- npm

## Local Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd GCUOBA
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/gcuoba
AUTH_SECRET=your-secret-key-minimum-32-characters
AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate a secure AUTH_SECRET:

```bash
openssl rand -base64 32
```

### 4. Set up PostgreSQL

Create the database:

```bash
createdb gcuoba
```

Or using psql:

```sql
CREATE DATABASE gcuoba;
```

### 5. Run Prisma migrations

```bash
npx prisma migrate dev
```

This will:
- Create the database schema
- Generate the Prisma Client

### 6. Seed the GCUOBA tenant

```bash
npx prisma db seed
```

This creates or reuses the GCUOBA tenant only. It does not create sample members or test accounts.

### 7. Start the development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

### Prisma Commands

- `npx prisma studio` - Open Prisma Studio (database GUI)
- `npx prisma migrate dev` - Create and apply migrations
- `npx prisma migrate deploy` - Apply migrations (production)
- `npx prisma generate` - Generate Prisma Client
- `npx prisma db seed` - Create or reuse the GCUOBA tenant

### Member profiles and directory

Member routes include `/dashboard`, `/directory`, `/profile/edit`, and
`/members/[id]`. Members edit their own profile using a five-step editor.
Directory filtering and pagination run through Prisma on the server. The
existing User, AlumniProfile, SchoolAttendance, Cohort, House, and
PrivacySetting models are reused; profile completion is calculated from
saved fields rather than stored redundantly.

Profile photos are uploaded through an authenticated server endpoint, validated
and converted to WebP, then stored in a private S3-compatible bucket such as
Cloudflare R2. The database stores only the object key; the application streams
images through a same-origin endpoint that checks the owner's photo visibility
for every request. Configure `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`,
`S3_ACCESS_KEY`, and `S3_SECRET_KEY` before enabling uploads. Keep public bucket
access disabled. Apply the additive migration
`prisma/migrations/20261005140000_profile_photo_key` before deploying this
feature. Existing HTTPS avatar URLs continue to display until replaced or
removed.

### Connections and alumni network

`/network` provides paginated connections, received and sent requests, following,
and followers, with counts, networking notifications, and bounded suggestions
based on shared sets, houses, chapters, visible location, and professional
interests. Connection and follow controls are also available on member profiles
and directory cards. All mutations use the authenticated member and verify that
the target is active in the same school; private profile fields continue to use
the existing privacy settings.

The existing `Connection`, `Follow`, and `Notification` models are reused, so
this feature does not require a database migration or new environment
variables. Directed duplicate requests and follows are guarded by their
existing unique constraints. Requests for either direction of the same member
pair are serialized with a PostgreSQL transaction-level advisory lock, so two
members cannot create simultaneous independent requests.

### Alumni archive, imports, and profile claims

School administrators can manage historical alumni records at `/admin/alumni`,
import `.csv` or `.xlsx` files, review probable duplicates before confirming an
import, and manually approve or reject member profile claims. Legacy `.xls`
files are not supported. Uploads are limited to 5 MiB and 10,000 data rows.
Imports preserve source row numbers and are transactional; previewing an import
does not write archive records. Unknown or deceased entries cannot be claimed
until an administrator marks them living. Approved claims link an archive
entry to a member without overwriting that member's profile.

Historical entries are searchable in the member directory and by Set. Contact
details, biographies, and remarks are restricted to school administrators and
are not included in public archive results. The additive migration is
`prisma/migrations/20261005220000_alumni_archive_claims`; apply it with
`npx prisma migrate deploy` before deploying the feature. No new environment
variables are required. Access is limited to active school administrators with
the school or national administrator roles.

### Applying the Phase 2 migration

The additive PostgreSQL migration is in
`prisma/migrations/20261005090000_add_members_only_visibility` and
`prisma/migrations/20261005090100_phase2_member_profiles`. It adds optional
contact and student-number columns, permits incomplete attendance years,
adds a privacy level and a directory ordering index, and preserves all existing rows.

Apply the migration against the production database before deploying code
that uses the new fields:

```bash
npx prisma migrate deploy
npx prisma db seed
```

Configure `DATABASE_URL` for that environment before running either command.
The seed only creates or reuses the GCUOBA School record; it does not add
sample alumni. Registration remains unavailable until that tenant record
exists. Do not run `prisma migrate reset` or `prisma db push` against
production.

Email, phone, city/country, employer, and LinkedIn visibility are enforced
server-side. Unset preferences default to members-only; existing
`OLD_BOYS_ONLY` preferences continue to mean members-only. The older
`CONNECTIONS_ONLY` level remains owner/admin-only; accepted networking
connections do not override field privacy.

## Database Schema

The schema includes comprehensive models for:

### Multi-tenant Core
- School, SchoolDomain, SchoolAdministrator

### Users & Authentication
- User, AlumniProfile

### School Structure
- SchoolAttendance, AcademicYear, Cohort (Set), House, ClassGroup, Chapter

### Professional
- Employment, Education, Skill

### Social
- Connection, Follow, Post, Reaction, Comment

### Messaging
- Conversation, ConversationParticipant, Message

### Admin
- VerificationRequest, Notification, Invitation, Report, AuditLog, PrivacySetting

## Docker

### Build the Docker image

```bash
docker build -t gcuoba-alumni-network .
```

### Run with Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: gcuoba
      POSTGRES_PASSWORD: your-password
      POSTGRES_DB: gcuoba
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://gcuoba:your-password@db:5432/gcuoba
      AUTH_SECRET: your-secret-key
      AUTH_URL: http://localhost:3000
      NEXT_PUBLIC_APP_URL: http://localhost:3000
    depends_on:
      - db

volumes:
  postgres_data:
```

Run:

```bash
docker-compose up
```

## Production Deployment

### Deployment Workflow

```
Local development → Git → GitHub → Coolify → Docker → Hetzner CX33
```

### Production Server Specs

- **Platform:** Hetzner CX33
- **CPU:** 4 vCPU (x86_64)
- **RAM:** 8 GB
- **Storage:** 80 GB SSD
- **OS:** Ubuntu
- **Orchestration:** Coolify

### Coolify Deployment

1. **Set up PostgreSQL resource in Coolify**
   - Create a persistent PostgreSQL database
   - Note the connection string

2. **Configure environment variables in Coolify**
   - DATABASE_URL
   - AUTH_SECRET (generate with `openssl rand -base64 32`)
   - AUTH_URL
   - NEXT_PUBLIC_APP_URL
   - S3 credentials (if using object storage)
   - SMTP credentials (if using email)

3. **Connect GitHub repository**
   - Set branch: `main`
   - Coolify will auto-deploy on push

4. **Build and deployment process**
   - Git push triggers build
   - Docker image builds
   - Prisma migrations run (`npx prisma migrate deploy`)
   - Health check runs (`/api/health`)
   - New version deploys with zero downtime

### Production Checklist

Before deploying to production:

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] All tests pass
- [ ] Environment variables configured
- [ ] AUTH_SECRET is strong and unique
- [ ] DATABASE_URL points to production database
- [ ] S3 bucket configured for file storage
- [ ] SMTP configured for emails

### Database Migrations

**Development:**
```bash
npx prisma migrate dev
```

**Production:**
```bash
npx prisma migrate deploy
```

Never use `prisma db push` in production.

### Health Check

The application exposes a health endpoint at `/api/health` that checks:
- Application status
- Database connectivity

Coolify uses this for health checks during deployment.

### Logs

All application logs go to stdout/stderr for Coolify to capture.

View logs in Coolify dashboard or via:

```bash
docker logs <container-id>
```

## Database Backups

### Automated Backups (Recommended)

Configure in Coolify or set up pg_dump cron:

```bash
0 2 * * * pg_dump -h localhost -U gcuoba gcuoba > /backups/gcuoba_$(date +\%Y\%m\%d).sql
```

### Manual Backup

```bash
pg_dump -h localhost -U gcuoba gcuoba > backup.sql
```

### Restore

```bash
psql -h localhost -U gcuoba gcuoba < backup.sql
```

## Rollback

If a deployment fails:

1. Coolify automatically keeps previous containers
2. Use Coolify dashboard to rollback
3. Or manually: `docker tag gcuoba:previous gcuoba:latest`

## Troubleshooting

### Build fails

- Check `npm run build` locally first
- Ensure all TypeScript errors are resolved
- Verify environment variables are set

### Database connection fails

- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Ensure network connectivity between containers

### Prisma Client errors

```bash
npx prisma generate
```

### Auth not working

- Verify AUTH_SECRET is set and at least 32 characters
- Check AUTH_URL matches your domain
- Ensure cookies are not blocked

## Implementation Phases

### Phase 1 - Foundation ✅
- Next.js, TypeScript, Tailwind, shadcn/ui
- Prisma, PostgreSQL
- Auth foundation
- Docker
- Environment configuration
- Health endpoint
- Base layouts
- GCUOBA landing page

### Phase 2 - Member profiles and directory
- Member registration, login, and logout
- Five-step profile editor and completion indicator
- Privacy-aware member profiles and directory
- Server-side search, filters, and pagination

### Future phases
- Find My Schoolmates
- Attendance overlap algorithm
- Match ranking
- Unit tests

### Phase 9 - Messaging and Notifications

### Phase 10 - Verification, Admin, Privacy, Audit

## Contributing

1. Create a feature branch
2. Make changes
3. Run tests and linting
4. Build successfully
5. Create pull request to `main`

## License

Proprietary - Government College Umuahia Old Boys Association

## Support

For issues and questions, contact the GCUOBA technical team.
