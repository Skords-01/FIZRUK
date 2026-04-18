import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const VALID_MODULES = new Set(["finyk", "fizruk", "routine", "nutrition"]);

export function useHubNavigation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialModule = (() => {
    const q = searchParams.get("module");
    if (VALID_MODULES.has(q)) return q;
    return null;
  })();

  const [activeModule, setActiveModule] = useState(initialModule);
  const [moduleAnimClass, setModuleAnimClass] = useState("module-enter");

  const goToHub = useCallback(() => {
    setModuleAnimClass("hub-enter");
    setActiveModule(null);
    navigate("/", { replace: false });
  }, [navigate]);

  const openModule = useCallback(
    (id, opts = {}) => {
      const nextId = String(id || "").trim();
      if (!VALID_MODULES.has(nextId)) return;
      const isSame = nextId === activeModule;

      try {
        const raw = opts.hash != null ? String(opts.hash).trim() : "";
        if (raw) {
          window.location.hash = raw.startsWith("#") ? raw : `#${raw}`;
        } else if (!isSame) {
          window.location.hash = "";
        }
      } catch {
        /* ignore */
      }

      setModuleAnimClass("module-enter");
      setActiveModule(nextId);
      navigate(`/?module=${nextId}`, { replace: false });
    },
    [activeModule, navigate],
  );

  useEffect(() => {
    const q = searchParams.get("module");
    const mod = VALID_MODULES.has(q) ? q : null;
    if (mod !== activeModule) {
      setModuleAnimClass(mod ? "module-enter" : "hub-enter");
      setActiveModule(mod);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  return { activeModule, openModule, goToHub, moduleAnimClass };
}
