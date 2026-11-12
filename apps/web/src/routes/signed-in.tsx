import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router";

import { useTRPC } from "~/lib/trpc";

/** Shows its pages to a signed-in Account only, and sends anyone else to the sign-in page. */
export default function SignedIn() {
  const trpc = useTRPC();
  // Someone signed out gets the same answer on every try, so there's nothing to retry.
  const me = useQuery(trpc.me.queryOptions(undefined, { retry: false }));

  if (me.isPending) return null;
  if (me.isError) {
    if (me.error.data?.code === "UNAUTHORIZED") return <Navigate to="/sign-in" replace />;
    return <p role="alert">The server didn't answer. Reload the page to try again.</p>;
  }
  return <Outlet />;
}
