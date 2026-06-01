import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../components/Dashboard";

export const Route = createFileRoute("/expenses")({
  head: () => ({ meta: [{ title: "Zenith — المصاريف" }] }),
  component: () => <Placeholder title="المصاريف" />,
});
