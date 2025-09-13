import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { useEffect, useState } from "react";

const possibleEmailFields = [
  "email",
  "preferred_email",
  "email_address",
  "mail",
  "user_email",
];

function useKindeUserEmail() {
  const { user } = useKindeAuth();
  const [email, setEmail] = useState<string>("");
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    if (user) {
      console.log("📋 Full Kinde user object:", user);

      // Try multiple email field variations
      let foundEmail = null;

      // Cast user to a more permissive type so we can index with dynamic keys
      const userRecord = user as Record<string, unknown>;
      for (const field of possibleEmailFields) {
        if (userRecord[field]) {
          foundEmail = userRecord[field] as string;
          console.log(`✅ Found email in field '${field}':`, foundEmail);
          break;
        }
      }

      if (foundEmail) {
        console.log("✅ Setting email in form:", foundEmail);
        setEmail(foundEmail);
        setIsUserAuthenticated(true);
        setIsLoadingUser(false);
      } else {
        console.log("❌ No email found in any expected field");
        console.log("Available fields:", Object.keys(user));
        setIsUserAuthenticated(false);
        setIsLoadingUser(false);
      }
    } else {
      console.log("❌ No user object from Kinde yet");
      setIsUserAuthenticated(false);
      setIsLoadingUser(true); // Keep loading if no user yet
    }
  }, [user]);
  return { email, user, isUserAuthenticated, isLoadingUser };
}

export default useKindeUserEmail;
