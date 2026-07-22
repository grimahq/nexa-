import { createFileRoute } from "@tanstack/react-router";
import { SuperAdminGeoMap } from "@/components/admin/SuperAdminGeoMap";

export const Route = createFileRoute("/app/super-admin/map")({
  component: SuperAdminMapPage,
});

function SuperAdminMapPage() {
  return <SuperAdminGeoMap />;
}
