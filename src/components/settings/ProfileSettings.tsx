import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Shield, Calendar } from "lucide-react";

export function ProfileSettings() {
  const { profile, user } = useAuth();

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>View and manage your account information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">{profile.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="capitalize">{profile.role}</Badge>
                <span className="text-xs text-muted-foreground">User ID: {profile.id.substring(0, 8)}...</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" /> Full Name
              </Label>
              <Input id="name" value={profile.name} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" /> Email Address
              </Label>
              <Input id="email" value={profile.email} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" /> Account Role
              </Label>
              <Input id="role" value={profile.role} className="capitalize" readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="joined" className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" /> Joined Date
              </Label>
              <Input 
                id="joined" 
                value={new Date(profile.createdAt).toLocaleDateString("en-US", { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} 
                readOnly 
                disabled 
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border mt-6">
            <p className="text-xs text-muted-foreground mb-4">
              To change your display name or password, please contact your store administrator.
            </p>
            <Button variant="outline" disabled>Change Password</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
