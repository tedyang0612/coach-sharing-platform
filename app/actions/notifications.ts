"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const NOTIFICATIONS_PATH = "/notifications";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(NOTIFICATIONS_PATH)}`);
  }
  return { supabase, user };
}

/** 打開一則通知查看完整內容時，把它標成已讀。 */
export async function markNotificationRead(id: string) {
  const { supabase, user } = await requireUser();

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("recipient_id", user.id);

  revalidatePath(NOTIFICATIONS_PATH);
}

export async function markAllNotificationsRead() {
  const { supabase, user } = await requireUser();

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_id", user.id)
    .eq("is_read", false);

  revalidatePath(NOTIFICATIONS_PATH);
}
