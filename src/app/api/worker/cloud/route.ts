import { NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth/context";
import { withSessionTx, schema } from "@/db/tenantTx";

const { workers, workerClouds, documents, workerArchiveDocuments } = schema;

type WorkerCloudResponse = {
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    taxCode: string | null;
    photoUrl: string | null;
    status: string;
    statusLabel: string;
  };
  documents: Array<{
    id: string;
    documentId: string;
    title: string;
    docType: string | null;
    status: string;
    expiresAt: string | null;
    sharedWithEnterprise: boolean;
    createdAt: string;
  }>;
  counts: {
    total: number;
    expiredWithin30: number;
    private: number;
    shared: number;
    formazione: number;
    nomine: number;
  };
};

function isFormazione(docType: string | null | undefined): boolean {
  if (!docType) return false;
  const n = docType.toLowerCase();
  return n.includes("formazione");
}

function isNomine(docType: string | null | undefined): boolean {
  if (!docType) return false;
  const n = docType.toLowerCase();
  return n.includes("nomina");
}

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.tenantId || ctx.role !== "worker") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return withSessionTx({ userId: ctx.userId, tenantId: ctx.tenantId }, async (tx) => {
    const [worker] = await tx
      .select()
      .from(workers)
      .where(and(eq(workers.tenantId, ctx.tenantId!), eq(workers.userId, ctx.userId)))
      .limit(1);

    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    const [cloud] = await tx
      .select()
      .from(workerClouds)
      .where(and(eq(workerClouds.tenantId, ctx.tenantId!), eq(workerClouds.workerId, worker.id)))
      .limit(1);

    const allDocs: WorkerCloudResponse["documents"] = [];

    const archiveDocs = await tx
      .select({
        id: workerArchiveDocuments.documentId,
        documentId: workerArchiveDocuments.documentId,
        title: documents.title,
        docType: documents.docType,
        status: documents.status,
        expiresAt: documents.expiresAt,
        sharedWithEnterprise: documents.sharedWithEnterprise,
        createdAt: documents.createdAt
      })
      .from(workerArchiveDocuments)
      .innerJoin(
        documents,
        and(
          eq(workerArchiveDocuments.tenantId, ctx.tenantId!),
          eq(workerArchiveDocuments.documentId, documents.id),
          eq(documents.tenantId, ctx.tenantId!)
        )
      )
      .where(
        and(
          eq(workerArchiveDocuments.tenantId, ctx.tenantId!),
          eq(workerArchiveDocuments.workerId, worker.id)
        )
      );

    for (const row of archiveDocs) {
      allDocs.push({
        id: row.id,
        documentId: row.documentId,
        title: row.title ?? row.docType ?? "Documento",
        docType: row.docType,
        status: row.status,
        expiresAt: row.expiresAt?.toISOString() ?? null,
        sharedWithEnterprise: row.sharedWithEnterprise,
        createdAt: row.createdAt?.toISOString() ?? new Date().toISOString()
      });
    }

    if (cloud?.id) {
      const cloudDocs = await tx
        .select({
          id: documents.id,
          documentId: documents.id,
          title: documents.title,
          docType: documents.docType,
          status: documents.status,
          expiresAt: documents.expiresAt,
          sharedWithEnterprise: documents.sharedWithEnterprise,
          createdAt: documents.createdAt
        })
        .from(documents)
        .where(
          and(
            eq(documents.tenantId, ctx.tenantId!),
            eq(documents.workerCloudId, cloud.id)
          )
        );

      for (const row of cloudDocs) {
        allDocs.push({
          id: row.id,
          documentId: row.documentId,
          title: row.title ?? row.docType ?? "Documento",
          docType: row.docType,
          status: row.status,
          expiresAt: row.expiresAt?.toISOString() ?? null,
          sharedWithEnterprise: row.sharedWithEnterprise,
          createdAt: row.createdAt?.toISOString() ?? new Date().toISOString()
        });
      }
    }

    const now = new Date();
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);

    const expiredWithin30 = allDocs.filter((d) => {
      if (!d.expiresAt) return false;
      const exp = new Date(d.expiresAt);
      return exp <= in30;
    }).length;

    const privateCount = allDocs.filter((d) => !d.sharedWithEnterprise).length;
    const sharedCount = allDocs.filter((d) => d.sharedWithEnterprise).length;
    const formazioneCount = allDocs.filter((d) => isFormazione(d.docType)).length;
    const nomineCount = allDocs.filter((d) => isNomine(d.docType)).length;

    const statusLabel: WorkerCloudResponse["profile"]["statusLabel"] =
      worker.status === "active"
        ? "Attivo"
        : worker.status === "pending"
          ? "In attesa di conferma"
          : "In attesa di collegamento";

    return NextResponse.json({
      profile: {
        id: worker.id,
        firstName: worker.firstName,
        lastName: worker.lastName,
        taxCode: worker.taxCode ?? null,
        photoUrl: null,
        status: worker.status,
        statusLabel
      },
      documents: allDocs,
      counts: {
        total: allDocs.length,
        expiredWithin30,
        private: privateCount,
        shared: sharedCount,
        formazione: formazioneCount,
        nomine: nomineCount
      }
    } satisfies WorkerCloudResponse);
  });
}
