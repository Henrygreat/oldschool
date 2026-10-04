# GCUOBA Digital Alumni Network --- Master Build Specification

## 1. Product Identity

**Organisation:** Government College Umuahia Old Boys Association\
**Short name:** GCUOBA\
**School:** Government College Umuahia (GCU), Umuahia, Abia State,
Nigeria\
**Working product name:** GCUOBA Digital Alumni Network

Build a production-ready professional and social networking platform for
Old Boys of Government College Umuahia.

The product should combine: - Old Boys directory - Social networking -
Professional networking - Set communities - House communities -
Chapters/branches - Messaging - GCU memories - Association
communications

The central product goal is:

> Help an Old Boy quickly find, recognise and reconnect with the people
> he attended Government College Umuahia with.

Do not copy LinkedIn's branding, proprietary UI, wording, or assets.
Create an original premium identity for GCUOBA.

The emotional experience should combine nostalgia,
brotherhood/community, professional networking, and giving back.

## 2. Critical Product Principle

Whenever there is a choice between adding another generic social-network
feature and improving Old Boy discovery, prioritise discovery.

The moment we are optimising for is:

> "I just joined and I have already found people I have not seen since
> GCU."

The platform should answer:

> "Where are the boys I went to GCU with?"

within minutes of registration.

## 3. Core User Journey

1.  User visits the GCUOBA platform.
2.  User creates an account.
3.  User enters his GCU attendance information.
4.  User selects entry year, leaving year, Set, House, and class
    information where applicable.
5.  User completes personal and professional information.
6.  User submits Old Boy status for verification.
7.  The system identifies Old Boys whose attendance overlaps.
8.  The user sees a result such as: "We found 74 Old Boys who may have
    attended GCU with you."
9.  User views profiles and sends connection requests.
10. User reconnects, messages schoolmates, joins Set/Chapter
    communities, and participates in GCUOBA.

After onboarding, redirect the user to **Find My Schoolmates**, not a
generic feed.

## 4. Target Scale and Architecture

Initial deployment: - One organisation: GCUOBA - Approximately
1,000--2,000 Old Boys initially

However, build the software as a **multi-tenant SaaS platform from day
one** so it can later serve other schools and alumni associations.

Do not over-engineer for millions of users. Build a clean modular
monolith.

Do not hard-code Government College Umuahia into core business logic.
School-specific branding, terminology, houses, Sets, chapters, and
configuration must come from tenant data.

Future examples: - `alumni.schoola.org` - `schoola.platform.com`

Strict tenant isolation is mandatory.

## 5. GCUOBA Terminology

For the GCUOBA tenant, prefer: - **Old Boy / Old Boys** rather than
generic alumnus/alumni where appropriate - **Set** rather than
Graduation Year - **Schoolmates** rather than People You May Know -
**GCUOBA Directory** rather than Alumni Directory - **GCUOBA Network**
rather than generic Professional Network

Terminology must be configurable per tenant.

Internally, generic model names such as `AlumniProfile` or `Cohort` are
acceptable, but the UI must use the tenant's terminology.

## 6. Technology Stack

Use: - Next.js - TypeScript - React - PostgreSQL - Prisma ORM - Tailwind
CSS - shadcn/ui - Auth.js - Zod - Docker

Use current stable, mutually compatible versions.

Use: - Server Components where appropriate - Server Actions where
appropriate - Route Handlers/API routes where appropriate

Architecture: modular monolith. Do not create unnecessary microservices.

## 7. Production Deployment

Production workflow:

Local development → Git → GitHub → Coolify → Docker → Hetzner CX33

Production server: - x86_64 - 4 vCPU - 8 GB RAM - 80 GB SSD - Ubuntu -
Coolify

PostgreSQL must run as a separate persistent Coolify resource.

The application container must be disposable. Never store persistent
user data in the application container.

Production branch: `main`.

Expected deployment: 1. `git push origin main` 2. GitHub receives commit
3. Coolify detects change 4. Docker image builds 5. Prisma migrations
run 6. Health check runs 7. New version deploys

Every production version must pass: - `npm run lint` -
`npm run typecheck` - tests where applicable - `npm run build`

## 8. Docker Requirements

Create: - production-quality multi-stage `Dockerfile` - `.dockerignore`

Configure Next.js standalone output where appropriate.

Use an official Node image compatible with x86_64.

Do not run the production application as root where avoidable.

Logs must go to stdout/stderr for Coolify.

Create:

`GET /api/health`

The health endpoint should confirm: - application is running - database
is reachable

without exposing secrets or sensitive details.

## 9. Environment Variables

Never hard-code secrets.

Create `.env.example` containing at least:

``` env
DATABASE_URL=

AUTH_SECRET=
AUTH_URL=
NEXT_PUBLIC_APP_URL=

S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=

EMAIL_FROM=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
```

Do not commit: - `.env` - `.env.local` - `.env.production`

## 10. Prisma and Database Migrations

Use Prisma migrations.

Development: `prisma migrate dev`

Production: `prisma migrate deploy`

Do not use `prisma db push` as the normal production migration strategy.

Commit migrations to Git.

## 11. Core Database Architecture

Important models should include:

-   School
-   SchoolDomain
-   SchoolAdministrator
-   User
-   AlumniProfile
-   SchoolAttendance
-   AcademicYear
-   Cohort / Set
-   House
-   ClassGroup
-   Chapter
-   ChapterMember
-   Employment
-   Education
-   Skill
-   Connection
-   Follow
-   Post
-   PostMedia
-   Reaction
-   Comment
-   Conversation
-   ConversationParticipant
-   Message
-   VerificationRequest
-   Notification
-   Invitation
-   Report
-   AuditLog
-   PrivacySetting

Design appropriate: - foreign keys - unique constraints - indexes -
timestamps - soft deletion where appropriate

Every tenant-owned record must be correctly scoped to its
school/association.

## 12. School Attendance Model

This is critical.

Do not store Set, House, and Class as arbitrary strings throughout the
user profile.

Use relational entities.

Conceptually:

School - Academic Years - Sets/Cohorts - Houses - Class Groups -
Chapters

User - AlumniProfile - SchoolAttendance - schoolId - entry year -
leaving year - set/cohortId - houseId - classGroupId

This structure powers discovery.

School structures may have changed historically, so administrators must
be able to configure houses, Sets, classes, academic years, and
historical naming conventions.

## 13. Authentication

Initially support secure email/password authentication.

Design the auth layer so Google, Microsoft, and Apple can be added
later.

Include: - registration - login - logout - forgot password - reset
password - email verification - session management

Passwords must be securely hashed.

Use secure cookies and protect authenticated routes.

Implement appropriate rate limiting.

## 14. Old Boy Onboarding

Create a polished mobile-first multi-step onboarding wizard.

### Step 1 --- Personal Information

-   First name
-   Middle name optional
-   Surname
-   Former/other surname optional
-   Nickname optional
-   Profile photo

### Step 2 --- GCU History

-   Year entered Government College Umuahia
-   Year left
-   Set
-   House
-   Class information where applicable

These values must come from configurable database records.

### Step 3 --- Where Are You Now?

-   City
-   Country

Never request an exact home address.

### Step 4 --- Professional Information

-   Profession
-   Job title
-   Company/organisation
-   Industry
-   University/higher education
-   Professional interests

### Step 5 --- Profile

-   Short biography

### Step 6 --- Chapter

Allow selection/request to join an appropriate GCUOBA chapter if
configured.

### Step 7 --- Privacy

Configure visibility.

### Step 8 --- Verification

Submit Old Boy status for verification.

After completion, redirect to **Find My Schoolmates**.

## 15. Find My Schoolmates

This is the most important feature.

Build a matching algorithm.

Ranking should consider:

1.  Same Set + same House = highest confidence
2.  Same Set = very high
3.  Same House + strong attendance overlap = high
4.  Same class = high
5.  5+ years attendance overlap = strong
6.  3--4 years overlap = medium
7.  1--2 years overlap = possible

Do not claim users definitely knew one another.

Use language such as: - "You may know" - "You may have attended GCU
together" - "You overlapped for 5 years"

Example:

**Find My Schoolmates**

We found 74 Old Boys who may have attended Government College Umuahia
with you.

-   28 are from your Set
-   14 are from your House
-   9 currently live in the United Kingdom

Each card should show: - Photo - Name - Set - House - Current
role/location when permitted - Match reason - View Profile - Connect

The classmate matching algorithm must have unit tests.

## 16. GCUOBA Directory

Route: `/directory`

Create a powerful searchable Old Boys directory.

Search/filter by: - name - nickname - former/other surname - Set -
House - entry year - leaving year - class - profession - job title -
company - industry - university - city - country - chapter - skills

Filters must be combinable.

Examples: - "1998 Set" - "Old Boys in London" - "Doctors from GCU" -
"GCU Old Boys working in technology" - "1990 Set in the United States" -
"Old Boys from my House"

Use server-side querying and pagination. Never load the whole directory
into the browser.

## 17. Sets

Sets are a first-class part of the product.

Every Set should have a page, for example:

`/sets/1998`

Display: - Set name/year - registered Old Boys count - members - posts -
photos - announcements - events later

The UI should use "Set" for GCUOBA while the underlying data model
remains configurable.

## 18. Houses

Each Old Boy may be associated with a House for his attendance period.

House pages can later support: - members - memories - posts - historical
information

Do not invent GCU house names. Seed/admin configuration should use
verified data or clearly fictional development values until real house
data is supplied.

## 19. Chapters / Branches

Chapters are important to GCUOBA and belong in the MVP.

Do not hard-code chapter names.

Administrators create and manage chapters.

Chapter fields: - name - country - region/state - city - description -
leadership - contact information - active status

Old Boys can request/join chapters according to permissions.

Chapter pages should support: - members - announcements - posts - events
later

## 20. Old Boy Profile

Route: `/old-boys/[username]` or another clean configurable route.

Profile should include:

-   Cover area
-   Profile photo
-   Full name
-   Verified Old Boy badge
-   Set
-   House
-   Current role
-   Company
-   City/country
-   Chapter
-   Connect button
-   Message button

Sections: - About - GCU History - Professional Experience - Education -
Skills - GCUOBA/Chapter involvement - Connections - Recent Activity

Privacy settings must determine what other users can see.

## 21. Connection System

Users can send connection requests.

States: - PENDING - ACCEPTED - DECLINED - BLOCKED

Prevent duplicate requests.

Create **My Network** containing: - Connections - Pending requests -
Sent requests - Schoolmates you may know - My Set - My House - My
Chapter

## 22. Activity Feed

Route: `/home`

Create a basic social feed.

Users can create posts with: - text - image

Users can: - react - comment - delete their own posts - report
inappropriate content

Feed priority should favour: - connections - schoolmates - same Set -
same House - same Chapter - official GCUOBA announcements

Keep MVP ranking deterministic and simple.

## 23. Messaging

Route: `/messages`

Support: - conversation list - one-to-one conversations - text
messages - timestamps - unread status - blocking - reporting

Messaging permissions must respect privacy controls.

Do not build voice/video calling.

## 24. Verification

Verification statuses: - UNVERIFIED - PENDING - VERIFIED - REJECTED

Admins can: - review - approve - reject - add private internal notes

Store: - reviewedBy - reviewedAt - status

Keep evidence private.

Verified Old Boys receive a visible badge.

Design verification architecture so methods can later include: -
existing association records - administrator approval - trusted Old Boy
confirmation - supporting records

## 25. Privacy

Users should control visibility of: - email - phone - city - country -
employment - education - profile - connections

Visibility options: - PUBLIC - OLD_BOYS_ONLY - CONNECTIONS_ONLY -
PRIVATE

Never expose: - passwords - private verification evidence - exact home
addresses - internal moderation information

Support: - account deletion - data export architecture - consent -
privacy settings

Follow appropriate data-protection principles, including UK GDPR
considerations where relevant to UK-based members.

## 26. GCUOBA Administration

Route: `/admin`

Potential roles: - SUPER_ADMIN - NATIONAL_ADMIN - SCHOOL_ADMIN -
CHAPTER_ADMIN - SET_ADMIN - MODERATOR - MEMBER

Permissions must be granular.

A Set Admin must not automatically have national permissions.

A Chapter Admin should manage only their chapter unless explicitly
granted wider access.

Dashboard metrics: - Total Old Boys - Verified Old Boys - Pending
verification - New registrations - Active users - Connections - Posts -
Sets represented - Chapters represented - Countries represented

Management: - Old Boys - Verification requests - Sets - Houses -
Classes - Chapters - Posts - Reports - Administrators

Important admin actions must create an `AuditLog`.

## 27. Invitations and Growth

Build an invitation system.

Example:

**Help us rebuild the 1998 Set**

48 Old Boys joined.

\[Invite Schoolmates\]

MVP: - copy invitation link

Architect for later: - email - WhatsApp - SMS

Never expose contact details of people who have not registered.

## 28. Notifications

Support notifications for: - connection requests - accepted
connections - messages - comments - reactions - verification status -
Old Boys from user's Set joining - chapter announcements - GCUOBA
announcements

Keep architecture extensible for email/push notifications later.

## 29. Landing Page

Create a premium GCUOBA public landing page.

Suggested hero:

**GCUOBA**

**Government College Umuahia Old Boys Association**

**Reconnect with your schoolmates. Strengthen old bonds. Build new
ones.**

Join Old Boys of Government College Umuahia from across generations and
around the world.

Primary CTA: **Join the GCUOBA Network**

Secondary CTA: **Find Old Boys**

Sections: - Find Your Set - Find Your Schoolmates - GCUOBA Around the
World - Professional Network - Memories - Chapters - Give Back ---
coming later - Events --- coming later

Do not fabricate official GCUOBA history, statistics, logos, colours,
slogans, leadership, house names, or chapter names. Use configurable
placeholders until verified information/assets are supplied.

## 30. Main Navigation

Desktop:

\[GCUOBA Logo\]

-   Home
-   Old Boys Directory
-   My Network
-   Sets
-   Chapters
-   Messages
-   Notifications
-   Search Old Boys
-   Profile

Mobile should use a compact responsive navigation, potentially: - Home -
Directory - Network - Messages - Profile

Registration and onboarding must be excellent on mobile because many
invitation links may be opened from WhatsApp.

## 31. UI/UX

Create an original premium interface.

Style: - professional - modern - warm - community-focused - clean -
accessible - dignified

Do not make it look like a generic admin template.

Use: - responsive cards - subtle shadows - strong typography - generous
spacing - accessible contrast - skeleton loading - good empty states -
clear error states

Do not clone LinkedIn.

## 32. Search

Initially use PostgreSQL.

Implement appropriate indexes.

Create a search service abstraction so PostgreSQL can later be
augmented/replaced by: - Meilisearch - Typesense - Elasticsearch

Do not introduce an external search engine for MVP.

## 33. File Storage

Do not permanently store user uploads in `/public/uploads` or the Docker
filesystem.

Create a storage abstraction supporting S3-compatible object storage.

Use for: - profile photos - cover images - post images - future
historical photos/documents

Validate file type, file size, and permissions.

## 34. Security

Implement: - Zod validation - authentication - authorisation - RBAC -
strict tenant isolation - rate limiting - secure password hashing - CSRF
protection where applicable - XSS protections - safe ORM/query
practices - secure headers - upload validation - audit logs - safe
production errors

Never expose stack traces or secrets to production users.

## 35. Performance

Initial production server: - 4 vCPU - 8 GB RAM

Use: - server-side pagination - database indexes - selective Prisma
queries - image optimisation - lazy loading - caching where useful

Avoid premature complexity.

Do not add Redis until there is an actual requirement.

## 36. Accessibility

Aim for WCAG 2.1 AA principles.

Support: - keyboard navigation - semantic HTML - labels - visible focus
states - screen readers - accessible forms - sufficient contrast

## 37. MVP Scope

### Build now

-   Authentication
-   Multi-tenant school/association architecture
-   GCUOBA tenant configuration
-   Old Boy onboarding
-   Old Boy profiles
-   School attendance
-   Sets
-   Houses
-   Classes
-   Chapters
-   GCUOBA Directory
-   Search/filtering
-   Find My Schoolmates
-   Connections
-   Basic feed
-   Basic messaging
-   Verification
-   Privacy controls
-   Notifications
-   Invitations
-   Admin dashboard
-   Audit logging

### Do not build yet

-   Payments
-   Subscriptions
-   Donations
-   Fundraising
-   Jobs marketplace
-   Business directory
-   Mentoring
-   Reunion management
-   Event ticketing
-   Advanced recommendation AI
-   Native mobile apps

Avoid architectural decisions that make these difficult later.

## 38. Code Quality

Use strict TypeScript.

Avoid `any` unless genuinely unavoidable.

Create reusable components.

Keep business logic out of React components where practical.

Use domain services, for example:

``` text
services/
  alumni.service.ts
  schoolmates.service.ts
  connection.service.ts
  verification.service.ts
  search.service.ts
  tenant.service.ts
  chapter.service.ts
```

Use clear naming and avoid enormous files.

## 39. Loading, Empty, Error and Form States

Every major screen must include: - loading state - empty state - error
state

Forms must provide: - field validation - useful error messages - success
feedback

Never display raw database errors.

## 40. Seed Data

Create realistic fictional development data.

Seed: - one GCUOBA tenant - several fictional Sets - several fictional
houses unless verified GCU house data is supplied - several fictional
chapters unless verified chapter data is supplied - at least 30
fictional Old Boys - overlapping attendance periods - multiple
professions - multiple countries - different Sets and houses - one admin
account - several normal member accounts

Never present fictional development data as official GCUOBA information.

Development credentials may be documented only for local/demo use. Never
seed demo passwords into production.

## 41. Testing

Add meaningful tests for critical logic, especially: - tenant
isolation - authentication - permissions - Find My Schoolmates
matching - connection state - verification - privacy visibility -
chapter/set admin boundaries

The schoolmate matching algorithm must have unit tests.

## 42. README

Create a comprehensive `README.md` containing: - product overview -
technology stack - architecture - requirements - local installation -
environment variables - PostgreSQL setup - Prisma setup - migrations -
seeding - development - testing - Docker - GitHub workflow - Coolify
deployment - production environment variables - database backups -
updates - rollback - troubleshooting

## 43. Implementation Approach

We are ready to build. Do not stop after producing a PRD.

Work directly in the repository and implement incrementally.

### Phase 1 --- Foundation

-   Next.js
-   TypeScript
-   Tailwind
-   shadcn/ui
-   Prisma
-   PostgreSQL
-   Auth foundation
-   Docker
-   environment configuration
-   health endpoint
-   base layouts
-   GCUOBA landing page

### Phase 2 --- Database

-   tenant architecture
-   GCUOBA tenant seed
-   users/profiles
-   attendance
-   Sets
-   Houses
-   classes
-   Chapters
-   migrations
-   seed data

### Phase 3 --- Authentication

-   registration
-   login
-   email verification architecture
-   password reset
-   sessions

### Phase 4 --- Onboarding

-   multi-step onboarding
-   GCU history
-   professional profile
-   chapter
-   privacy
-   verification submission

### Phase 5 --- Directory

-   GCUOBA Directory
-   search
-   filters
-   pagination

### Phase 6 --- Find My Schoolmates

-   attendance overlap
-   ranking
-   match reasons
-   tests

### Phase 7 --- Profiles and Connections

### Phase 8 --- Feed

### Phase 9 --- Messaging and Notifications

### Phase 10 --- Verification, Admin, Privacy and Audit

After every phase: 1. Run lint. 2. Run typecheck. 3. Run relevant tests.
4. Run production build. 5. Fix errors before continuing. 6. Make
logical Git commits.

## 44. Start Now

Begin by:

1.  Inspect the current repository.
2.  Preserve existing working code where appropriate.
3.  Create the initial project architecture.
4.  Install required dependencies.
5.  Configure Prisma/PostgreSQL.
6.  Create the first database schema.
7.  Create the Dockerfile.
8.  Create `.env.example`.
9.  Create `/api/health`.
10. Create the GCUOBA landing page.
11. Create authentication foundations.
12. Add the initial GCUOBA tenant seed.
13. Run lint/typecheck/tests/build.
14. Fix all errors.
15. Summarise what was implemented.
16. Give the exact Git commands required to commit and push to GitHub.

Do not merely provide code snippets when you have repository access.
Actually create and modify the files required to build the application.
