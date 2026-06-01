import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../components/Dashboard";

export const Route = createFileRoute("/notes")({
  head: () => ({ meta: [{ title: "Zenith — الملاحظات" }] }),
  component: () => <Placeholder title="الملاحظات" />,
});
