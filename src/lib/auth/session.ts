export type Session = {
  userId: string;
  tenantId: string;
  role: "worker" | "impresa";
};

export async function getSession(): Promise<Session | null> {
  // MOCK: user worker fisso, tenant fisso
  return {
    userId: "00000000-0000-0000-0000-000000000001",
    tenantId: "00000000-0000-0000-0000-000000000001",
    role: "worker"
  };
}
