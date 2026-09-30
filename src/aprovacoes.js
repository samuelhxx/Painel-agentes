// Fluxo de aprovação: fala com o Apps Script publicado como Web App.
//
// Não dá para usar fetch(): o Apps Script responde com um redirect 302 para
// script.googleusercontent.com sem cabeçalho CORS, e o navegador bloqueia a leitura.
// Por isso tudo aqui é JSONP: um <script src> com o parâmetro "callback".
//
// A chave pode ficar no código; sozinha ela não faz nada.
// O PIN NUNCA fica no código nem em storage: vem de quem chama, em memória.
export const API_URL =
  'https://script.google.com/macros/s/AKfycbwkaf6V_oGTzV4ewWTI1GD_6wXsAc-sC6RrEdYc1kSrL0QPw_9D4KWt1exfXYM14sxUig/exec'
export const CHAVE_PAINEL = 'as-p-8e9c01fwhzoyd4z79hnbqb2i'
const TIMEOUT_MS = 15000

// tipo: 'pin' (PIN errado), 'negado' (chave errada), 'rede' (sem resposta / timeout),
// 'resposta' (o servidor respondeu algo que não esperávamos)
export class ErroAprovacao extends Error {
  constructor(tipo, message) {
    super(message)
    this.tipo = tipo
  }
}

let seq = 0

// Chama a URL por JSONP e resolve com o objeto passado ao callback.
export function jsonp(url, params, timeout = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const nome = `__painelJsonp_${Date.now().toString(36)}_${seq++}`
    const script = document.createElement('script')
    let acabou = false

    const terminar = () => {
      acabou = true
      clearTimeout(timer)
      script.remove()
      delete window[nome]
    }

    window[nome] = (dados) => {
      if (acabou) return
      terminar()
      resolve(dados)
    }
    // O script de JSONP roda antes do onload. Se carregou e o callback não foi chamado,
    // o Google devolveu outra coisa (página de erro/login em HTML): não adianta esperar 15 s.
    script.onload = () => {
      if (acabou) return
      terminar()
      reject(new ErroAprovacao('resposta', 'resposta inesperada do servidor'))
    }
    script.onerror = () => {
      if (acabou) return
      terminar()
      reject(new ErroAprovacao('rede', 'falha de rede'))
    }
    const timer = setTimeout(() => {
      if (acabou) return
      terminar()
      // Se a resposta ainda chegar, cai num no-op (que se apaga) em vez de dar ReferenceError.
      window[nome] = () => { delete window[nome] }
      reject(new ErroAprovacao('rede', 'tempo esgotado'))
    }, timeout)

    script.async = true
    script.src = `${url}?${new URLSearchParams({ ...params, callback: nome })}`
    document.head.appendChild(script)
  })
}

async function chamar(pin, params) {
  const r = await jsonp(API_URL, { chave: CHAVE_PAINEL, pin, ...params })
  if (!r || typeof r !== 'object') throw new ErroAprovacao('resposta', 'resposta vazia')
  if (r.erro === 'pin') throw new ErroAprovacao('pin', 'PIN incorreto')
  if (r.erro === 'negado') throw new ErroAprovacao('negado', 'chave do painel recusada')
  if (r.erro) throw new ErroAprovacao('resposta', String(r.erro))
  return r
}

// Lista as aprovações pendentes. Serve também para validar o PIN.
export async function listarAprovacoes(pin) {
  const r = await chamar(pin, { acao: 'listar_aprovacoes' })
  if (!Array.isArray(r.pendentes)) throw new ErroAprovacao('resposta', 'lista ausente')
  return r.pendentes
}

// decisao: 'aprovado' | 'reprovado'.
// Resolve com o resultado do servidor: aprovado, reprovado, ja_decidido, nao_encontrado ou decisao_invalida.
export async function decidir(pin, ref, decisao) {
  const r = await chamar(pin, { acao: 'decidir_painel', ref, decisao })
  if (typeof r.resultado !== 'string') throw new ErroAprovacao('resposta', 'resultado ausente')
  return r.resultado
}
