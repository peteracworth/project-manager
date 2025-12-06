"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ListTodo, Users, ShoppingCart, FileText } from "lucide-react";

const tableLinks = [
  { label: "Projects", href: "/projects", icon: ListTodo },
  { label: "Users", href: "/users", icon: Users },
  { label: "Items", href: "/items", icon: ShoppingCart },
  { label: "Static Info", href: "/static-info", icon: FileText },
];

export function TableNavigation() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1">
      {tableLinks.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href || pathname.startsWith(link.href + "/");

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors",
              isActive
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <Icon className="w-4 h-4" />
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

