// This deployment is an explicitly requested public prototype, not a real marketplace.
// Set VITE_ENABLE_DEMO=false and ENABLE_DEMO=false before real operation.
export const demoEnabled = import.meta.env.VITE_ENABLE_DEMO !== "false";
