import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useRole } from "@/hooks/useRole";

export const Route = createFileRoute("/app/")({
  component: AppIndex,
});

function AppIndex() {
  const { permissions } = useRole();
  const dest = permissions?.canViewDashboard ? "/app/dashboard" : "/app/sales";
  return <Navigate to={dest} />;
}
