// O painel lê agentes e eventos direto da porta (Apps Script), por JSONP, na ação
// ler_painel. Antes lia o CSV "Publicar na web", que chega ~1 min atrasado: um agente
// que roda 30-60 s nunca aparecia em EM EXECUÇÃO. URL e chave ficam em aprovacoes.js.
//
// Colunas da aba agentes: id, nome, setor, status, tarefa, atualizado_em, proxima_execucao
// - status: ocioso | trabalhando | aguardando_aprovacao | erro
// Aba eventos: horario, setor, agente, status, evento. A porta manda os 100 últimos.

// Quantos eventos mais recentes mostrar no log.
export const MAX_EVENTOS = 100

// Intervalo entre leituras, em milissegundos. Cada leitura é uma execução do Apps Script,
// da mesma cota que o follow-up e o vigia usam: não baixar sem fazer a conta.
export const REFRESH_MS = 10000

// Sem mouse nem teclado por este tempo, o painel para de ler e mostra "retomar".
export const INATIVO_MS = 30 * 60 * 1000
