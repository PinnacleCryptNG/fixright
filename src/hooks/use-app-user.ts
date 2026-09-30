import { useAuth, useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { syncCurrentUser } from "@/lib/fixright.functions";
import type { AppUser } from "@/lib/types";

/**
 * Resolves the application user (and therefore the role) from the server.
 * The role always comes from application data, never from frontend state.
 */
export function useAppUser() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const sync = useServerFn(syncCurrentUser);

  const query = useQuery<AppUser>({
    queryKey: ["app-user", user?.id ?? null],
    enabled: isLoaded && isSignedIn && Boolean(user?.id),
    staleTime: 60_000,
    retry: false,
    queryFn: () =>
      sync({
        data: {
          fullName: user?.fullName ?? null,
          avatarUrl: user?.imageUrl ?? null,
        },
      }),
  });

  return {
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    appUser: query.data ?? null,
    role: query.data?.role ?? null,
    isPending: query.isPending || !isLoaded,
    error: query.error,
  };
}
