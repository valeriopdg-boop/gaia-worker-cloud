import { NextResponse } from "next/server";
import { and, count, ilike, inArray, or, eq } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth/context";
import { withSessionTx, schema } from "@/db/tenantTx";

const { enterprises, workerConnections } = schema;

type EnterpriseSearchItem = {
  id: string;
  name: string;
  vatCode: string;
  sector: string | null;
  connectedWorkersCount: number;
};

type EnterpriseSearchResponse = {
  enterprises: EnterpriseSearchItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

export async function GET(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.tenantId || ctx.role !== "worker") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  if (!q || q.trim().length < 2) {
    return NextResponse.json({
      enterprises: [],
      total: 0,
      page,
      limit,
      hasMore: false
    } satisfies EnterpriseSearchResponse);
  }

  return withSessionTx({ userId: ctx.userId, tenantId: ctx.tenantId }, async (tx) => {
    const pattern = `%${q.trim()}%`;

    const whereClause = and(
      eq(enterprises.tenantId, ctx.tenantId!),
      eq(enterprises.isPublic, true),
      or(
        ilike(enterprises.name, pattern),
        ilike(enterprises.vatCode, pattern),
        ilike(enterprises.sector, pattern)
      )
    );

    const rows = await tx
      .select({
        id: enterprises.id,
        name: enterprises.name,
        vatCode: enterprises.vatCode,
        sector: enterprises.sector
      })
      .from(enterprises)
      .where(whereClause)
      .orderBy(enterprises.name)
      .limit(limit)
      .offset(offset);

    const [totalRow] = await tx
      .select({ count: count() })
      .from(enterprises)
      .where(whereClause);

    const total = Number(totalRow?.count ?? 0);

    const enterpriseIds = rows.map((r) => r.id);
    const counts =
      enterpriseIds.length > 0
        ? await tx
            .select({
              enterpriseId: workerConnections.enterpriseId,
              cnt: count()
            })
            .from(workerConnections)
            .where(
              and(
                inArray(workerConnections.enterpriseId, enterpriseIds),
                eq(workerConnections.status, "accepted")
              )
            )
            .groupBy(workerConnections.enterpriseId)
        : [];

    const countMap = new Map<string, number>(
      counts.map((c) => [c.enterpriseId, Number(c.cnt)])
    );

    const results: EnterpriseSearchItem[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      vatCode: r.vatCode,
      sector: r.sector,
      connectedWorkersCount: countMap.get(r.id) ?? 0
    }));

    return NextResponse.json({
      enterprises: results,
      total,
      page,
      limit,
      hasMore: offset + rows.length < total
    } satisfies EnterpriseSearchResponse);
  });
}
