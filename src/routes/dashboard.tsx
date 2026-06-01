import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "../components/Dashboard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Zenith — غرفة التحكم" }] }),
  component: Dashboard,
});
