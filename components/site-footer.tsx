"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

export function SiteFooter({ className }: React.HTMLAttributes<HTMLElement>) {
  return (
    <footer className={cn(className)}>
      <div className="px-8 flex flex-col items-center justify-between gap-4 py-10 lg:h-24 lg:flex-row lg:py-0">
        <div className="flex flex-col items-center gap-4 px-8 lg:flex-row lg:gap-2 lg:px-0">
          <Image
            src={
              "https://www.availproject.org/_next/static/media/avail_logo.9c818c5a.png"
            }
            alt="Logo"
            width={"120"}
            height={"35"}
            style={{ width: 120, height: 35 }}
          />
          <p className="text-center text-sm leading-loose lg:text-left md:ml-2">
            Built by{" "}
            <a
              href={"https://www.availproject.org"}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              Avail
            </a>
            {" "} - {new Date().getFullYear()} All rights reserved. Check us on{" "}
            <a
              href={"https://github.com/availproject/"}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              GitHub
            </a>
            .
          </p>
        </div>
        <div className="flex gap-2">
          <div>More questions ?</div>
          <Link href={"https://forum.availproject.org/"} target="_blank" className="text-gray-400 underline underline-offset-4">Avail Forum</Link>
        </div>
      </div>
    </footer>
  );
}
