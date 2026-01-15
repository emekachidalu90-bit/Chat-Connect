# WhatsApp Clone - Deployment Instructions for Render

## Prerequisites
- A Render account
- A GitHub repository with your project code
- A PostgreSQL database (Render offers managed PostgreSQL)

## Deployment Steps

1. **Create a Web Service on Render**
   - Connect your GitHub repository.
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

2. **Environment Variables**
   Add the following variables in the Render dashboard:
   - `DATABASE_URL`: Your Render PostgreSQL connection string.
   - `SESSION_SECRET`: A long random string for session security.
   - `NODE_ENV`: `production`
   - `REPL_ID`: Your Render service ID or a unique identifier (required by the auth integration).
   - `ISSUER_URL`: `https://replit.com/oidc` (if continuing to use Replit Auth, though you may need a custom OIDC provider for standalone deployment).

3. **Database Migration**
   - You can add `npm run db:push` to your build command: `npm install && npm run build && npm run db:push`.
   - Ensure `drizzle-kit` and `tsx` are in `dependencies` (not `devDependencies`) if you run migrations during build on Render.

4. **Port Configuration**
   - Render automatically assigns a `PORT`. The application is already configured to use `process.env.PORT`.

## Notes
- **Replit Auth**: This application uses Replit's OIDC authentication. When deployed outside of Replit, you will need to configure a custom OIDC provider (like Auth0 or Google OAuth) and update `server/replit_integrations/auth/replitAuth.ts` with the new credentials.
- **WebSockets**: Render supports WebSockets out of the box. No additional configuration is needed for the messaging system.
