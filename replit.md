# Overview

This system provides a comprehensive work schedule management solution for BIDV, encompassing staff scheduling, meeting room booking, event management, and organizational data display. It supports both administrative operations and public information dissemination. The project aims to streamline scheduling processes within the organization, enhance operational efficiency, and provide clear visibility into daily activities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The client-side application is built with React 18 and TypeScript, leveraging a component-based architecture with `shadcn/ui` for consistent design. It uses Wouter for lightweight routing and TanStack Query for server state management and caching. Styling is managed with Tailwind CSS, utilizing custom properties for BIDV brand colors. Vite is used for fast development and optimized production builds.

## Backend Architecture

The server employs a layered Express.js architecture, separating concerns across routing, business logic, and data access. It features RESTful APIs, OpenID Connect integration with Replit authentication, PostgreSQL-backed session management, and Multer for file uploads. The business logic is organized with a storage abstraction layer (`server/storage.ts`) for all database operations, ensuring clear delegation from route handlers. Consistent error handling and logging are implemented throughout.

## Database Architecture

The system uses PostgreSQL with Drizzle ORM for type-safe operations and migrations. The schema includes core entities like Users, Staff, Departments, Meeting Rooms, and Event Categories. It supports Work Schedules, Meeting Schedules, and Other Events with datetime ranges, and implements a flexible permission system linking users to staff members. Key features include UUID primary keys, foreign key relationships with cascading deletes, and audit fields.

## Authentication and Authorization

A multi-layered security approach is implemented using OpenID Connect integration with Replit's authentication service and database-backed session management. Authorization is based on roles (`SystemUser` and `Staff` relationships) and granular permissions for schedule management. Route-level protection is enforced with authentication middleware, while public display routes are accessible without authentication.

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: Type-safe database toolkit.

## Authentication Services
- **Replit Authentication**: OpenID Connect provider.
- **Passport.js**: Authentication middleware.

## Frontend Libraries
- **React Query (@tanstack/react-query)**: Server state management.
- **shadcn/ui**: Component library.
- **Tailwind CSS**: Styling.
- **Wouter**: Client-side routing.
- **React Hook Form**: Form state management.

## Backend Dependencies
- **Express.js**: Web application framework.
- **Multer**: File upload handling.
- **bcrypt**: Password hashing.
- **connect-pg-simple**: PostgreSQL session store.
- **memoizee**: Function memoization.

## Cloud Services
- **Replit**: Development and hosting platform.
- **Neon**: Managed PostgreSQL database service.