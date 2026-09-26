// Configuração do Supabase do TrainerDex.
// A publishable/anon key pode ficar no frontend. NUNCA coloque a service_role key aqui.
window.TRAINERDEX_SUPABASE_CONFIG = window.TRAINERDEX_SUPABASE_CONFIG || {
  enabled: false,
  url: "https://kytbkjigsapdhxpdchqz.supabase.co/rest/v1/",
  publishableKey: "sb_publishable_uLrls7BdXf67Q3DGH78fXA_Kmlg9SVd"
};

(function initTrainerDexSupabase(){
  const cfg = window.TRAINERDEX_SUPABASE_CONFIG;
  const hasValues = cfg && cfg.enabled && cfg.url && cfg.publishableKey &&
    !cfg.url.includes("https://kytbkjigsapdhxpdchqz.supabase.co/rest/v1/") && !cfg.publishableKey.includes("sb_publishable_uLrls7BdXf67Q3DGH78fXA_Kmlg9SVd");
  if (!hasValues) {
    console.warn("TrainerDex: supabase-config.js foi carregado, mas a configuração está desativada ou incompleta.");
    return;
  }
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("TrainerDex: supabase-js não foi carregado antes do supabase-config.js.");
    return;
  }
  try {
    window.trainerdexSupabase = window.supabase.createClient(cfg.url, cfg.publishableKey);
    console.info("TrainerDex: cliente Supabase criado.");
  } catch (error) {
    console.error("TrainerDex: não foi possível criar o cliente Supabase:", error);
  }
})();
