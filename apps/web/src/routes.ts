import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  route("sign-in", "routes/sign-in.tsx"),
  // Every page inside needs a signed-in Account.
  layout("routes/signed-in.tsx", [index("routes/home.tsx")]),
] satisfies RouteConfig;
