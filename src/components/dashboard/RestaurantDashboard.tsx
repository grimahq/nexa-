import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useItems } from "@/hooks/useInventoryData";
import { ChefHat, Clock, Flame, Leaf, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

export function RestaurantDashboard() {
  const { data: items } = useItems();
  
  const menuItems = items.filter(i => i.restaurant);
  
  // High prep time items
  const longPrepItems = [...menuItems]
    .sort((a, b) => (b.restaurant?.preparationTime || 0) - (a.restaurant?.preparationTime || 0))
    .slice(0, 5);

  const vegetarianCount = menuItems.filter(i => i.restaurant?.isVegetarian).length;

  return (
    <div className="space-y-6">
      {/* Restaurant Kitchen KPIs */}
      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Menu Catalog", value: menuItems.length, sub: "Items Active", icon: ChefHat, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Plant Based", value: vegetarianCount, sub: "V/V+ Options", icon: Leaf, color: "text-green-600", bg: "bg-green-50" },
          { label: "Spicy Items", value: menuItems.filter(i => i.restaurant?.spiceLevel === "hot").length, sub: "Signature Kick", icon: Flame, color: "text-red-600", bg: "bg-red-50" },
          { label: "Avg Prep", value: "18m", sub: "Kitchen Target", icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
        ].map((stat, i) => (
          <div key={i} className={cn("rounded-xl border border-border p-4 shadow-xs", stat.bg)}>
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("p-2 rounded-lg bg-background border border-border/50", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tabular-nums">{stat.value}</span>
              <span className="text-[10px] font-medium text-muted-foreground">{stat.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-[3fr_2fr]">
        <Card className="border-border shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 pb-3">
             <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-primary" />
                  Popular Menu Highlights
                </CardTitle>
                <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-tighter bg-background px-2">Top Performer</Badge>
             </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {menuItems.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-orange-100/50 flex items-center justify-center text-xl shadow-xs border border-orange-200/30">
                      {item.emoji || "🍲"}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.restaurant?.isVegetarian && (
                          <span className="flex items-center gap-0.5 text-[8px] font-black uppercase text-green-600 tracking-tight">
                            <Leaf className="h-2 w-2" /> Veg
                          </span>
                        )}
                        {item.restaurant?.spiceLevel === "hot" && (
                          <span className="flex items-center gap-0.5 text-[8px] font-black uppercase text-red-600 tracking-tight">
                            <Flame className="h-2 w-2" /> Spicy
                          </span>
                        )}
                        <span className="text-[9px] font-bold text-muted-foreground flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded">
                          <Clock className="h-2.5 w-2.5" /> {item.restaurant?.preparationTime || 15}m
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold font-mono tracking-tight text-foreground">
                      ₦{item.sellingPrice.toLocaleString()}
                    </p>
                    <div className="mt-1">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[8px] font-black uppercase text-primary border border-primary/20">
                        Trending
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-muted/10">
               <Button variant="ghost" className="w-full h-8 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-orange-600">
                 View Full Menu & Prep Times
               </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm flex flex-col">
          <CardHeader className="bg-muted/30 pb-3">
             <CardTitle className="text-sm font-bold flex items-center gap-2">
               <ChefHat className="h-4 w-4 text-primary" />
               Current Kitchen Capacity
             </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col items-center justify-center relative overflow-hidden">
             {/* Abstract Gauge */}
             <div className="relative w-48 h-24 mb-10">
                <div className="absolute inset-0 rounded-t-full border-8 border-muted" />
                <div 
                  className="absolute inset-0 rounded-t-full border-8 border-primary border-r-transparent border-b-transparent rotate-[45deg] origin-bottom transition-all duration-1000" 
                  style={{ transform: "rotate(25deg)" }}
                />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                   <span className="text-3xl font-black tabular-nums">42%</span>
                   <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Utilized</span>
                </div>
             </div>
             
             <div className="w-full space-y-4">
                <div className="p-3 rounded-xl border border-orange-100 bg-orange-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase text-orange-800">Prep Backlog</span>
                    <span className="text-[10px] font-bold text-orange-900">4 Orders</span>
                  </div>
                  <div className="h-1.5 w-full bg-orange-200/50 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-orange-500" />
                  </div>
                </div>
                
                <p className="text-center text-[9px] text-muted-foreground leading-relaxed px-4">
                  Capacity is measured by active tickets vs. workstations. Current kitchen flow is **stable**.
                </p>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
