# AmarSpace — Architecture & Product Updates

## Updated Infrastructure Decisions

### Backend Deployment
Replace previous backend deployment recommendation.

## Backend Deployment
- Deploy backend API on Vercel.
- Backend must be designed to work properly in serverless environments.
- Avoid long-running blocking operations.
- Keep API stateless.
- Use proper request validation and lightweight middleware.

---

# Dockerized Setup Requirement

The entire project MUST support Dockerized deployment from the beginning.

Reason:
- Future VPS deployment
- Easier self-hosting
- Easier local development
- Infrastructure portability
- Easier CI/CD

---

# Docker Requirements

## Must Include

- Dockerfile for frontend
- Dockerfile for backend
- docker-compose.yml
- Environment variable support
- Production-ready container setup

---

# Suggested Docker Structure

/apps
  /web
    Dockerfile

  /api
    Dockerfile

/docker
  nginx/

/docker-compose.yml

---

# Containerization Goals

The system should support:
- Local development
- Vercel deployment
- Future VPS deployment
- Future reverse proxy setup
- Future SSL setup

---

# Database Migration Rules

Use:
- Drizzle migrations

Requirements:
- Migration-safe setup
- Production-safe migration workflow
- Seed support for development

---

# Updated Renter Registration Requirements

## Registration Form Fields

The renter registration form MUST include:

### Personal Information
- Full Name
- Phone Number
- NID Number (Required)
- Date of Birth (Optional)
- Occupation
- Blood Group (Required)

### Family Information
- Total Family Members (Required)
- Family Member Names (Optional)

### Emergency Information
- Emergency Contact Name
- Emergency Contact Number
- Relationship

### Rental Information
- Rental Start Date
- Advance Amount Paid

### Verification
- Digital Signature
- NID Photo Upload (Optional for MVP)

---

# IMPORTANT BUSINESS RULE

## NID Is Mandatory

NID number MUST be required for renter registration.

This is important for:
- Legal tracking
- Building security
- Tenant verification
- Local operational needs

---

# Blood Group Requirement

Blood group should be stored because:
- Emergency situations
- Local apartment operations
- Medical emergencies

Allowed Values:
- A+
- A-
- B+
- B-
- AB+
- AB-
- O+
- O-

---

# Advance Deposit System

## Updated Business Logic

Advance/security deposit MUST support future rent adjustment.

Example:

Advance Paid: ৳ 24,000
Monthly Rent: ৳ 12,000

Possible Adjustments:
- Last 2 months rent
- Partial monthly adjustments
- Manual owner adjustments

---

# Advance Adjustment Rules

Owners/managers should be able to:
- Apply advance to future rent
- Partially deduct advance
- View remaining advance balance
- Add adjustment notes

---

# Suggested Database Fields

## Rental Contract

Add:
- securityDepositAmount
- remainingDepositBalance

---

# Suggested Adjustment Table

Create:

advance_adjustments

Fields:
- contractId
- amount
- adjustedAgainstBillId
- note
- adjustedBy
- createdAt

---

# Audit Log System

IMPORTANT:
The system MUST include audit logs.

Reason:
- Accountability
- Operational tracking
- Security
- Multi-staff management
- Future SaaS readiness

---

# Audit Log Requirements

Track:
- User login
- Flat creation
- Renter approval
- Payment updates
- Bill modifications
- Maintenance updates
- Issue status changes
- Role changes
- Notice creation
- Contract changes

---

# Suggested Audit Log Fields

Table:

audit_logs

Fields:
- id
- actorUserId
- entityType
- entityId
- action
- oldValue
- newValue
- ipAddress
- userAgent
- createdAt

---

# Audit Log Visibility

## Owner
Can view all logs.

## Manager
Limited logs.

## Other Roles
No audit access by default.

---

# Technology Versioning Rules

IMPORTANT:
Always use latest stable versions.

Requirements:
- Latest stable Next.js
- Latest stable Fastify
- Latest stable Drizzle ORM
- Latest stable Better Auth
- Latest stable TanStack Query
- Latest stable Tailwind
- Latest stable PostgreSQL-compatible tooling

---

# Dependency Rules

DO:
- Prefer actively maintained libraries
- Prefer TypeScript-first libraries
- Prefer lightweight libraries
- Prefer modern tooling

DO NOT:
- Use abandoned packages
- Use deprecated libraries
- Use unnecessary dependencies
- Use overly complex frameworks

---

# Codebase Rules

The coding agent MUST:

- Write strict TypeScript
- Use proper validation
- Use modular architecture
- Keep APIs clean
- Avoid premature optimization
- Avoid overengineering
- Prefer maintainability over cleverness
- Keep UI mobile-first
- Keep Bangla-first UX priority

---

# Final Updated Infrastructure

Frontend:
- Next.js 16
- TanStack Query
- Tailwind
- shadcn/ui

Backend:
- Fastify
- REST API
- Vercel deployment

Database:
- PostgreSQL
- Drizzle ORM

Authentication:
- Better Auth

Storage:
- Cloudflare R2

Infrastructure:
- Turborepo
- Dockerized setup
- Vercel deployment
- Future VPS compatibility

---

# Final Technical Philosophy

The project should prioritize:

- Simplicity
- Reliability
- Bangla-first UX
- Mobile-first usability
- Elderly-friendly interfaces
- Low operational complexity
- SaaS scalability
- Easy deployment
- Future portability

The system should feel:
- Fast
- Clear
- Friendly
- Operational
- Trustworthy

