import { NextResponse } from "next/server";
import { and, count, ilike, inArray, or, eq } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth/context";
import { withSessionTx, schema } from "@/db/tenantTx";

const { workers, workerConnections } = schema;

type WorkerSearchItem = {
  id: string;
  name: string;
  taxCode: string | null;
  phone: string | null;
  digitalIdentityVerified: boolean;
  connectedEnterprisesCount: number;
};

type WorkerSearchResponse = {
  workers: WorkerSearchItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

export async function GET(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.tenantId || ctx.role !== "impresa") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  if (!q || q.trim().length < 2) {
    return NextResponse.json({
      workers: [],
      total: 0,
      page,
      limit,
      hasMore: false
    } satisfies WorkerSearchResponse);
  }

  return withSessionTx({ userId: ctx.userId, tenantId: ctx.tenantId }, async (tx) => {
    const pattern = `%${q.trim()}%`;

    const whereClause = and(
      eq(workers.tenantId, ctx.tenantId!),
      eq(workers.digitalIdentityVerified, true),
      eq(workers.searchableByEnterprises, true),
      or(
        ilike(workers.firstName, pattern),
        ilike(workers.lastName, pattern),
        ilike(workers.taxCode, pattern),
        ilike(workers.phone, pattern)
      )
    );

    const rows = await tx
      .select({
        id: workers.id,
        firstName: workers.firstName,
        lastName: workers.lastName,
        taxCode: workers.taxCode,
        phone: workers.phone,
        digitalIdentityVerified: workers.digitalIdentityVerified
      })
      .from(workers)
      .where(whereClause)
      .orderBy(workers.lastName, workers.firstName)
      .limit(limit)
      .offset(offset);

    const [totalRow] = await tx
      .select({ count: count() })
      .from(workers)
      .where(whereClause);

    const total = Number(totalRow?.count ?? 0);

    const workerIds = rows.map((r) => r.id);
    const counts =
      workerIds.length > 0
        ? await tx
            .select({
              workerId: workerConnections.workerId,
              cnt: count()
            })
            .from(workerConnections)
            .where(
              and(
                inArray(workerConnections.workerId, workerIds),
                eq(workerConnections.status, "accepted")
              )
            )
            .groupBy(workerConnections.workerId)
        : [];

    const countMap = new Map<string, number>(
      counts.map((c) => [c.workerId, Number(c.cnt)])
    );

    const results: WorkerSearchItem[] = rows.map((r) => ({
      id: r.id,
      name: `${r.firstName} ${r.lastName}`.trim() || "Lavoratore",
      taxCode: r.taxCode,
      phone: r.phone,
      digitalIdentityVerified: r.digitalIdentityVerified,
      connectedEnterprisesCount: countMap.get(r.id) ?? 0
    }));

    return NextResponse.json({
      workers: results,
      total,
      page,
      limit,
      hasMore: offset + rows.length < total
    } satisfies WorkerSearchResponse);
  });
}
