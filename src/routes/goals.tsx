import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../components/Dashboard";

export const Route = createFileRoute("/goals")({
  head: () => ({ meta: [{ title: "Zenith — الأهداف" }] }),
  component: () => <Placeholder title="الأهداف" />,
});
