import { Button } from "../ui";
import { AlertCircle, CheckCircle, LoaderIcon, RefreshCw, User } from "lucide-react";
import useKindeUserEmail from "@/hooks/useKindeUserEmail";

function AuthStatusCard() {
  const { email, isUserAuthenticated, isLoadingUser } = useKindeUserEmail();

  const handleRefresh = () => {
    console.log("🔄 Manual refresh triggered");
    window.location.reload();
  };

  return (
    <div className="w-full">
      {isLoadingUser ? (
        <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-md">
          <div className="flex items-center gap-2">
            <LoaderIcon className="animate-spin h-4 w-4 text-white/70"/>
            <span className="text-sm text-white/80">Loading...</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="text-xs text-white/60 hover:text-white/80 hover:bg-white/10"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      ) : isUserAuthenticated ? (
        <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-md">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <div>
              <p className="text-xs text-white/60">Signed in as</p>
              <p className="text-sm text-white/90 flex items-center gap-1">
                <User className="h-3 w-3" />
                {email}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <div>
              <p className="text-sm text-white/90">Not authenticated</p>
              <p className="text-xs text-white/60">Please sign in</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="text-xs text-white/60 hover:text-white/80 hover:bg-white/10"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default AuthStatusCard;
