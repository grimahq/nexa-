import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  Video,
  FileText,
  Lock,
  Edit2,
  Trash2,
  Eye,
  Share2,
  Sparkles,
  TrendingUp,
  BarChart2,
  Check,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Copy,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import {
  CourseModule,
  getCourseModules,
  saveCourseModules,
  getCourseResourceAnalytics,
  trackResourceEvent,
} from "@/lib/course-data";
import { ProtectedTourGuideViewer } from "@/components/shared/ProtectedTourGuideViewer";

export function ResourceManagementConsole() {
  const [modules, setModules] = useState<CourseModule[]>(() => getCourseModules());
  const [analytics, setAnalytics] = useState(() => getCourseResourceAnalytics());

  // Listen for sync updates
  useEffect(() => {
    const handleUpdate = () => {
      setModules(getCourseModules());
      setAnalytics(getCourseResourceAnalytics());
    };
    window.addEventListener("stackwise_course_modules_updated", handleUpdate);
    return () => window.removeEventListener("stackwise_course_modules_updated", handleUpdate);
  }, []);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [deletingModule, setDeletingModule] = useState<CourseModule | null>(null);
  const [previewModule, setPreviewModule] = useState<CourseModule | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CourseModule["category"]>("pitch");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("5 mins");
  const [videoUrl, setVideoUrl] = useState("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const [pitchScript, setPitchScript] = useState("");
  const [tourGuidePdfTitle, setTourGuidePdfTitle] = useState("");
  const [tourGuideContent, setTourGuideContent] = useState("");
  const [shareableTourSlug, setShareableTourSlug] = useState("");

  const resetForm = () => {
    setTitle("");
    setCategory("pitch");
    setDescription("");
    setDuration("5 mins");
    setVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    setPitchScript("");
    setTourGuidePdfTitle("");
    setTourGuideContent("");
    setShareableTourSlug("");
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (mod: CourseModule) => {
    setEditingModule(mod);
    setTitle(mod.title);
    setCategory(mod.category);
    setDescription(mod.description);
    setDuration(mod.duration);
    setVideoUrl(mod.videoUrl || "");
    setPitchScript(mod.pitchScript || "");
    setTourGuidePdfTitle(mod.tourGuidePdfTitle || "");
    setTourGuideContent(mod.tourGuideContent || "");
    setShareableTourSlug(mod.shareableTourSlug || "");
  };

  const handleCreateModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Module title is required.");
      return;
    }

    const newModule: CourseModule = {
      id: `mod-${Date.now()}`,
      title: title.trim(),
      category,
      description: description.trim(),
      duration: duration.trim() || "5 mins",
      videoUrl: videoUrl.trim(),
      pitchScript: pitchScript.trim(),
      tourGuidePdfTitle: tourGuidePdfTitle.trim() || `${title.trim()}.pdf`,
      tourGuideContent: tourGuideContent.trim(),
      shareableTourSlug: shareableTourSlug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      updatedAt: new Date().toISOString().slice(0, 10),
      viewCount: 0,
      playCount: 0,
      shareCount: 0,
    };

    const updated = [newModule, ...modules];
    saveCourseModules(updated);
    setModules(updated);
    setAnalytics(getCourseResourceAnalytics());
    setIsCreateOpen(false);
    resetForm();
    toast.success(`Resource module "${newModule.title}" created successfully!`);
  };

  const handleUpdateModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule) return;

    const updated = modules.map((m) => {
      if (m.id === editingModule.id) {
        return {
          ...m,
          title: title.trim(),
          category,
          description: description.trim(),
          duration: duration.trim(),
          videoUrl: videoUrl.trim(),
          pitchScript: pitchScript.trim(),
          tourGuidePdfTitle: tourGuidePdfTitle.trim(),
          tourGuideContent: tourGuideContent.trim(),
          shareableTourSlug: shareableTourSlug.trim(),
          updatedAt: new Date().toISOString().slice(0, 10),
        };
      }
      return m;
    });

    saveCourseModules(updated);
    setModules(updated);
    setAnalytics(getCourseResourceAnalytics());
    setEditingModule(null);
    toast.success(`Resource module updated successfully!`);
  };

  const handleDeleteModule = () => {
    if (!deletingModule) return;
    const updated = modules.filter((m) => m.id !== deletingModule.id);
    saveCourseModules(updated);
    setModules(updated);
    setAnalytics(getCourseResourceAnalytics());
    toast.success(`Module "${deletingModule.title}" deleted.`);
    setDeletingModule(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card & Global Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-muted-foreground/15 rounded-2xl p-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold font-sans text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Super Admin Marketing & Training Resources Console
            </h2>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold uppercase">
              Live HQ Control
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Set, edit, delete, and track video training URLs, pitch scripts, protected tour guides, and field agent demo passes.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          size="sm"
          className="text-xs font-bold h-9 bg-primary hover:bg-primary/95 text-primary-foreground gap-1.5 shrink-0 shadow"
        >
          <Plus className="h-4 w-4" /> Add New Course / Tour Resource
        </Button>
      </div>

      {/* Analytics Tracking Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-none border border-muted-foreground/15">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Modules</span>
              <p className="text-xl font-bold font-mono text-foreground">{analytics.totalModules}</p>
            </div>
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <BookOpen className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-muted-foreground/15">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Resource Views</span>
              <p className="text-xl font-bold font-mono text-foreground">{analytics.totalViews}</p>
            </div>
            <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
              <Eye className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-muted-foreground/15">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Video Plays</span>
              <p className="text-xl font-bold font-mono text-rose-500">{analytics.totalVideoPlays}</p>
            </div>
            <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl">
              <Video className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-muted-foreground/15">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Tour Shares</span>
              <p className="text-xl font-bold font-mono text-emerald-500">{analytics.totalTourShares}</p>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Share2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modules Table & Management List */}
      <Card className="shadow-none border border-muted-foreground/15 overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-muted-foreground/10 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold font-sans flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Active Resource Modules Directory ({modules.length})
            </CardTitle>
            <span className="text-[11px] font-mono text-muted-foreground">
              Last Synced: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-muted-foreground/10">
            {modules.map((mod) => (
              <div key={mod.id} className="p-4 hover:bg-muted/10 transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">
                        {mod.category}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {mod.duration}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">ID: {mod.id}</span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground font-sans">{mod.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{mod.description}</p>
                  </div>

                  {/* Actions & Metrics */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="flex items-center gap-3 bg-muted/30 px-3 py-1 rounded-lg border text-[11px] font-mono text-muted-foreground">
                      <span title="Views">👁️ {mod.viewCount || 0}</span>
                      <span title="Video Plays">▶️ {mod.playCount || 0}</span>
                      <span title="Tour Shares">🔗 {mod.shareCount || 0}</span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 font-bold"
                      onClick={() => {
                        trackResourceEvent(mod.id, "view");
                        setPreviewModule(mod);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 text-blue-500" /> Preview
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 font-bold"
                      onClick={() => handleOpenEdit(mod)}
                    >
                      <Edit2 className="h-3.5 w-3.5 text-amber-500" /> Edit
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                      onClick={() => setDeletingModule(mod)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Video URL & Script Quick Details */}
                <div className="grid gap-2 sm:grid-cols-2 text-[11px] font-sans bg-muted/20 p-2.5 rounded-lg border border-muted-foreground/10">
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground font-bold flex items-center gap-1">
                      <Video className="h-3 w-3 text-rose-500" /> Video URL:
                    </span>
                    <a
                      href={mod.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline truncate block font-mono hover:opacity-80"
                      onClick={() => trackResourceEvent(mod.id, "play_video")}
                    >
                      {mod.videoUrl}
                    </a>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-muted-foreground font-bold flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-500" /> Pitch Script:
                    </span>
                    <p className="italic text-foreground line-clamp-1">{mod.pitchScript || "None configured"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CREATE MODULE DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Create New Course & Marketing Resource
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a new video training module, field pitch script, or protected tour guide document for agents.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateModule} className="space-y-4 text-xs">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="font-semibold">Resource Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 3-Minute Quick Supermarket Pitch"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category" className="font-semibold">Category</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CourseModule["category"])}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
                >
                  <option value="pitch">Pitch Script & Sales</option>
                  <option value="onboarding">Store Onboarding</option>
                  <option value="features">Feature Deep Dive</option>
                  <option value="objections">Objection Handling</option>
                  <option value="tour">HQ & Chain Store Tour</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="duration" className="font-semibold">Module Duration</Label>
                <Input
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 5 mins"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="video-url" className="font-semibold">Video Tutorial URL (YouTube/Loom)</Label>
                <Input
                  id="video-url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="font-semibold">Module Overview & Objective</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what field agents will learn from this module..."
                className="text-xs min-h-[60px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pitch-script" className="font-semibold">Agent Field Pitch Script</Label>
              <Textarea
                id="pitch-script"
                value={pitchScript}
                onChange={(e) => setPitchScript(e.target.value)}
                placeholder="Exact 2-3 sentence speech for field agents when speaking to retail business owners..."
                className="text-xs min-h-[70px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tour-content" className="font-semibold">Protected Tour Guide Document Text</Label>
              <Textarea
                id="tour-content"
                value={tourGuideContent}
                onChange={(e) => setTourGuideContent(e.target.value)}
                placeholder="=== STACKWISE TOUR MANUAL ===&#10;1. POS Checkout&#10;2. Expiry Alerts..."
                className="text-xs font-mono min-h-[100px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground font-bold">
                Save &amp; Publish Module
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT MODULE DIALOG */}
      <Dialog open={!!editingModule} onOpenChange={() => setEditingModule(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-amber-500" /> Edit Resource Module
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateModule} className="space-y-4 text-xs">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="font-semibold">Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-xs" required />
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold">Category</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CourseModule["category"])}
                  className="w-full h-9 px-3 rounded-md border text-xs"
                >
                  <option value="pitch">Pitch Script</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="features">Features</option>
                  <option value="objections">Objections</option>
                  <option value="tour">Tour</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold">Video URL</Label>
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="h-9 text-xs font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold">Pitch Script</Label>
              <Textarea value={pitchScript} onChange={(e) => setPitchScript(e.target.value)} className="text-xs min-h-[60px]" />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold">Tour Guide Content</Label>
              <Textarea value={tourGuideContent} onChange={(e) => setTourGuideContent(e.target.value)} className="text-xs font-mono min-h-[100px]" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingModule(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground font-bold">
                Update Module
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={!!deletingModule} onOpenChange={() => setDeletingModule(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-500 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Confirm Resource Deletion
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete "{deletingModule?.title}"? This will remove the resource for all field agents.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeletingModule(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteModule}>
              Delete Resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PREVIEW TOUR GUIDE DIALOG */}
      <Dialog open={!!previewModule} onOpenChange={() => setPreviewModule(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" /> Live Protected Canvas Preview
            </DialogTitle>
          </DialogHeader>

          {previewModule && (
            <ProtectedTourGuideViewer module={previewModule} agentName="Super Admin Preview" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
