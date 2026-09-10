import { redirect } from "next/navigation";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; message?: string }>;
}) {
  const { token, message } = await searchParams;
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (message) params.set("message", message);
  const qs = params.toString();
  redirect(`/reset-password${qs ? `?${qs}` : ""}`);
}
