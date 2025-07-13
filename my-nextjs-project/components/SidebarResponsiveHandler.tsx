// "use client";
import { useEffect } from "react";

export default function SidebarResponsiveHandler() {
  useEffect(() => {
    const sidebar = document.querySelector(".sidebar-col");

    const updateSidebarClass = () => {
      if (!sidebar) return;

      if (window.innerWidth < 991) {
        sidebar.classList.add("sidebar-active");
      } else {
        sidebar.classList.remove("sidebar-active");
      }
    };

    // Initial check
    updateSidebarClass();

    // Add resize listener
    window.addEventListener("resize", updateSidebarClass);

    // Cleanup
    return () => {
      window.removeEventListener("resize", updateSidebarClass);
    };
  }, []);

  return null; // No UI, just logic
}
