/**
 * Bootstraps DB defaults and pushes settings into the store on first load.
 */
import { useEffect } from "react";
import { ensureDefaults, getDB } from "@/database/db";
import { useAppStore } from "@/store/useAppStore";
import { loadBaseline } from "@/ai/CalibrationEngine";

export function useBootstrap() {
  const loadSettings = useAppStore((s) => s.loadSettings);
  const setCalibration = useAppStore((s) => s.setCalibration);

  useEffect(() => {
    if (typeof window === "undefined") return;
    (async () => {
      try {
        const s = await ensureDefaults();
        loadSettings(s);
        // ensure default profile
        const db = getDB();
        const p = await db.profile.get("me");
        if (!p) {
          await db.profile.put({
            id: "me",
            name: "Học viên PoseAlertAI",
            email: "",
            createdAt: Date.now(),
          });
        }
        const b = await loadBaseline();
        if (b) setCalibration(b);
      } catch (e) {
        console.warn("Bootstrap failed", e);
      }
    })();
  }, [loadSettings, setCalibration]);
}
