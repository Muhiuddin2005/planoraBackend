# Planora - Backend Engine & API

Planora's backend is a highly secure, RESTful API engine that handles event registrations, moderation workflows, user management, and transactional events on the platform. It features real-time synchronization, automated email delivery, and an automated intrusion detection security gateway.

This repository hosts the **Backend API Application** built with Node.js, Express, TypeScript, and PostgreSQL.

## 🚀 Live URL & Repositories

- **Live URL (Vercel)**: [https://planora-backend-two.vercel.app](https://planora-backend-two.vercel.app)
- **Frontend Repository**: [Planora Frontend Repo](https://github.com/yourusername/planora-frontend)
- **Backend Repository**: [Planora Backend Repo](https://github.com/yourusername/planora-backend)

---

## 🔑 Core Features & Architectures

### 1. Robust Event Moderation Logic
- **Pending Default**: All newly created events are automatically initialized with a `PENDING` status.
- **Admin/Moderator Review**: Exposes secure endpoints (`PATCH /api/v1/events/:id/status`) for Admins and Moderators to approve or reject events.
- **Real-Time Communication**: On status update, the system triggers:
  - **Socket Notifications**: Push instant notification events to the host's client dashboard.
  - **EJS Mail Service**: Compiles custom HTML emails detailing approval or rejection (including reasons) and delivers them to the creator.

### 2. Auto-Warn and Banning Gateway
- **Intrusion Tracking**: The `checkAuth` middleware tracks unauthorized API access attempts (e.g. non-admins trying to access audit logs or user roles).
- **Auto-Ban Engine**: If a user role triggers a `403 Forbidden` response twice, they are immediately and permanently flagged as `BANNED`.
- **Deduplication Cooldown**: Incorporates a 3-second database cooldown window to prevent concurrent parallel queries (like page loads) from triggering multiple counts for a single navigation violation.

### 3. Detailed Audit Logs
- **System Traceability**: Automatically writes record entries (`AuditLog`) for critical administrative and moderation operations:
  - Banning/Unbanning users (`BAN_USER` / `UNBAN_USER`).
  - Promoting/Demoting roles (`PROMOTE_MODERATOR` / `DEMOTE_MODERATOR`).
  - Account deletions (`DELETE_USER`).
  - Event approvals/rejections (`APPROVE_EVENT` / `REJECT_EVENT`).
  - Event deletions (`DELETE_EVENT`).
  - Message deletions (`DELETE_MESSAGE`).

---

## 🛠️ Technologies Used

- **Runtime Environment**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database ORM**: Prisma ORM with PostgreSQL (Neon DB Cloud)
- **Real-Time Events**: Socket.io
- **File Uploads**: Cloudinary API with Multer middleware
- **Email Delivery**: Nodemailer with EJS template compiler
- **Authentication**: JSON Web Token (JWT) & bcryptjs hashing
- **Validation**: Zod Schemas

---

## 📂 API Endpoint Overview (Special Admin APIs)

| HTTP Method | Route | Access Level | Description |
|---|---|---|---|
| `GET` | `/api/v1/audit-logs` | `ADMIN` only | Retrieve all system audit logs. |
| `PATCH` | `/api/v1/users/:id/role` | `ADMIN` only | Promote/demote users to/from `MODERATOR`. |
| `DELETE` | `/api/v1/users/:id` | `ADMIN` only | Delete user accounts and related dependencies. |
| `PATCH` | `/api/v1/users/:id/status` | `ADMIN`, `MODERATOR` | Ban or unban user accounts. |
| `PATCH` | `/api/v1/events/:id/status` | `ADMIN`, `MODERATOR` | Approve or reject submitted events. |
| `GET` | `/api/v1/events/admin/stats` | `ADMIN`, `MODERATOR` | Retrieve aggregated dashboard charts statistics. |
| `DELETE` | `/api/v1/messages/:id` | `ADMIN`, `MODERATOR` | Delete contact form message records. |

---

## 🚀 Local Setup Instructions

Follow these steps to run the backend API locally:

### 1. Prerequisites
Ensure you have **Node.js** (v18+) and **PostgreSQL** or access to a database url.

### 2. Clone the Repository
```bash
git clone https://github.com/yourusername/planora-backend.git
cd planora-backend
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Environment Variables
Create a `.env` file in the root directory and specify the following details:
```env
DATABASE_URL="your-postgresql-connection-string"
JWT_SECRET="your-jwt-signing-secret"
EMAIL_USER="your-notification-sender-gmail@gmail.com"
EMAIL_PASS="your-gmail-app-password"
CLOUDINARY_CLOUD_NAME="your-cloudinary-name"
CLOUDINARY_API_KEY="your-cloudinary-key"
CLOUDINARY_API_SECRET="your-cloudinary-secret"
```

### 5. Initialize the Database
Push the schema changes and generate the client code:
```bash
npx prisma db push
npx prisma generate
```

### 6. Start the Server
```bash
npm run dev
```
The API server will run at [http://localhost:5000](http://localhost:5000).
