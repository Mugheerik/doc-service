"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

type User = {
  id: number;
  email: string;
  created_at: string;
};

type DocumentStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

type ImportantEntity = {
  name: string;
  type: string;
  value: string;
};

type DocumentAnalysis = {
  summary: string;
  key_points: string[];
  document_type: string;
  important_entities: ImportantEntity[];
  action_items: string[];
};

type Document = {
  id: number;
  filename: string;
  content_type: string;
  file_size: number;
  status: DocumentStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  analysis: DocumentAnalysis | null;
};

type DocumentHistoryItem = Omit<Document, "analysis">;

type SelectedDocument = DocumentHistoryItem & {
  analysis: DocumentAnalysis | null;
};

const ACCEPTED_TYPES = ".pdf,.docx,.txt";

const emptySubscribe = () => () => {};

function getServerSnapshot() {
  return false;
}

function getClientSnapshot() {
  return true;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString();
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const styles: Record<DocumentStatus, string> = {
    PENDING: "bg-yellow-500/10 text-yellow-400",
    PROCESSING: "bg-blue-500/10 text-blue-400",
    COMPLETED: "bg-green-500/10 text-green-400",
    FAILED: "bg-red-500/10 text-red-400",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!isClient) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-sm text-slate-400">Loading...</p>
      </main>
    );
  }

  return <DashboardContent />;
}

function DashboardContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(
    null,
  );
  const [uploadError, setUploadError] = useState("");

  const token = getToken();

  useEffect(() => {
    if (!token) {
      router.replace("/login");
    }
  }, [router, token]);

  const userQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: () => api<User>("/auth/me", { token: token! }),
    enabled: Boolean(token),
  });

  const documentsQuery = useQuery({
    queryKey: ["documents"],
    queryFn: () => api<DocumentHistoryItem[]>("/documents", { token: token! }),
    enabled: Boolean(token),
    refetchInterval: (query) => {
      const documents = query.state.data;

      const hasProcessingDocument = documents?.some(
        (document) =>
          document.status === "PENDING" || document.status === "PROCESSING",
      );

      return hasProcessingDocument ? 3000 : false;
    },
  });

  const selectedDocumentQuery = useQuery({
    queryKey: ["document", selectedDocumentId],
    queryFn: () =>
      api<Document>(`/documents/${selectedDocumentId}`, {
        token: token!,
      }),
    enabled: Boolean(token && selectedDocumentId),
    refetchInterval: (query) => {
      const document = query.state.data;

      if (
        document?.status === "PENDING" ||
        document?.status === "PROCESSING"
      ) {
        return 3000;
      }

      return false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      return api<Document>("/documents", {
        method: "POST",
        body: formData,
        token: token!,
      });
    },

    onSuccess: (document) => {
      setSelectedFile(null);
      setSelectedDocumentId(document.id);
      setUploadError("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      queryClient.invalidateQueries({
        queryKey: ["documents"],
      });
    },

    onError: (error) => {
      setUploadError(
        error instanceof Error ? error.message : "Upload failed",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return api<void>(`/documents/${documentId}`, {
        method: "DELETE",
        token: token!,
      });
    },

    onSuccess: (_, documentId) => {
      if (selectedDocumentId === documentId) {
        setSelectedDocumentId(null);
      }

      queryClient.invalidateQueries({
        queryKey: ["documents"],
      });

      queryClient.removeQueries({
        queryKey: ["document", documentId],
      });
    },
  });

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(file);
    setUploadError("");
  }

  function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setUploadError("Please select a document first.");
      return;
    }

    setUploadError("");
    uploadMutation.mutate(selectedFile);
  }

  function handleLogout() {
    clearToken();
    queryClient.clear();
    router.replace("/login");
  }

  const documents = documentsQuery.data ?? [];

  const historyDocument =
    documents.find((document) => document.id === selectedDocumentId) ?? null;

  const selectedDocument: SelectedDocument | null =
    selectedDocumentQuery.data ??
    (historyDocument
      ? {
          ...historyDocument,
          analysis: null,
        }
      : null);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-xl font-bold">Doc Service</h1>

            <p className="text-sm text-slate-400">
              AI-powered document processing
            </p>
          </div>

          <div className="flex items-center gap-4">
            {userQuery.data && (
              <span className="hidden text-sm text-slate-400 sm:block">
                {userQuery.data.email}
              </span>
            )}

            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium transition hover:bg-slate-900"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Your documents</h2>

          <p className="mt-2 text-slate-400">
            Upload a document and let AI extract the information that matters.
          </p>
        </div>

        <section className="mb-10 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-lg font-semibold">Upload document</h3>

          <p className="mt-1 text-sm text-slate-400">
            Supported formats: PDF, DOCX, TXT. Maximum size: 10 MB.
          </p>

          <form onSubmit={handleUpload} className="mt-6">
            <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950 p-6">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-blue-500"
              />

              {selectedFile && (
                <div className="mt-4 rounded-lg bg-slate-900 p-4 text-sm">
                  <p className="font-medium">{selectedFile.name}</p>

                  <p className="mt-1 text-slate-400">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              )}
            </div>

            {uploadError && (
              <p className="mt-4 rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">
                {uploadError}
              </p>
            )}

            <button
              type="submit"
              disabled={!selectedFile || uploadMutation.isPending}
              className="mt-5 rounded-lg bg-blue-600 px-5 py-3 font-medium transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploadMutation.isPending ? "Uploading..." : "Analyze document"}
            </button>
          </form>
        </section>

        <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">History</h3>

              <span className="text-sm text-slate-500">
                {documents.length}{" "}
                {documents.length === 1 ? "document" : "documents"}
              </span>
            </div>

            {documentsQuery.isLoading && (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
                Loading documents...
              </div>
            )}

            {documentsQuery.isError && (
              <div className="rounded-xl border border-red-900 bg-red-950/30 p-6 text-sm text-red-300">
                Unable to load your documents.
              </div>
            )}

            {!documentsQuery.isLoading && documents.length === 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
                No documents yet. Upload your first document above.
              </div>
            )}

            <div className="space-y-3">
              {documents.map((document) => (
                <button
                  key={document.id}
                  onClick={() => setSelectedDocumentId(document.id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selectedDocumentId === document.id
                      ? "border-blue-500 bg-blue-500/5"
                      : "border-slate-800 bg-slate-900 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate font-medium">
                      {document.filename}
                    </p>

                    <StatusBadge status={document.status} />
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    {formatFileSize(document.file_size)} ·{" "}
                    {formatDate(document.created_at)}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section>
            {!selectedDocument && (
              <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
                <div>
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-xl">
                    ↑
                  </div>

                  <h3 className="font-semibold">Select a document</h3>

                  <p className="mt-2 max-w-sm text-sm text-slate-400">
                    Upload a document or select one from your history to view
                    its processing status and AI analysis.
                  </p>
                </div>
              </div>
            )}

            {selectedDocumentQuery.isLoading && selectedDocumentId && (
              <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-8">
                <p className="text-sm text-slate-400">
                  Loading document details...
                </p>
              </div>
            )}

            {selectedDocumentQuery.isError && selectedDocumentId && (
              <div className="rounded-xl border border-red-900 bg-red-950/30 p-6 text-sm text-red-300">
                Unable to load the document details.
              </div>
            )}

            {selectedDocument && (
              <div className="rounded-xl border border-slate-800 bg-slate-900">
                <div className="border-b border-slate-800 p-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <h3 className="truncate text-xl font-semibold">
                        {selectedDocument.filename}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {formatFileSize(selectedDocument.file_size)} ·{" "}
                        {formatDate(selectedDocument.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={selectedDocument.status} />

                      <button
                        onClick={() =>
                          deleteMutation.mutate(selectedDocument.id)
                        }
                        disabled={deleteMutation.isPending}
                        className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-400 transition hover:bg-red-950/50 disabled:opacity-50"
                      >
                        {deleteMutation.isPending ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>

                {selectedDocument.status === "PROCESSING" && (
                  <div className="p-8 text-center">
                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />

                    <h4 className="font-semibold">Analyzing document...</h4>

                    <p className="mt-2 text-sm text-slate-400">
                      Gemini is processing your document. This page will
                      update automatically.
                    </p>
                  </div>
                )}

                {selectedDocument.status === "PENDING" && (
                  <div className="p-8 text-center">
                    <h4 className="font-semibold">Waiting for processing</h4>

                    <p className="mt-2 text-sm text-slate-400">
                      Your document will be processed shortly.
                    </p>
                  </div>
                )}

                {selectedDocument.status === "FAILED" && (
                  <div className="p-8">
                    <div className="rounded-lg border border-red-900 bg-red-950/30 p-5">
                      <h4 className="font-semibold text-red-300">
                        Processing failed
                      </h4>

                      <p className="mt-2 text-sm text-red-400">
                        {selectedDocument.error_message ??
                          "The document could not be processed."}
                      </p>
                    </div>
                  </div>
                )}

                {selectedDocument.status === "COMPLETED" &&
                  selectedDocument.analysis && (
                    <div className="space-y-8 p-6">
                      <div>
                        <p className="text-sm font-medium uppercase tracking-wide text-blue-400">
                          Document type
                        </p>

                        <p className="mt-2 text-lg font-semibold">
                          {selectedDocument.analysis.document_type}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-lg font-semibold">Summary</h4>

                        <p className="mt-3 leading-7 text-slate-300">
                          {selectedDocument.analysis.summary}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-lg font-semibold">Key points</h4>

                        <ul className="mt-3 space-y-3">
                          {selectedDocument.analysis.key_points.map(
                            (point, index) => (
                              <li
                                key={index}
                                className="flex gap-3 text-slate-300"
                              >
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />

                                <span>{point}</span>
                              </li>
                            ),
                          )}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-lg font-semibold">
                          Important entities
                        </h4>

                        {selectedDocument.analysis.important_entities.length ===
                        0 ? (
                          <p className="mt-3 text-sm text-slate-500">
                            No important entities identified.
                          </p>
                        ) : (
                          <div className="mt-3 overflow-hidden rounded-lg border border-slate-800">
                            <div className="grid grid-cols-[1fr_120px_1fr] border-b border-slate-800 bg-slate-950 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                              <span>Name</span>
                              <span>Type</span>
                              <span>Value</span>
                            </div>

                            {selectedDocument.analysis.important_entities.map(
                              (entity, index) => (
                                <div
                                  key={index}
                                  className="grid grid-cols-[1fr_120px_1fr] gap-4 border-b border-slate-800 px-4 py-3 text-sm last:border-b-0"
                                >
                                  <span className="break-words">
                                    {entity.name}
                                  </span>

                                  <span className="text-slate-400">
                                    {entity.type}
                                  </span>

                                  <span className="break-words text-slate-400">
                                    {entity.value}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="text-lg font-semibold">
                          Action items
                        </h4>

                        {selectedDocument.analysis.action_items.length ===
                        0 ? (
                          <p className="mt-3 text-sm text-slate-500">
                            No action items identified.
                          </p>
                        ) : (
                          <ul className="mt-3 space-y-3">
                            {selectedDocument.analysis.action_items.map(
                              (item, index) => (
                                <li
                                  key={index}
                                  className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300"
                                >
                                  {item}
                                </li>
                              ),
                            )}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}

                {selectedDocument.status === "COMPLETED" &&
                  !selectedDocument.analysis &&
                  !selectedDocumentQuery.isLoading && (
                    <div className="p-8 text-center">
                      <p className="text-sm text-slate-400">
                        Analysis is not available for this document.
                      </p>
                    </div>
                  )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}