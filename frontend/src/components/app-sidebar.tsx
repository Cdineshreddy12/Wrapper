import * as React from "react"
import {
  Activity,
  AudioWaveform,
  BarChart3,
  Building2,
  Command,
  CreditCard,
  Crown,
  GalleryVerticalEnd,
  LayoutDashboard,
  Shield,
  Users,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Separator } from "./ui"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Zopkit",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Silent Readers",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Unity",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [  
          {
            title: "Overview",
            url: "/dashboard/overview",
            icon: BarChart3,
          },
          {
            title: "Applications",
            url: "/applications",
            icon: Building2,
          },
          {
            title: "Team",
            url: "/users",
            icon: Users,
          },
          {
            title: "Roles",
            url: "/roles",
            icon: Crown,
          },
          {
            title: "App Management",
            url: "/user-application-management",
            icon: Shield,
          },
          {
            title: "Analytics",
            url: "/analytics",
            icon: Activity,
          },
    ],
  // navMain: [
  //   {
  //     title: "Dashboard",
  //     url: "/dashboard",
  //     icon: LayoutDashboard,
  //     isActive: true,
  //     items: [
  //       {
  //         title: "Overview",
  //         url: "/dashboard?tab=overview",
  //         icon: BarChart3,
  //       },
  //       {
  //         title: "Applications",
  //         url: "/dashboard?tab=applications",
  //         icon: Building2,
  //       },
  //       {
  //         title: "Team",
  //         url: "/dashboard?tab=users",
  //         icon: Users,
  //       },
  //       {
  //         title: "Roles",
  //         url: "/dashboard?tab=roles",
  //         icon: Crown,
  //       },
  //       {
  //         title: "App Management",
  //         url: "/dashboard/user-application-management",
  //         icon: Shield,
  //       },
  //       {
  //         title: "Analytics",
  //         url: "/dashboard?tab=analytics",
  //         icon: Activity,
  //       },
  //     ],
  //   },
    
   
  // ],
  projects: [
    {
      name: "Billing",
      url: "/dashboard/billing",
      icon: CreditCard,
    },
    {
      name: "Usage",
      url: "/dashboard/usage",
      icon: Activity,
    },
    {
      name: "Admin",
      url: "/admin",
      icon: Crown,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <Separator className="mt-auto"/>
        <NavProjects projects={data.projects} />
        <Separator />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
