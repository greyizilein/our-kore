import { useUserSync } from "@/lib/user-sync";

export function UserSyncProvider({ children }: { children: React.ReactNode }) {
  useUserSync();
  return <>{children}</>;
}
