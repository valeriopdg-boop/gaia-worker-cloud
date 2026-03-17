import { getSession } from "./session";

export type AuthContext = {
  userId: string;
  tenantId: string | null;
  role: "worker" | "impresa";
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getSession();
  if (!session) return null;
  return session;
}
