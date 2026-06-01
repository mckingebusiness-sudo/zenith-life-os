import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../components/Dashboard";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Zenith — التحليلات" }] }),
  component: () => <Placeholder title="التحليلات" />,
});
