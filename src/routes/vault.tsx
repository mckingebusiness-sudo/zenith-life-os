import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../components/Dashboard";

export const Route = createFileRoute("/vault")({
  head: () => ({ meta: [{ title: "Zenith — الخزنة" }] }),
  component: () => <Placeholder title="الخزنة" />,
});
