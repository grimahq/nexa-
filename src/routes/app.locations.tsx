import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, ArrowRightLeft, MapPin, AlertTriangle, ShieldCheck } from "lucide-react";
import { useLocationTree } from "@/hooks/useLocations";
import { useItems, useLocations as useLocationsData } from "@/hooks/useInventoryData";
import { LocationTree } from "@/components/locations/LocationTree";
import { LocationSummary } from "@/components/locations/LocationSummary";
import { LocationFormSheet } from "@/components/locations/LocationFormSheet";
import { TransferStockSheet } from "@/components/locations/TransferStockSheet";
import { PermissionGate } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { toast } from "sonner";
import type { LocationTreeNode } from "@/hooks/useLocations";

export const Route = createFileRoute("/app/locations")({
  component: LocationsPage,
  head: () => ({ meta: [{ title: "Locations — Stackwise" }] }),
});

function findNode(nodes: LocationTreeNode[], id: string): LocationTreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

function LocationsPage() {
  const tree = useLocationTree();
  const { data: items } = useItems();
  const { data: allLocations } = useLocationsData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const { flags } = useFeatureFlags();

  const selectedNode = useMemo(
    () => (selectedId ? findNode(tree, selectedId) : null),
    [tree, selectedId],
  );

  const branchLimitReached = useMemo(() => {
    return allLocations.length >= flags.maxBranches;
  }, [allLocations.length, flags.maxBranches]);

  const handleCreateLocationClick = () => {
    if (branchLimitReached) {
      toast.error(
        `Subscription Limit Reached: Your current ${flags.planName} is capped at a maximum of ${flags.maxBranches} branch(es). Please contact your administrator or upgrade to unlock unlimited branches!`,
        { duration: 6000 }
      );
    } else {
      setFormOpen(true);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {branchLimitReached && (
        <div className="flex items-center justify-between p-3.5 bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-400 rounded-xl text-xs gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-sky-500 flex-shrink-0" />
            <span>
              <strong>Multi-Branch Gating Active:</strong> Your {flags.planName} has reached its branch capacity of {flags.maxBranches} location(s). To expand your retail presence and connect more branches, upgrade your license tier.
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Locations</h1>
          <p className="text-sm text-muted-foreground">
            {allLocations.length} of {flags.maxBranches} location{allLocations.length !== 1 && "s"} active
          </p>
        </div>
        <PermissionGate permission="create_item">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTransferOpen(true)}
            >
              <ArrowRightLeft className="mr-1.5 h-4 w-4" />
              Transfer Stock
            </Button>
            <Button size="sm" onClick={handleCreateLocationClick} className={branchLimitReached ? "opacity-60 cursor-not-allowed bg-neutral-300 hover:bg-neutral-300" : ""}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Location
            </Button>
          </div>
        </PermissionGate>
      </div>

      <ErrorBoundary>
      {tree.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No locations configured"
          description="Add warehouses, zones, and shelves to organize your inventory by location."
          actionLabel="Add Location"
          onAction={handleCreateLocationClick}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
          <div className="rounded-lg border border-border bg-card p-4">
            <LocationTree
              tree={tree}
              items={items}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            {selectedNode ? (
              <LocationSummary
                node={selectedNode}
                allLocations={allLocations}
                items={items}
              />
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Select a location to view details
              </p>
            )}
          </div>
        </div>
      )}
      </ErrorBoundary>

      <LocationFormSheet open={formOpen} onOpenChange={setFormOpen} />
      <TransferStockSheet open={transferOpen} onOpenChange={setTransferOpen} />
    </div>
  );
}
