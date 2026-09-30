# Aditya | My personal Tracker — courses and daily routines

A private, single-account Next.js app for a daily checklist, recurring routines, course study plans, and consistency history. Open `/today` for daily tracking or `/` for the original course dashboard.

Read [the implementation and deployment guide](docs/DAILY-TRACKER.md) for data migration, persistent hosting, environment variables, Web Push scheduling, iPhone installation, tests, and known limits. The original catalog and links remain in `src/data/courses.ts`; all saved progress and daily records share the ignored `.data/learning-hub.json` file. Back it up before deploying.

**Hosting:** this file-backed app needs persistent writable disk. The generic Vercel link below is not evidence that the app is deployed there; do not use ephemeral serverless disk for user data. Morning reminders require configured VAPID keys and a separately configured authenticated server-side scheduler. Real-device delivery has not been verified.

Checks: `npm test`, `npm run lint`, `npm run build`.

## Next.js development

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
