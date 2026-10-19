
// =====================================================
// METAS - BIPAID
// =====================================================

let metas = [];
let ordemAtual = "recentes";
let metaDoModalId = null;

const MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const CATEGORIAS = {
    financeira:   { nome: "Financeira",   icone: "i-money"  },
    academica:    { nome: "Acadêmica",    icone: "i-enem"   },
    pessoal:      { nome: "Pessoal",      icone: "i-heart"  },
    profissional: { nome: "Profissional", icone: "i-star"   }
};

const CATEGORIA_PADRAO = { nome: "Outros", icone: "i-target" };


// =====================================================
// CARREGAR METAS
// =====================================================

async function carregarMetas() {

    try {

        const resposta = await fetch("/api/metas");

        if (!resposta.ok) {
            throw new Error("Erro ao carregar as metas.");
        }

        const dados = await resposta.json();

        metas = Array.isArray(dados)
            ? dados
            : dados.metas || [];

    } catch (erro) {

        console.error("Erro ao carregar as metas:", erro);

        metas = [];
    }

    atualizarTela();
}


function atualizarTela() {

    mostrarMetas();
    atualizarEstatisticas();
    atualizarProgressoGeral();
    atualizarCartaoComecar();
}


// =====================================================
// CÁLCULOS E FORMATAÇÕES
// =====================================================

function valorAtualDe(meta) {
    return Number(meta.valorAtual) || 0;
}

function valorMetaDe(meta) {
    return Number(meta.valorMeta) || 0;
}

function arredondar(valor) {
    return Math.round(valor * 100) / 100;
}

// 0 a 100 (sem arredondar)
function calcularPorcentagem(meta) {

    const objetivo = valorMetaDe(meta);

    if (objetivo <= 0) {
        return 0;
    }

    return Math.min(
        Math.max((valorAtualDe(meta) / objetivo) * 100, 0),
        100
    );
}

// 0% | 0,1% | 37% | 100%
function formatarPorcentagem(porcentagem) {

    if (porcentagem <= 0) {
        return "0%";
    }

    if (porcentagem < 1) {
        return porcentagem.toFixed(1).replace(".", ",") + "%";
    }

    if (porcentagem >= 100) {
        return "100%";
    }

    return Math.floor(porcentagem) + "%";
}

function formatarMoeda(valor) {

    return Number(valor || 0).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );
}

function escaparHTML(texto) {

    const div = document.createElement("div");

    div.textContent = texto || "";

    return div.innerHTML;
}

function obterStatus(meta) {

    const objetivo = valorMetaDe(meta);
    const atual = valorAtualDe(meta);

    if (objetivo > 0 && atual >= objetivo) {
        return "concluida";
    }

    if (atual > 0) {
        return "andamento";
    }

    return "nova";
}

const ROTULOS_STATUS = {
    concluida: "Concluída",
    andamento: "Em progresso",
    nova: "Não iniciada"
};

function obterCategoria(meta) {
    return CATEGORIAS[meta.categoria] || CATEGORIA_PADRAO;
}

function criarData(texto) {

    if (!texto) {
        return null;
    }

    const partes = String(texto).split("-");

    if (partes.length !== 3) {
        return null;
    }

    return new Date(
        Number(partes[0]),
        Number(partes[1]) - 1,
        Number(partes[2])
    );
}

// "Dezembro de 2026"
function formatarPrazo(meta) {

    const data = criarData(meta.dataLimite);

    if (!data || isNaN(data)) {
        return "Sem prazo";
    }

    return `${MESES[data.getMonth()]} de ${data.getFullYear()}`;
}

// "31/12/2026"
function formatarDataCompleta(meta) {

    const data = criarData(meta.dataLimite);

    if (!data || isNaN(data)) {
        return "Não definida";
    }

    return String(data.getDate()).padStart(2, "0") +
        "/" +
        String(data.getMonth() + 1).padStart(2, "0") +
        "/" +
        data.getFullYear();
}

function descreverDiasRestantes(meta) {

    const data = criarData(meta.dataLimite);

    if (!data || isNaN(data)) {
        return "";
    }

    const hoje = new Date();

    const inicioHoje = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate()
    );

    const dias = Math.round((data - inicioHoje) / 86400000);

    if (dias < 0) {
        return "prazo encerrado";
    }

    if (dias === 0) {
        return "termina hoje";
    }

    return dias === 1 ? "falta 1 dia" : `faltam ${dias} dias`;
}


// =====================================================
// ORDENAR
// =====================================================

function chaveRecencia(meta, indice) {

    if (meta.criadoEm) {

        const tempo = Date.parse(meta.criadoEm);

        if (!isNaN(tempo)) {
            return tempo;
        }
    }

    const numero = Number(meta.id);

    if (!isNaN(numero)) {
        return numero;
    }

    return indice;
}

function obterMetasOrdenadas() {

    const lista = metas.map(function (meta, indice) {
        return { meta: meta, indice: indice };
    });

    lista.sort(function (a, b) {

        if (ordemAtual === "antigas") {
            return chaveRecencia(a.meta, a.indice) - chaveRecencia(b.meta, b.indice);
        }

        if (ordemAtual === "progresso") {
            return calcularPorcentagem(b.meta) - calcularPorcentagem(a.meta);
        }

        if (ordemAtual === "prazo") {

            const dataA = criarData(a.meta.dataLimite);
            const dataB = criarData(b.meta.dataLimite);

            if (!dataA && !dataB) return 0;
            if (!dataA) return 1;
            if (!dataB) return -1;

            return dataA - dataB;
        }

        // recentes
        return chaveRecencia(b.meta, b.indice) - chaveRecencia(a.meta, a.indice);
    });

    return lista.map(function (item) {
        return item.meta;
    });
}


// =====================================================
// MOSTRAR METAS
// =====================================================

function mostrarMetas() {

    const lista = document.getElementById("lista-metas");

    if (!lista) {
        return;
    }

    lista.innerHTML = "";

    if (metas.length === 0) {

        lista.innerHTML = `
            <div class="aviso-sem-metas">
                <div class="icone-sem-metas">
                    <svg class="ic"><use href="#i-target"/></svg>
                </div>

                <div class="texto-sem-metas">
                    <strong>Você ainda não possui metas.</strong>
                    <span>Clique em "Nova meta" para criar seu primeiro objetivo.</span>
                </div>
            </div>
        `;

        return;
    }

    obterMetasOrdenadas().forEach(function (meta) {
        lista.appendChild(criarCardMeta(meta));
    });
}


function criarCardMeta(meta) {

    const status = obterStatus(meta);
    const porcentagem = calcularPorcentagem(meta);
    const categoria = obterCategoria(meta);

    // Garante uma faixa visível mesmo com progresso muito pequeno
    const larguraBarra = porcentagem > 0
        ? Math.max(porcentagem, 1.5)
        : 0;

    const descricao = meta.descricao
        ? `<p class="descricao-meta">${escaparHTML(meta.descricao)}</p>`
        : "";

    const botaoAdicionar = status === "concluida"
        ? `<span class="meta-concluida-texto">Meta concluída!</span>`
        : `<button type="button" class="botao-adicionar-valor" data-acao="valor">＋ Adicionar valor</button>`;

    const card = document.createElement("article");

    card.className = `card-meta ${status}`;

    card.innerHTML = `
        <div class="icone-meta">
            <svg class="ic"><use href="#${categoria.icone}"/></svg>
        </div>

        <div class="conteudo-meta">

            <div class="linha-titulo">
                <strong class="nome-meta">${escaparHTML(meta.nome)}</strong>
                <span class="selo-status ${status}">${ROTULOS_STATUS[status]}</span>

                <div class="area-menu-meta">
                    <button type="button" class="botao-menu-meta" aria-label="Opções da meta">⋮</button>

                    <div class="menu-meta" hidden>
                        <button type="button" data-acao="valor">Adicionar valor</button>
                        <button type="button" data-acao="detalhes">Ver detalhes</button>
                        <button type="button" data-acao="excluir" class="perigo">Excluir</button>
                    </div>
                </div>
            </div>

            ${descricao}

            <div class="valores-meta">
                <strong>${formatarMoeda(valorAtualDe(meta))}</strong>
                de ${formatarMoeda(valorMetaDe(meta))}
            </div>

            <div class="linha-progresso">
                <div class="barra-progresso">
                    <div class="progresso" style="width:${larguraBarra}%"></div>
                </div>
                <span class="porcentagem-meta">${formatarPorcentagem(porcentagem)}</span>
            </div>

            <div class="rodape-meta">

                <div class="info-rodape">
                    <svg class="ic"><use href="#i-cal"/></svg>
                    <span><small>Prazo</small>${escaparHTML(formatarPrazo(meta))}</span>
                </div>

                <div class="info-rodape">
                    <svg class="ic"><use href="#i-tag"/></svg>
                    <span><small>Categoria</small>${categoria.nome}</span>
                </div>

                <div class="botoes-meta">
                    ${botaoAdicionar}
                    <button type="button" class="botao-detalhes" data-acao="detalhes">Ver detalhes →</button>
                </div>

            </div>

        </div>
    `;

    // Menu ⋮
    const botaoMenu = card.querySelector(".botao-menu-meta");
    const menu = card.querySelector(".menu-meta");

    botaoMenu.addEventListener("click", function (evento) {

        evento.stopPropagation();

        const estavaFechado = menu.hidden;

        fecharMenus();

        menu.hidden = !estavaFechado;
    });

    // Ações (menu e botões do rodapé)
    card.addEventListener("click", function (evento) {

        const botao = evento.target.closest("[data-acao]");

        if (!botao) {
            return;
        }

        fecharMenus();

        const acao = botao.getAttribute("data-acao");

        if (acao === "valor") {
            abrirModalValor(meta);
        }

        if (acao === "detalhes") {
            abrirModalDetalhes(meta);
        }

        if (acao === "excluir") {
            excluirMeta(meta);
        }
    });

    return card;
}


function fecharMenus() {

    document.querySelectorAll(".menu-meta").forEach(function (menu) {
        menu.hidden = true;
    });
}


// =====================================================
// ESTATÍSTICAS
// =====================================================

function atualizarEstatisticas() {

    const concluidas = metas.filter(function (meta) {
        return obterStatus(meta) === "concluida";
    }).length;

    const andamento = metas.filter(function (meta) {
        return obterStatus(meta) === "andamento";
    }).length;

    const ativas = metas.length - concluidas;

    function definir(id, texto) {

        const elemento = document.getElementById(id);

        if (elemento) {
            elemento.textContent = texto;
        }
    }

    definir("stat-ativas", ativas);
    definir("stat-andamento", andamento);
    definir("stat-concluidas", concluidas);

    definir(
        "stat-ativas-texto",
        ativas === 0
            ? "você não tem metas em andamento"
            : "você tem metas em andamento"
    );

    definir(
        "stat-andamento-texto",
        andamento === 0
            ? "nenhuma meta iniciada ainda"
            : "você já começou a realizar"
    );

    definir(
        "stat-concluidas-texto",
        concluidas === 0
            ? "ainda não há metas concluídas"
            : "parabéns pelas conquistas!"
    );
}


// =====================================================
// SEU PROGRESSO (soma de todas as metas)
// =====================================================

function atualizarProgressoGeral() {

    let totalGuardado = 0;
    let totalObjetivo = 0;

    metas.forEach(function (meta) {
        totalGuardado += valorAtualDe(meta);
        totalObjetivo += valorMetaDe(meta);
    });

    const porcentagem = totalObjetivo > 0
        ? Math.min((totalGuardado / totalObjetivo) * 100, 100)
        : 0;

    let mensagem;

    if (metas.length === 0) {
        mensagem = "Crie sua primeira meta para começar a acompanhar seu progresso.";
    } else if (totalGuardado <= 0) {
        mensagem = "Todo grande sonho começa com um primeiro passo. Que tal começar hoje?";
    } else if (porcentagem >= 100) {
        mensagem = "Parabéns! Você alcançou o objetivo de todas as suas metas.";
    } else if (porcentagem >= 50) {
        mensagem = "Você está no caminho certo! Continue avançando.";
    } else {
        mensagem = "Você ainda está começando, mas cada pequeno passo conta.";
    }

    const textoMensagem = document.getElementById("progresso-mensagem");
    const textoTotal = document.getElementById("progresso-total");
    const textoPorcentagem = document.getElementById("progresso-percentual");
    const barra = document.getElementById("progresso-barra");

    if (textoMensagem) {
        textoMensagem.textContent = mensagem;
    }

    if (textoTotal) {
        textoTotal.textContent = formatarMoeda(totalGuardado);
    }

    if (textoPorcentagem) {
        textoPorcentagem.textContent = formatarPorcentagem(porcentagem);
    }

    if (barra) {
        barra.style.width = porcentagem > 0
            ? `${Math.max(porcentagem, 1.5)}%`
            : "0%";
    }
}


// =====================================================
// CARTÃO "VAMOS COMEÇAR?"
// =====================================================

function obterMetaParaAdicionar() {

    return obterMetasOrdenadas().find(function (meta) {
        return obterStatus(meta) !== "concluida";
    }) || null;
}

function atualizarCartaoComecar() {

    const titulo = document.getElementById("comecar-titulo");
    const texto = document.getElementById("comecar-texto");

    if (!titulo || !texto) {
        return;
    }

    const totalGuardado = metas.reduce(function (soma, meta) {
        return soma + valorAtualDe(meta);
    }, 0);

    const alvo = obterMetaParaAdicionar();

    if (metas.length === 0) {

        titulo.textContent = "Vamos começar?";
        texto.textContent = "Crie sua primeira meta e dê o primeiro passo.";

    } else if (!alvo) {

        titulo.textContent = "Parabéns!";
        texto.textContent = "Que tal criar uma nova meta?";

    } else if (totalGuardado <= 0) {

        titulo.textContent = "Vamos começar?";
        texto.textContent = "Dê o primeiro passo adicionando um valor à sua meta.";

    } else {

        titulo.textContent = "Continue assim!";
        texto.textContent = "Conseguiu guardar mais? Adicione o valor à sua meta.";
    }
}

function configurarCartaoComecar() {

    const cartao = document.getElementById("cartao-comecar");

    if (!cartao) {
        return;
    }

    cartao.addEventListener("click", function (evento) {

        const alvo = obterMetaParaAdicionar();

        // Com meta em andamento: abre direto o "Adicionar valor"
        if (alvo) {
            evento.preventDefault();
            abrirModalValor(alvo);
        }
    });
}


// =====================================================
// MODAIS
// =====================================================

function abrirModal(id) {

    const modal = document.getElementById(id);

    if (modal) {
        modal.hidden = false;
    }
}

function fecharModais() {

    document.querySelectorAll(".fundo-modal").forEach(function (modal) {
        modal.hidden = true;
    });

    metaDoModalId = null;
}

function configurarModais() {

    document.querySelectorAll(".fundo-modal").forEach(function (modal) {

        modal.addEventListener("click", function (evento) {

            if (
                evento.target === modal ||
                evento.target.closest("[data-fechar]")
            ) {
                fecharModais();
            }
        });
    });

    document.addEventListener("keydown", function (evento) {

        if (evento.key === "Escape") {
            fecharModais();
        }
    });

    const formulario = document.getElementById("form-valor");

    if (formulario) {
        formulario.addEventListener("submit", salvarValor);
    }

    const campo = document.getElementById("campo-valor");

    if (campo) {
        campo.addEventListener("input", function () {
            definirErroModal("");
        });
    }
}

function definirErroModal(mensagem) {

    const erro = document.getElementById("erro-modal-valor");

    if (erro) {
        erro.textContent = mensagem;
    }
}


// ---------- ADICIONAR VALOR ----------

function abrirModalValor(meta) {

    fecharModais();

    metaDoModalId = meta.id;

    const falta = Math.max(valorMetaDe(meta) - valorAtualDe(meta), 0);

    document.getElementById("nome-modal-valor").textContent = meta.nome;

    document.getElementById("resumo-modal-valor").innerHTML =
        `Você já tem <strong>${formatarMoeda(valorAtualDe(meta))}</strong> ` +
        `de ${formatarMoeda(valorMetaDe(meta))}. ` +
        `Falta <strong>${formatarMoeda(falta)}</strong>.`;

    const campo = document.getElementById("campo-valor");

    campo.value = "";

    definirErroModal("");

    abrirModal("modal-valor");

    campo.focus();
}


async function salvarValor(evento) {

    evento.preventDefault();

    const meta = metas.find(function (item) {
        return item.id === metaDoModalId;
    });

    if (!meta) {
        fecharModais();
        return;
    }

    const campo = document.getElementById("campo-valor");
    const valor = Number(campo.value);

    if (!valor || valor <= 0) {
        definirErroModal("Digite um valor maior que zero.");
        campo.focus();
        return;
    }

    const novoValor = arredondar(valorAtualDe(meta) + valor);
    const jaEstavaConcluida = obterStatus(meta) === "concluida";

    const botao = document.getElementById("botao-salvar-valor");

    botao.disabled = true;

    try {

        const resposta = await fetch(`/api/metas/${meta.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(
                Object.assign({}, meta, { valorAtual: novoValor })
            )
        });

        let dados = {};

        try {
            dados = await resposta.json();
        } catch (erro) {
            dados = {};
        }

        if (!resposta.ok || dados.sucesso === false) {
            throw new Error(
                dados.mensagem ||
                "O servidor não aceitou a atualização da meta."
            );
        }

        meta.valorAtual = novoValor;

        fecharModais();
        atualizarTela();

        if (!jaEstavaConcluida && obterStatus(meta) === "concluida") {
            mostrarAviso(`Parabéns! Você concluiu a meta "${meta.nome}"!`);
        } else {
            mostrarAviso(
                `${formatarMoeda(valor)} adicionado! Total: ${formatarMoeda(novoValor)}.`
            );
        }

    } catch (erro) {

        console.error("Erro ao adicionar valor:", erro);

        definirErroModal(
            erro.message ||
            "Não foi possível adicionar o valor. Tente novamente."
        );

    } finally {

        botao.disabled = false;
    }
}


// ---------- DETALHES ----------

function abrirModalDetalhes(meta) {

    fecharModais();

    metaDoModalId = meta.id;

    const status = obterStatus(meta);
    const categoria = obterCategoria(meta);
    const falta = Math.max(valorMetaDe(meta) - valorAtualDe(meta), 0);
    const diasRestantes = descreverDiasRestantes(meta);

    document.getElementById("nome-modal-detalhes").textContent = meta.nome;

    const linhas = [];

    if (meta.descricao) {
        linhas.push(["Descrição", escaparHTML(meta.descricao)]);
    }

    linhas.push(
        ["Situação", ROTULOS_STATUS[status]],
        ["Categoria", categoria.nome],
        ["Valor guardado", formatarMoeda(valorAtualDe(meta))],
        ["Objetivo", formatarMoeda(valorMetaDe(meta))],
        ["Falta", formatarMoeda(falta)],
        ["Progresso", formatarPorcentagem(calcularPorcentagem(meta))],
        [
            "Prazo",
            formatarDataCompleta(meta) +
            (diasRestantes && status !== "concluida" ? ` (${diasRestantes})` : "")
        ]
    );

    document.getElementById("corpo-detalhes").innerHTML = linhas
        .map(function (linha) {
            return `<div class="linha-detalhe"><span>${linha[0]}</span><strong>${linha[1]}</strong></div>`;
        })
        .join("");

    const botaoAdicionar = document.getElementById("detalhes-adicionar");

    botaoAdicionar.hidden = status === "concluida";

    botaoAdicionar.onclick = function () {
        abrirModalValor(meta);
    };

    abrirModal("modal-detalhes");
}


// =====================================================
// EXCLUIR META
// =====================================================

async function excluirMeta(meta) {

    if (!confirm(`Deseja excluir a meta "${meta.nome}"?`)) {
        return;
    }

    try {

        const resposta = await fetch(`/api/metas/${meta.id}`, {
            method: "DELETE"
        });

        if (!resposta.ok) {
            throw new Error("Não foi possível excluir a meta.");
        }

        await carregarMetas();

        mostrarAviso("Meta excluída.");

    } catch (erro) {

        console.error(erro);

        mostrarAviso("Não foi possível excluir a meta.", true);
    }
}


// =====================================================
// ORDENAÇÃO
// =====================================================

function configurarOrdenacao() {

    const seletor = document.getElementById("ordenar-metas");

    if (!seletor) {
        return;
    }

    seletor.addEventListener("change", function () {

        ordemAtual = seletor.value;

        mostrarMetas();
    });
}


// =====================================================
// AVISO
// =====================================================

function mostrarAviso(mensagem, erro) {

    const aviso = document.createElement("div");

    aviso.className = "aviso-meta" + (erro ? " aviso-erro" : "");
    aviso.textContent = mensagem;

    document.body.appendChild(aviso);

    setTimeout(function () {
        aviso.remove();
    }, 3500);
}


// =====================================================
// LINKS TEMPORÁRIOS
// =====================================================

function configurarLinksTemporarios() {

    document.querySelectorAll(
        '.link-menu[href="#"]'
    ).forEach(function (link) {

        link.addEventListener("click", function (evento) {
            evento.preventDefault();
        });
    });
}


// =====================================================
// INICIAR PÁGINA
// =====================================================

document.addEventListener("DOMContentLoaded", async function () {

    const logado = await mostrarUsuario();

    if (!logado) {
        return;
    }

    document.addEventListener("click", fecharMenus);

    configurarModais();
    configurarOrdenacao();
    configurarCartaoComecar();
    configurarLinksTemporarios();

    carregarMetas();
});
