import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatSessionRange } from "../_lib/format";
import { formatOrderNumber } from "../_lib/registration-rules";
import { SuccessView } from "./success-view";

// S08｜報名成功（Figma 42:2076／42:2188）。只有報名者本人讀得到（registrations RLS）。
type Row = {
  id: string;
  payment_method: string | null;
  sessions: {
    id: string;
    start_at: string;
    end_at: string;
    registration_deadline_at: string;
    courses: { title: string; location_name: string; min_participants: number } | null;
  } | null;
};


export default async function RegistrationSuccessPage({ params }: PageProps<"/registrations/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/registrations/${id}`)}`);

  const { data } = await supabase
    .from("registrations")
    .select(
      "id, payment_method, sessions(id, start_at, end_at, registration_deadline_at, courses(title, location_name, min_participants))",
    )
    .eq("id", id)
    .eq("learner_id", user.id)
    .maybeSingle()
    .overrideTypes<Row, { merge: false }>();

  const session = data?.sessions;
  const course = session?.courses;
  if (!data || !session || !course) notFound();

  const { data: counts } = await supabase.rpc("get_session_enrollment_counts", { p_session_ids: [session.id] });
  const enrolled: number = counts?.[0]?.enrolled_count ?? 0;

  return (
    <SuccessView
      orderNumber={formatOrderNumber(data.id)}
      title={course.title}
      location={course.location_name}
      paymentMethod={data.payment_method ?? "—"}
      deadline={formatDateTime(session.registration_deadline_at)}
      range={formatSessionRange(session.start_at, session.end_at)}
      enrolled={enrolled}
      minParticipants={course.min_participants}
    />
  );
}
