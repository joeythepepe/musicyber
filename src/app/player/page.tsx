import { redirect } from "next/navigation";

// Musicyber is a single-screen app now — old tabs land on "/".
export default function PlayerRedirect() {
  redirect("/");
}
