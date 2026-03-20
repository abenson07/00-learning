import SettingsForm from "@/app/settings/settings-form";
import { getAuthUser, getUserProfileForUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const auth = await getAuthUser();
  if (!auth) {
    return (
      <p className="text-muted-foreground text-sm">
        Profile settings are not available.
      </p>
    );
  }

  const profile = await getUserProfileForUser(auth.userId);

  return (
    <div className="flex flex-col gap-6">
      <SettingsForm
        initialOccupation={profile?.occupation ?? ""}
        initialContext={profile?.context ?? ""}
        initialLearningStyle={profile?.learning_style ?? ""}
        role={profile?.role ?? "student"}
      />
    </div>
  );
}
