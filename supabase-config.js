// Configuração do Supabase do TrainerDex.
// A publishable/anon key pode ficar no frontend. NUNCA coloque a service_role key aqui.
window.TRAINERDEX_SUPABASE_CONFIG = {
  enabled: false,
  url: "https://kytbkjigsapdhxpdchqz.supabase.co/rest/v1/",
  publishableKey: "sb_publishable_uLrls7BdXf67Q3DGH78fXA_Kmlg9SVd"
};

if (window.TRAINERDEX_SUPABASE_CONFIG.enabled) {
  const { createClient } = window.supabase;
  window.trainerdexSupabase = createClient(
    window.TRAINERDEX_SUPABASE_CONFIG.url,
    window.TRAINERDEX_SUPABASE_CONFIG.publishableKey
  );
}
