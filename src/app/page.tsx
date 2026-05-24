import { redirect } from "next/navigation";

// Root path — middleware handles auth; redirect to the main app.
export default function Home() {
  redirect("/dashboard");
}
