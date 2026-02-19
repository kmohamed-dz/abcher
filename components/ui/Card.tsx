import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export default function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-3xl bg-white p-6 shadow-card", className)} {...props} />;
}
