import { useState, useRef, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Check, Tag, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useCategories, useItems } from "@/hooks/useInventoryData";
import { useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/useInventoryMutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { SUPPORTED_UNITS } from "@/types/inventory";
import { CATEGORY_PRESETS, getCategorySupportedUnits } from "@/utils/categorySuggestions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function CategoryManager() {
  const { data: categories } = useCategories();
  const { data: items } = useItems();
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUnits, setEditUnits] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; itemCount: number } | null>(null);
  const [inlineError, setInlineError] = useState("");

  const addRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (adding) addRef.current?.focus(); }, [adding]);
  useEffect(() => { if (editingId) editRef.current?.focus(); }, [editingId]);

  const itemCountMap = new Map<string, number>();
  items.forEach((i) => { if (i.categoryId) itemCountMap.set(i.categoryId, (itemCountMap.get(i.categoryId) ?? 0) + 1); });

  const validate = (name: string, excludeId?: string): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return "Name is required";
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== excludeId))
      return "Category already exists";
    return null;
  };

  const handleAdd = () => {
    const err = validate(newName);
    if (err) { setInlineError(err); return; }
    const now = new Date().toISOString();
    createCat.mutate({ id: crypto.randomUUID(), name: newName.trim(), description: "", parentId: null, createdAt: now, updatedAt: now, supportedUnits: selectedUnits }, {
      onSuccess: () => { toast.success("Category created with specific units"); setNewName(""); setSelectedUnits([]); setAdding(false); setInlineError(""); },
    });
  };

  const handleRename = () => {
    if (!editingId) return;
    const err = validate(editName, editingId);
    if (err) { setInlineError(err); return; }
    updateCat.mutate({ id: editingId, updates: { name: editName.trim(), supportedUnits: editUnits } }, {
      onSuccess: () => { toast.success("Category updated"); setEditingId(null); setInlineError(""); },
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteCat.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Category deleted"); setDeleteTarget(null); },
    });
  };

  if (categories.length === 0 && !adding) {
    return (
      <EmptyState icon={Tag} title="No categories yet" description="Categories help organize your inventory items." actionLabel="Add Category" onAction={() => setAdding(true)} />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{categories.length} categories</p>
        <Button size="sm" variant="outline" onClick={() => { setAdding(true); setInlineError(""); setSelectedUnits([]); }}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Category
        </Button>
      </div>

      <div className="divide-y divide-border rounded-lg border border-border">
        {adding && (
          <div className="flex flex-col gap-3 p-3.5 bg-muted/20 border-b border-border">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Quick Industry Presets (One-tap category & unique units)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setNewName(preset.name);
                      setSelectedUnits(preset.supportedUnits);
                      setInlineError("");
                      toast.info(`Selected preset "${preset.name}" with unique units: ${preset.supportedUnits.join(", ")}`);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg border bg-card hover:bg-teal-50 hover:border-teal-300 dark:hover:bg-teal-950/40 text-foreground transition-all flex items-center gap-1 shadow-xs font-medium"
                  >
                    <span>{preset.emoji}</span>
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <Input ref={addRef} value={newName} onChange={(e) => { setNewName(e.target.value); setInlineError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setInlineError(""); } }}
                placeholder="Category name (e.g. Beverages or Pharmaceuticals)…" className="h-8 text-sm" />
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 border" onClick={handleAdd}><Check className="h-4 w-4 text-emerald-600" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 border" onClick={() => { setAdding(false); setInlineError(""); }}><X className="h-4 w-4 text-destructive" /></Button>
            </div>
            {inlineError && <p className="text-xs text-destructive">{inlineError}</p>}
            
            <div className="space-y-1.5 mt-1 border border-border bg-background p-2.5 rounded-lg">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Selected Compatible Unique Units</span>
              <div className="flex flex-wrap gap-1.5 p-0.5 max-h-[140px] overflow-y-auto">
                {SUPPORTED_UNITS.map(u => {
                  const isSel = selectedUnits.includes(u.id);
                  return (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => setSelectedUnits(prev => isSel ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${isSel ? 'bg-primary text-primary-foreground border-primary font-medium' : 'bg-background border-border hover:border-primary/40 text-muted-foreground'}`}
                    >
                      {u.label} ({u.id})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {categories.map((cat) => {
          const count = itemCountMap.get(cat.id) ?? 0;
          const isEditing = editingId === cat.id;

          return (
            <div key={cat.id} className="flex flex-col gap-2 p-3">
              {isEditing ? (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2">
                    <Input ref={editRef} value={editName} onChange={(e) => { setEditName(e.target.value); setInlineError(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") { setEditingId(null); setInlineError(""); } }}
                      className="h-8 text-sm" />
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 border" onClick={handleRename}><Check className="h-4 w-4 text-emerald-600" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 border" onClick={() => { setEditingId(null); setInlineError(""); }}><X className="h-4 w-4 text-destructive" /></Button>
                    {inlineError && <span className="text-xs text-destructive">{inlineError}</span>}
                  </div>
                  
                  <div className="space-y-1.5 mt-1 border border-border bg-background p-2.5 rounded-lg">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Edit Compatible Units</span>
                    <div className="flex flex-wrap gap-1.5 p-0.5 max-h-[140px] overflow-y-auto">
                      {SUPPORTED_UNITS.map(u => {
                        const isSel = editUnits.includes(u.id);
                        return (
                          <button
                            type="button"
                            key={u.id}
                            onClick={() => setEditUnits(prev => isSel ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                            className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${isSel ? 'bg-primary text-primary-foreground border-primary font-medium' : 'bg-background border-border hover:border-primary/40 text-muted-foreground'}`}
                          >
                            {u.label} ({u.id})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate max-w-[200px]" title={cat.name}>{cat.name.length > 50 ? cat.name.slice(0, 50) + "…" : cat.name}</span>
                      <Badge variant="secondary" className="text-xs">{count} item{count !== 1 && "s"}</Badge>
                    </div>
                    {cat.supportedUnits && cat.supportedUnits.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground max-w-[320px]">
                        <span className="font-semibold text-slate-400">Units:</span>
                        <div className="flex flex-wrap gap-1">
                          {cat.supportedUnits.map(unitId => (
                            <span key={unitId} className="bg-slate-100 text-slate-800 px-1 py-0.2 rounded text-[9px] font-mono font-medium">{unitId}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditUnits(cat.supportedUnits || []); setInlineError(""); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ id: cat.id, name: cat.name, itemCount: count })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {(deleteTarget?.itemCount ?? 0) > 0
                ? `${deleteTarget!.itemCount} item${deleteTarget!.itemCount !== 1 ? "s" : ""} use this category — they will become uncategorized.`
                : "This category has no linked items."}
              {" "}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
