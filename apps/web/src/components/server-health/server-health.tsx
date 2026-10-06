import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "~/lib/trpc";

import "./server-health.scss";

export function ServerHealth() {
  const trpc = useTRPC();
  const health = useQuery(trpc.health.queryOptions());

  if (health.isPending) return <p className="server-health">Asking the server…</p>;
  if (health.isError)
    return (
      <p className="server-health" role="alert">
        The server didn't answer.
      </p>
    );
  return (
    <p className="server-health">
      Server is {health.data.status}, version {health.data.version}
    </p>
  );
}
