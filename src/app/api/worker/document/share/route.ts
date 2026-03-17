import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { withSessionTx, schema } from "@/db/tenantTx";

const { workers, workerClouds, documents, workerArchiveDocuments } = schema;

const BodySchema = z.object({
  documentId: z.string().uuid(),
  shared: z.boolean()
});

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.tenantId || ctx.role !== "worker") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { documentId, shared } = parsed.data;

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

    const inCloud =
      cloud?.id
        ? await tx
            .select({ id: documents.id })
            .from(documents)
            .where(
              and(
                eq(documents.id, documentId),
                eq(documents.tenantId, ctx.tenantId!),
                eq(documents.workerCloudId, cloud.id)
              )
            )
            .limit(1)
        : [];

    const inArchive = await tx
      .select({ documentId: workerArchiveDocuments.documentId })
      .from(workerArchiveDocuments)
      .where(
        and(
          eq(workerArchiveDocuments.workerId, worker.id),
          eq(workerArchiveDocuments.tenantId, ctx.tenantId!),
          eq(workerArchiveDocuments.documentId, documentId)
        )
      )
      .limit(1);

    const ownsDoc = inCloud.length > 0 || inArchive.length > 0;
    if (!ownsDoc) {
      return NextResponse.json(
        { error: "Documento non trovato o non accessibile" },
        { status: 404 }
      );
    }

    const updated = await tx
      .update(documents)
      .set({ sharedWithEnterprise: shared })
      .where(and(eq(documents.id, documentId), eq(documents.tenantId, ctx.tenantId!)))
      .returning({ id: documents.id });

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Impossibile aggiornare il documento" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, shared });
  });
}
