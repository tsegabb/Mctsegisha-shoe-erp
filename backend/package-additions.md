# Dependencies (add to your root package.json)
npm i express cors helmet express-rate-limit jsonwebtoken bcryptjs pg zod nodemailer dotenv
npm i -D typescript tsx @types/express @types/cors @types/jsonwebtoken @types/pg @types/node @types/nodemailer
# Remove if unused: drizzle-*, any in-memory/mock deps. `vite` stays a devDependency (dev middleware only).
# Run:  tsx backend/server.ts     Typecheck: tsc -p .   (tsconfig.json provided at repo root)
