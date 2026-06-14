"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, UploadCloud, MessageSquare, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const navLinks = [
    { name: "Chat", href: "/", icon: MessageSquare },
    { name: "Bulk Upload", href: "/upload", icon: UploadCloud },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
              Source Trace
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:block flex-1 max-w-md mx-8">
            <div className="flex space-x-1 p-1 bg-muted/50 rounded-full border border-border/50 backdrop-blur-md">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="relative flex-1"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 bg-background rounded-full shadow-sm border border-border/50"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <div
                      className={cn(
                        "relative flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors z-10",
                        isActive
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {link.name}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-full hover:bg-muted transition-colors border border-transparent hover:border-border"
                aria-label="Toggle theme"
              >
                <motion.div
                  initial={{ rotate: -45, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === "dark" ? (
                    <Sun className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Moon className="w-5 h-5 text-slate-700" />
                  )}
                </motion.div>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
