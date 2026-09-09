import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to dashboard, which is protected by middleware
  redirect("/dashboard");
}
