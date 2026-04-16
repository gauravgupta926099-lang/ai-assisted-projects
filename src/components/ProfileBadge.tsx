import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileBadgeProps {
  userId: string;
}

export function ProfileBadge({ userId }: ProfileBadgeProps) {
  const [xp, setXp] = useState(0);
  const [name, setName] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("xp, display_name")
        .eq("user_id", userId)
        .single();
      if (data) {
        setXp(data.xp);
        setName(data.display_name ?? "Student");
      }
    };
    fetchProfile();
  }, [userId]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[80px]">
        {name}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-quest-xp/20 px-2 py-0.5 text-xs font-heading text-quest-xp">
        ⭐ {xp} XP
      </span>
    </div>
  );
}
