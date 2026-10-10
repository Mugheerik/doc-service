This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started
# Doc Service — Frontend

The web interface for Doc Service, an AI-powered document processing application. Users can authenticate, upload documents, track processing status, and review AI-generated analysis.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- TanStack Query

## Prerequisites

- Node.js compatible with the version specified in `package.json`
- npm
- A running Doc Service backend

## Setup

From the `frontend` directory:

```bash
npm ci
```

## Configuration

Configure the backend API URL using the `NEXT_PUBLIC_API_URL` environment variable.

For local development, the default is:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
```

This variable is used by the frontend and is included in the client-side application. Do not put secrets or private API keys in `NEXT_PUBLIC_*` variables.

## Run Locally

Start the development server from the `frontend` directory:

```bash
npm run dev
```

Open http://localhost:3000.

Ensure the backend is running and its CORS configuration allows the frontend origin.

## Production Build Check

Build the frontend:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

Run the configured lint command:

```bash
npm run lint
```

If the `lint` script is not defined in `package.json`, use the lint command configured by the project instead.

## Main Workflow

1. Register or sign in.
2. Upload a PDF, DOCX, or TXT document.
3. Track its processing status.
4. Review the extracted content and AI-generated analysis.
5. View or delete your documents.

## Related Documentation

See the root [README](../README.md) for the complete application architecture, Docker Compose instructions, backend endpoints, and project limitations.

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
