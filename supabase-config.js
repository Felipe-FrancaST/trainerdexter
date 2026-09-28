/*
 * TrainerDex — configuração do Supabase
 *
 * A publishable key é própria para uso no frontend. A segurança real dos dados
 * deve ser garantida por Supabase Auth + RLS no banco.
 */

window.TRAINERDEX_SUPABASE_CONFIG = Object.freeze({
  enabled: true,
  url: "https://kytbkjigsapdhxpdchqz.supabase.co",
  publishableKey: "sb_publishable_uLrls7BdXf67Q3DGH78fXA_Kmlg9SVd",
});

(function initTrainerDexSupabase() {
  const config = window.TRAINERDEX_SUPABASE_CONFIG;

  if (!config.enabled || !config.url || !config.publishableKey) {
    console.error("TrainerDex: configuração do Supabase incompleta.");
    return;
  }

  if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {
    console.error("TrainerDex: biblioteca do Supabase não foi carregada.");
    return;
  }

  try {
    window.trainerdexSupabase = window.supabase.createClient(
      config.url,
      config.publishableKey
    );

    console.info("TrainerDex: cliente Supabase criado.");
  } catch (error) {
    console.error(
      "TrainerDex: não foi possível criar o cliente Supabase:",
      error
    );
  }
})();
