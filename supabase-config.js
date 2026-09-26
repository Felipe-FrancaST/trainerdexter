window.TRAINERDEX_SUPABASE_CONFIG = {
  enabled: true,
  url: "https://kytbkjigsapdhxpdchqz.supabase.co",
  publishableKey: "sb_publishable_uLrls7BdXf67Q3DGH78fXA_Kmlg9SVd"
};

(function initTrainerDexSupabase(){
  const cfg = window.TRAINERDEX_SUPABASE_CONFIG;

  if (!cfg.enabled || !cfg.url || !cfg.publishableKey) {
    console.error("TrainerDex: configuração do Supabase incompleta.");
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("TrainerDex: biblioteca do Supabase não foi carregada.");
    return;
  }

  try {
    window.trainerdexSupabase = window.supabase.createClient(
      cfg.url,
      cfg.publishableKey
    );

    console.info("TrainerDex: cliente Supabase criado.");
  } catch (error) {
    console.error(
      "TrainerDex: não foi possível criar o cliente Supabase:",
      error
    );
  }
})();