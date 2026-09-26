# Painel de Agentes · AS CONSTRUCTION

Galpão 3D com os agentes de cada setor, lendo os dados de uma planilha do Google Sheets.

- Ver no computador: `npm run dev`
- Site publicado: https://samuelhxx.github.io/Painel-agentes/ (atualiza sozinho a cada envio para o GitHub)

## Colunas da planilha

A primeira linha da planilha deve ter exatamente estes nomes:

| coluna | o que é | exemplo |
|---|---|---|
| `id` | identificador único do agente (não repetir) | `4` |
| `nome` | nome do agente | `Vigia de vencimentos` |
| `setor` | setor da empresa; agentes com o mesmo setor ficam na mesma plataforma | `DOCUMENTAÇÃO` |
| `status` | `ocioso`, `trabalhando`, `aguardando_aprovacao` ou `erro` | `ocioso` |
| `tarefa` | o que está fazendo agora (ou o resultado da última execução) | `3 certidões vencendo em 30 dias` |
| `atualizado_em` | data e hora da última mudança do agente | `26/09/2026 14:30:00` |
| `proxima_execucao` | data e hora da próxima rotina; **vazio** se o agente não tem rotina | `27/09/2026 07:00:00` |

As datas podem estar como `2026-09-26 14:30:00`, no formato brasileiro (`26/09/2026 14:30:00`) ou ISO (`2026-09-26T14:30:00`).

### Como o painel usa esses dados

- **Tempo no status** ("trabalhando há 4 min"): contado a partir de `atualizado_em` e, depois, de quando o painel viu o status mudar.
- **Possivelmente travado**: agente em `trabalhando` há mais de 30 minutos.
- **Rotina atrasada**: `proxima_execucao` já passou e o agente não foi atualizado desde então.
- **Última execução**: é o `atualizado_em`. Se o agente está trabalhando agora, aparece "em andamento".
- **Log de eventos**: lido da aba `eventos` (veja abaixo). O histórico fica na planilha, não se perde ao fechar a página.

## Aba de eventos

Segunda aba da mesma planilha (publicada com `gid=1279412886`). Cada linha é um evento; linhas novas vão no fim.

| coluna | o que é | exemplo |
|---|---|---|
| `horario` | data e hora do evento | `2026-09-26 01:56:13` |
| `setor` | setor do agente | `DOCUMENTACAO` |
| `agente` | nome do agente | `vigia-vencimentos` |
| `status` | status do agente no evento (define a cor do horário) | `trabalhando` |
| `evento` | o que aconteceu | `3 certidões vencendo em 30 dias` |

O painel mostra os 100 eventos mais recentes, do mais novo para o mais antigo.

## Configuração

A URL da planilha publicada em CSV fica em `src/config.js`. O painel lê só a planilha.

Obs.: o Google atualiza a versão publicada da planilha a cada ~5 minutos, então uma mudança feita na planilha pode levar alguns minutos para aparecer no painel.
