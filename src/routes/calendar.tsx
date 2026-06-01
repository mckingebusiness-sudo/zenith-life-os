import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../components/Dashboard";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Zenith — التقويم" }] }),
  component: () => <Placeholder title="التقويم" />,
});
