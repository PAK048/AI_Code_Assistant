"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

/**
 * Navbar Component
 *
 * Top navigation bar with two tabs: Chat and Software Metrics
 * Features:
 * - Active tab highlighting
 * - Smooth transitions with Framer Motion
 * - Responsive design
 * - Consistent with existing Tailwind styling
 */
export default function Navbar() {
  const pathname = usePathname();

  const tabs = [
    { name: "Chat", path: "/chat", icon: "💬" },
    { name: "Software Metrics", path: "/metrics", icon: "📊" },
    { name: "Testing", path: "/testing", icon: "🧪" },
  ];

  const isActive = (path) => {
    return pathname === path || (pathname === "/" && path === "/chat");
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link href="/chat" className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
              CodeEcho
            </span>
          </Link>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1">
            {tabs.map((tab) => {
              const active = isActive(tab.path);
              return (
                <Link key={tab.path} href={tab.path}>
                  <motion.div
                    className={`relative px-6 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                      active
                        ? "text-emerald-400"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="flex items-center space-x-2">
                      <span>{tab.icon}</span>
                      <span>{tab.name}</span>
                    </span>
                    {active && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-slate-700/70 rounded-md -z-10"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </div>

          {/* Hackathon Badge */}
          <div className="hidden md:block text-xs uppercase tracking-widest text-emerald-500 font-semibold">
            IBM Agentic AI 2025
          </div>
        </div>
      </div>
    </nav>
  );
}
