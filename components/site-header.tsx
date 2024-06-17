"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import Image from "next/image";

export function SiteHeader({ className }: React.HTMLAttributes<HTMLElement>) {
  return (
    <footer className={cn(className)}>
      <div className="px-8 flex flex-col items-center justify-between gap-4 py-8 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-4 md:px-0">
          <Image
            src={
              "/logo.svg"
            }
            alt="Logo"
            width={"120"}
            height={"35"}
            style={{ width: 120, height: 35 }}
          />
        </div>
      </div>
    </footer>
  );
}
