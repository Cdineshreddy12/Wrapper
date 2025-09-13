import { cn } from "@/lib/utils";
import { Large, Muted } from "../ui/typography";

function GreetingCard({
  user,
  message = "Welcome to zopkit onboarding. We're glad to have you here!",
  className,
}: {
  user?: { givenName?: string; familyName?: string };
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn("leading-tight", className)}>
      <Large>
        Hello, {user ? `${user?.givenName} ${user?.familyName}` : "User"}!
      </Large>
      <Muted>{message}</Muted>
    </div>
  );
}

export default GreetingCard;
