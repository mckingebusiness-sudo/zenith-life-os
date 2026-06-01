import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../components/Dashboard";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Zenith — الإعدادات" }] }),
  component: () => <Placeholder title="الإعدادات" />,
});
