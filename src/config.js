// Cole aqui a URL da planilha do Google Sheets publicada na web em formato CSV
// (Arquivo > Compartilhar > Publicar na web > escolha a aba > "Valores separados por vírgula (.csv)").
//
// Colunas da planilha (primeira linha), nesta grafia:
//   id, nome, setor, status, tarefa, atualizado_em, proxima_execucao
// - status: ocioso | trabalhando | aguardando_aprovacao | erro
// - atualizado_em: data e hora da última mudança do agente (ex.: 26/09/2026 14:30:00)
// - proxima_execucao: data e hora da próxima rotina, ou vazio se o agente não tem rotina
// Detalhes no README.md.
export const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRrU6J_V5xMwId-92zEArY353rIZplcFziHOZyKNzxHuYCbV-7rqfX3G2iuZ82yBbFsKsSEn-bj6USL/pub?output=csv'

// Aba "eventos" da mesma planilha (gid=1279412886), colunas: horario, setor, agente, status, evento.
export const EVENTS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRrU6J_V5xMwId-92zEArY353rIZplcFziHOZyKNzxHuYCbV-7rqfX3G2iuZ82yBbFsKsSEn-bj6USL/pub?gid=1279412886&single=true&output=csv'

// Quantos eventos mais recentes mostrar no log.
export const MAX_EVENTOS = 100

// Intervalo de atualização, em milissegundos.
export const REFRESH_MS = 5000
