import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Shield, Calendar, Lock, KeyRound, Save } from "lucide-react";
import { toast } from "sonner";

export function ProfileSettings() {
  const { profile, updateProfileName, updateProfileDescription, sendPasswordReset, updateUserPassword } = useAuth();
  
  const [name, setName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  
  const [description, setDescription] = useState("");
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setDescription(profile.description || "");
    }
  }, [profile]);

  if (!profile) return null;

  const handleSaveDescription = async () => {
    setIsSavingDescription(true);
    try {
      await updateProfileDescription(description);
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || "Failed to update biography");
    } finally {
      setIsSavingDescription(false);
    }
  };

  const handleSaveName = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setIsSavingName(true);
    try {
      await updateProfileName(name);
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || "Failed to update name");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updateUserPassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || "Failed to update password. You may need to log in again to perform this sensitive action.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSendResetEmail = async () => {
    setIsSendingReset(true);
    try {
      await sendPasswordReset();
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setIsSendingReset(false);
    }
  };

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
              <div className="flex gap-2">
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                />
                <Button 
                  onClick={handleSaveName} 
                  disabled={isSavingName || name === profile.name}
                  className="flex items-center gap-1.5"
                >
                  <Save className="h-4 w-4" />
                  {isSavingName ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" /> Email Address
              </Label>
              <Input id="email" value={profile.email} readOnly disabled className="bg-muted/30" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" /> Account Role
              </Label>
              <Input id="role" value={profile.role} className="capitalize bg-muted/30" readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="joined" className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" /> Joined Date
              </Label>
              <Input 
                id="joined" 
                value={profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : "N/A"} 
                readOnly 
                disabled 
                className="bg-muted/30"
              />
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-border">
            <Label htmlFor="bio" className="flex items-center gap-2 text-sm font-semibold">
              Personal Biography & Shift Description
            </Label>
            <p className="text-xs text-muted-foreground">Describe your role, typical shifts, qualifications, or personal notes to share with other admins.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <textarea
                id="bio"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write a short description about yourself, your qualifications, typical work shifts..."
                className="flex-1 min-h-[100px] rounded-lg border bg-background p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button 
                onClick={handleSaveDescription} 
                disabled={isSavingDescription || description === (profile.description || "")}
                className="sm:self-end flex items-center gap-1.5 h-10 px-4"
              >
                <Save className="h-4 w-4" />
                {isSavingDescription ? "Saving..." : "Save Bio"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security & Password</CardTitle>
          <CardDescription>Update your password or request a password reset email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-sm">Forgot Password or Need a Fast Link?</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                We can send a secure, direct link to your email address ({profile.email}) to reset your password. You'll be logged out across devices once complete.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleSendResetEmail} 
              disabled={isSendingReset}
              className="md:self-center shrink-0"
            >
              <KeyRound className="h-4 w-4 mr-2" />
              {isSendingReset ? "Sending Link..." : "Send Reset Link"}
            </Button>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 pt-4 border-t border-border">
            <h4 className="font-semibold text-sm">Change Password Directly</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input 
                  id="new-password" 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input 
                  id="confirm-password" 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="submit" 
                disabled={isUpdatingPassword || !newPassword || !confirmPassword}
              >
                <Lock className="h-4 w-4 mr-2" />
                {isUpdatingPassword ? "Updating Password..." : "Update Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
