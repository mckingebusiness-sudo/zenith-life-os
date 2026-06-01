import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../components/Dashboard";

export const Route = createFileRoute("/kanban")({
  head: () => ({ meta: [{ title: "Zenith — المشاريع" }] }),
  component: () => <Placeholder title="المشاريع" />,
});
