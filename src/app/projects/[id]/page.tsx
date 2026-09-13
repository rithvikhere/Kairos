"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * The old plain project page has been removed.
 * All project workspaces, scenarios, and options are now consolidated
 * into the rich Kairos dashboard at /projects.
 * Any incoming requests to /projects/[id] are seamlessly redirected.
 */
export default function ProjectRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string | undefined;

  useEffect(() => {
    if (projectId) {
      router.replace(`/projects?projectId=${encodeURIComponent(projectId)}`);
    } else {
      router.replace("/projects");
    }
  }, [projectId, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f6f4ef] text-[#221f1b]">
      <div className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-[#faf8f4] border border-[#221f1b]/10 shadow-lg">
        <div className="w-8 h-8 rounded-full border-2 border-[#2c4356] border-t-transparent animate-spin" />
        <p className="text-xs text-[#221f1b]/70 font-mono">
          Loading Kairos Workspace Dashboard...
        </p>
      </div>
    </div>
  );
}
