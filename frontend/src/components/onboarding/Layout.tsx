import React from "react";
import Logo from "../common/Logo";
import { LucideIcon } from "lucide-react";

function Layout({
  children,
  sidebar,
  footer,
  actionBar,
  iconConfig,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  footer?: React.ReactNode;
  actionBar?: React.ReactNode;
  iconConfig?: {
    icon: LucideIcon;
    color: string;
  };
}) {
  const { icon: Icon, color: iconColor } = iconConfig || {};
  return (
    <div className="min-h-screen flex bg-blue-100">
      <section className="grid grid-cols-[320px_1fr] gap-8 w-full min-h-screen">
        <aside className="p-8 pr-4 flex flex-col relative">
          <Logo variant="blue" size="lg" showText={true} />
          {sidebar && (
            <div className="space-y-4 flex-1">
              {sidebar}
            </div>
          )}
          {footer && (
            <div className="mt-auto">
              {footer}
            </div>
          )}
          {Icon && <Icon size={160} color={iconColor} className="opacity-10 absolute bottom-0 right-0" />}
        </aside>
        <main className="bg-background p-18 pb-4 rounded-s-[60px] shadow-md relative flex flex-col h-screen max-h-screen">
          {/* Help link in top right */}
          <div className="absolute top-6 right-6 text-sm text-gray-600">
            Having troubles? <a href="#" className="text-blue-600 hover:text-blue-800 underline">Get Help</a>
          </div>
          
          {/* Onboarding steps will go here */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
          {actionBar && <div className="flex-shrink-0 px-0 py-6 ">{actionBar}</div>}
        </main>
      </section>
    </div>
  );
}

export default Layout;
