import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-blue-400">
            AI Document Processing
          </p>

          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Understand your documents faster.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Upload a PDF, DOCX, or TXT document and get an AI-generated
            summary, key points, important entities, and action items.
          </p>

          <div className="mt-8 flex gap-4">
            <Link
              href="/login"
              className="rounded-lg bg-blue-600 px-5 py-3 font-medium transition hover:bg-blue-500"
            >
              Sign in
            </Link>

            <Link
              href="/register"
              className="rounded-lg border border-slate-700 px-5 py-3 font-medium transition hover:bg-slate-900"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}