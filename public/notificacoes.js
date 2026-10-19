// =====================================================
// NOTIFICAÇÕES - BIPAID
// Painel que abre ao clicar no sininho, montado a partir
// de atividades reais (tarefas, metas e lançamentos).
//
// Inclua em toda página, depois do usuario.js:
//     <link rel="stylesheet" href="notificacoes.css">
//     <script src="notificacoes.js"></script>
// =====================================================

const CHAVE_NOTIFICACOES_LIDAS = "bipaid-notificacoes-lidas";

let painelNotificacoesEl = null;
let listaNotificacoesAtual = [];

function obterLidas() {

    try {
        const salvo = localStorage.getItem(CHAVE_NOTIFICACOES_LIDAS);
        return salvo ? JSON.parse(salvo) : [];
    } catch (erro) {
        return [];
    }
}

function salvarLidas(lista) {

    try {
        localStorage.setItem(CHAVE_NOTIFICACOES_LIDAS, JSON.stringify(lista));
    } catch (erro) {
        // sem problema se o navegador bloquear
    }
}

function marcarComoLida(id) {

    const lidas = obterLidas();

    if (!lidas.includes(id)) {
        lidas.push(id);
        salvarLidas(lidas);
    }
}

function formatarTempoRelativo(dataIso) {

    const data = new Date(dataIso);

    if (isNaN(data.getTime())) return "";

    const diffMs = Date.now() - data.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "agora";
    if (diffMin < 60) return `há ${diffMin} min`;

    const diffHoras = Math.floor(diffMin / 60);
    if (diffHoras < 24) return `há ${diffHoras} h`;

    const diffDias = Math.floor(diffHoras / 24);
    if (diffDias === 1) return "há 1 dia";
    if (diffDias < 7) return `há ${diffDias} dias`;

    return data.toLocaleDateString("pt-BR");
}


// =====================================================
// MONTAR A LISTA DE NOTIFICAÇÕES A PARTIR DE DADOS REAIS
// =====================================================

function formatarMoedaNotificacao(valor) {

    return (Number(valor) || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

async function buscarJson(url) {

    try {

        const resposta = await fetch(url);

        if (!resposta.ok) return [];

        const dados = await resposta.json();

        if (Array.isArray(dados)) return dados;

        const chave = Object.keys(dados).find(function (chave) {
            return Array.isArray(dados[chave]);
        });

        return chave ? dados[chave] : [];

    } catch (erro) {

        return [];
    }
}

async function montarNotificacoes() {

    const [tarefas, metas, lancamentos] = await Promise.all([
        buscarJson("/api/tarefas"),
        buscarJson("/api/metas"),
        buscarJson("/api/lancamentos")
    ]);

    const notificacoes = [];

    tarefas
        .filter(function (tarefa) { return tarefa.concluida; })
        .sort(function (a, b) { return new Date(b.criadaEm) - new Date(a.criadaEm); })
        .slice(0, 3)
        .forEach(function (tarefa) {

            notificacoes.push({
                id: "tarefa-" + tarefa.id,
                tipo: "tarefa",
                icone: "i-check",
                titulo: "Tarefa concluída!",
                descricao: `Você concluiu a tarefa "${tarefa.titulo}".`,
                data: tarefa.criadaEm
            });
        });

    metas
        .sort(function (a, b) { return new Date(b.criadaEm) - new Date(a.criadaEm); })
        .slice(0, 2)
        .forEach(function (meta) {

            const percentual = meta.valorMeta > 0
                ? Math.round((meta.valorAtual / meta.valorMeta) * 100)
                : 0;

            notificacoes.push({
                id: "meta-" + meta.id,
                tipo: "meta",
                icone: "i-target",
                titulo: "Meta atualizada",
                descricao: `Sua meta "${meta.nome}" está em ${percentual}%.`,
                data: meta.criadaEm
            });
        });

    lancamentos
        .sort(function (a, b) { return new Date(b.criadaEm) - new Date(a.criadaEm); })
        .slice(0, 3)
        .forEach(function (lancamento) {

            const ehSaida = lancamento.tipo === "saida";

            notificacoes.push({
                id: "lancamento-" + lancamento.id,
                tipo: ehSaida ? "financeiro-saida" : "financeiro-entrada",
                icone: "i-money",
                titulo: ehSaida ? "Gasto registrado" : "Entrada registrada",
                descricao: `"${lancamento.nome}": ${formatarMoedaNotificacao(lancamento.valor)}.`,
                data: lancamento.criadaEm
            });
        });

    notificacoes.sort(function (a, b) {
        return new Date(b.data) - new Date(a.data);
    });

    return notificacoes.slice(0, 8);
}


// =====================================================
// MONTAR O PAINEL (HTML)
// =====================================================

function criarPainelNotificacoes() {

    const painel = document.createElement("div");

    painel.className = "painel-notificacoes";
    painel.id = "painel-notificacoes";

    painel.innerHTML = `
        <div class="cabecalho-notificacoes">
            <strong>
                <svg class="ic"><use href="#i-bell"/></svg>
                Notificações
            </strong>
            <button type="button" class="botao-marcar-lidas">Marcar todas como lidas</button>
        </div>
        <div class="lista-notificacoes" id="lista-notificacoes"></div>
        <div class="rodape-notificacoes">
            <button type="button" id="botao-fechar-notificacoes">Fechar</button>
        </div>
    `;

    document.body.appendChild(painel);

    painel.querySelector(".botao-marcar-lidas").addEventListener("click", function () {

        const idsLidos = listaNotificacoesAtual.map(function (n) { return n.id; });
        salvarLidas(idsLidos);

        renderizarListaNotificacoes();
        atualizarContadorNotificacoes();
    });

    painel.querySelector("#botao-fechar-notificacoes").addEventListener("click", fecharPainelNotificacoes);

    return painel;
}

function renderizarListaNotificacoes() {

    const lista = document.getElementById("lista-notificacoes");

    if (!lista) return;

    if (listaNotificacoesAtual.length === 0) {

        lista.innerHTML = `<p class="sem-notificacoes">Nenhuma novidade por aqui ainda.</p>`;
        return;
    }

    const lidas = obterLidas();

    lista.innerHTML = listaNotificacoesAtual.map(function (notificacao) {

        const estaLida = lidas.includes(notificacao.id);

        return `
            <div class="item-notificacao ${estaLida ? "lida" : ""}" data-id="${notificacao.id}">
                <div class="icone-notificacao ${notificacao.tipo}">
                    <svg class="ic"><use href="#${notificacao.icone}"/></svg>
                </div>
                <div class="corpo-notificacao">
                    <div class="topo-item-notificacao">
                        <span class="titulo-notificacao">${notificacao.titulo}</span>
                        <span class="tempo-notificacao">${formatarTempoRelativo(notificacao.data)}</span>
                    </div>
                    <p class="descricao-notificacao">${notificacao.descricao}</p>
                </div>
                ${estaLida ? "" : '<span class="ponto-nao-lida"></span>'}
            </div>
        `;
    }).join("");

    lista.querySelectorAll(".item-notificacao").forEach(function (item) {

        item.addEventListener("click", function () {

            marcarComoLida(item.dataset.id);
            item.classList.add("lida");

            const ponto = item.querySelector(".ponto-nao-lida");
            if (ponto) ponto.remove();

            atualizarContadorNotificacoes();
        });
    });
}

function atualizarContadorNotificacoes() {

    const lidas = obterLidas();

    const naoLidas = listaNotificacoesAtual.filter(function (n) {
        return !lidas.includes(n.id);
    }).length;

    document.querySelectorAll(".contador-notificacoes").forEach(function (elemento) {
        elemento.remove();
    });

    if (naoLidas === 0) return;

    document.querySelectorAll(".notificacao").forEach(function (botao) {

        const contador = document.createElement("span");

        contador.className = "contador-notificacoes";
        contador.textContent = naoLidas > 9 ? "9+" : naoLidas;

        botao.appendChild(contador);
    });
}


// =====================================================
// ABRIR / FECHAR O PAINEL
// =====================================================

function posicionarPainel(botao) {

    const retangulo = botao.getBoundingClientRect();
    const painel = painelNotificacoesEl;

    const larguraPainel = painel.offsetWidth || 360;

    let esquerda = retangulo.right - larguraPainel;

    if (esquerda < 12) esquerda = 12;

    painel.style.top = (retangulo.bottom + 10) + "px";
    painel.style.left = esquerda + "px";
}

function fecharPainelNotificacoes() {

    if (painelNotificacoesEl) {
        painelNotificacoesEl.classList.remove("aberto");
    }
}

async function abrirPainelNotificacoes(botao) {

    if (!painelNotificacoesEl) {
        painelNotificacoesEl = criarPainelNotificacoes();
    }

    posicionarPainel(botao);
    painelNotificacoesEl.classList.add("aberto");

    const lista = document.getElementById("lista-notificacoes");
    if (lista) lista.innerHTML = `<p class="sem-notificacoes">Carregando...</p>`;

    listaNotificacoesAtual = await montarNotificacoes();

    renderizarListaNotificacoes();
    atualizarContadorNotificacoes();
}

function configurarNotificacoes() {

    document.querySelectorAll(".notificacao").forEach(function (botao) {

        botao.addEventListener("click", function (evento) {

            evento.stopPropagation();

            const estaAberto = painelNotificacoesEl && painelNotificacoesEl.classList.contains("aberto");

            if (estaAberto) {
                fecharPainelNotificacoes();
            } else {
                abrirPainelNotificacoes(botao);
            }
        });
    });

    document.addEventListener("click", function (evento) {

        if (!painelNotificacoesEl) return;

        if (
            painelNotificacoesEl.contains(evento.target) ||
            evento.target.closest(".notificacao")
        ) {
            return;
        }

        fecharPainelNotificacoes();
    });

    document.addEventListener("keydown", function (evento) {

        if (evento.key === "Escape") {
            fecharPainelNotificacoes();
        }
    });

    // Mostra o contador assim que a página carrega (sem precisar abrir o painel)
    montarNotificacoes().then(function (notificacoes) {
        listaNotificacoesAtual = notificacoes;
        atualizarContadorNotificacoes();
    });
}

document.addEventListener("DOMContentLoaded", configurarNotificacoes);