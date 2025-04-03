import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home/home.tsx"),
    // route("about", "routes/home2.tsx")
] satisfies RouteConfig;
