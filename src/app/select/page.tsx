import { redirect } from "next/navigation";

// CHILL//OS is a single-screen app now — old tabs land on "/".
export default function SelectRedirect() {
  redirect("/");
}
