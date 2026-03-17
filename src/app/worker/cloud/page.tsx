"use client";

import { useEffect, useState } from "react";

type CloudDoc = {
  id: string;
  documentId: string;
  title: string;
  docType: string | null;
  status: string;
  expiresAt: string | null;
  sharedWithEnterprise: boolean;
  createdAt: string;
};

type CloudProfile = {
  id: string;
  firstName: string;
  lastName: string;
  taxCode: string | null;
  photoUrl: string | null;
  status: string;
  statusLabel: string;
};

type CloudResponse = {
  profile: CloudProfile;
  documents: CloudDoc[];
  counts: {
    total: number;
    expiredWithin30: number;
    private: number;
    shared: number;
    formazione: number;
    nomine: number;
  };
};

export default function WorkerCloudPage() {
  const [data, setData] = useState<CloudResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch("/api/worker/cloud");
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const json = (await res.json()) as CloudResponse;
      setData(json);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-300">Caricamento Cloud Personale...</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-red-400">Errore nel caricamento del Cloud.</p>
      </main>
    );
  }

  const { profile, documents, counts } = data;

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              Cloud Personale di {profile.firstName} {profile.lastName}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              CF: {profile.taxCode ?? "—"} · Stato:{" "}
              <span className="text-emerald-400">{profile.statusLabel}</span>
            </p>
          </div>
        </header>

        <section className="mb-8 grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <p className="text-zinc-400">Documenti totali</p>
            <p className="mt-1 text-2xl font-semibold">{counts.total}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <p className="text-zinc-400">In scadenza (&lt; 30 giorni)</p>
            <p className="mt-1 text-2xl font-semibold text-amber-400">
              {counts.expiredWithin30}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <p className="text-zinc-400">Condivisi con impresa</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-400">
              {counts.shared}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <p className="text-zinc-400">Privati</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-200">
              {counts.private}
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">I tuoi documenti</h2>
          {documents.length === 0 ? (
            <p className="text-sm text-zinc-400">
              Nessun documento presente nel tuo Cloud.
            </p>
          ) : (
            <ul className="space-y-3">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-xs text-zinc-400">
                      Tipo: {doc.docType ?? "—"} · Stato: {doc.status}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Scadenza: {doc.expiresAt ? doc.expiresAt.slice(0, 10) : "—"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      doc.sharedWithEnterprise
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/40"
                        : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                    }`}
                  >
                    {doc.sharedWithEnterprise ? "Condiviso con impresa" : "Privato"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
