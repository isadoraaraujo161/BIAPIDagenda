

// =====================================================
// EVENTOS EPT - BIPAID
// =====================================================

// Eventos demonstrativos (dia e mês fixos; o ano é sempre a
// próxima ocorrência, para a data nunca ficar no passado)
const EVENTOS = [
    {
        id: "evento-projetos-ept",
        titulo: "Projetos de tecnologia, empreendedorismo e educação profissional",
        dia: 18,
        mes: 8,
        horario: "14:00",
        local: "Auditório Central",
        publico: "Estudantes e educadores",
        tipo: "educacao"
    },
    {
        id: "evento-pensamento-computacional",
        titulo: "Pensamento computacional e uso responsável de tecnologia",
        dia: 24,
        mes: 8,
        horario: "09:00",
        local: "Laboratório Maker",
        publico: "Iniciantes em tecnologia",
        tipo: "tecnologia"
    }
];

const MESES_ABREVIADOS = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez"
];

let filtroTipo = "todos";
let filtroPeriodo = "todo";
let termoBusca = "";
let adicionados = [];
let chaveArmazenamento = "eventosEptAdicionados";


// =====================================================
// DATAS
// =====================================================

function proximaOcorrencia(evento) {

    const hoje = new Date();

    const inicioHoje = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate()
    );

    let ano = hoje.getFullYear();

    if (new Date(ano, evento.mes, evento.dia) < inicioHoje) {
        ano++;
    }

    return new Date(ano, evento.mes, evento.dia);
}

function formatarDataISO(data) {

    return data.getFullYear() +
        "-" +
        String(data.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(data.getDate()).padStart(2, "0");
}

function formatarDataEvento(evento) {

    return `${evento.dia} ${MESES_ABREVIADOS[evento.mes]} · ${evento.horario}`;
}

function escaparHTML(texto) {

    const div = document.createElement("div");

    div.textContent = texto || "";

    return div.innerHTML;
}


// =====================================================
// EVENTOS JÁ ADICIONADOS À AGENDA (neste navegador)
// =====================================================

function carregarAdicionados() {

    try {

        const salvos = JSON.parse(
            localStorage.getItem(chaveArmazenamento)
        );

        adicionados = Array.isArray(salvos) ? salvos : [];

    } catch (erro) {

        adicionados = [];
    }
}

function salvarAdicionados() {

    try {

        localStorage.setItem(
            chaveArmazenamento,
            JSON.stringify(adicionados)
        );

    } catch (erro) {

        console.error("Erro ao salvar:", erro);
    }
}


// =====================================================
// FILTROS
// =====================================================

function passaNoPeriodo(evento) {

    if (filtroPeriodo === "todo") {
        return true;
    }

    const data = proximaOcorrencia(evento);
    const hoje = new Date();

    const referencia = new Date(
        hoje.getFullYear(),
        hoje.getMonth() + (filtroPeriodo === "proximo-mes" ? 1 : 0),
        1
    );

    return (
        data.getFullYear() === referencia.getFullYear() &&
        data.getMonth() === referencia.getMonth()
    );
}

function obterEventosFiltrados() {

    const termo = termoBusca.trim().toLowerCase();

    return EVENTOS
        .filter(function (evento) {

            if (filtroTipo !== "todos" && evento.tipo !== filtroTipo) {
                return false;
            }

            if (!passaNoPeriodo(evento)) {
                return false;
            }

            if (!termo) {
                return true;
            }

            return (
                evento.titulo.toLowerCase().includes(termo) ||
                evento.local.toLowerCase().includes(termo) ||
                evento.publico.toLowerCase().includes(termo)
            );
        })
        .sort(function (a, b) {
            return proximaOcorrencia(a) - proximaOcorrencia(b);
        });
}


// =====================================================
// MOSTRAR EVENTOS
// =====================================================

function mostrarEventos() {

    const lista = document.getElementById("lista-eventos");

    if (!lista) {
        return;
    }

    const eventos = obterEventosFiltrados();

    lista.innerHTML = "";

    if (eventos.length === 0) {

        lista.innerHTML = `
            <div class="sem-eventos">
                <div class="icone-sem-eventos">
                    <svg class="ic"><use href="#i-cal"/></svg>
                </div>
                <strong>Nenhum evento encontrado</strong>
                <span>Tente mudar os filtros ou a busca.</span>
            </div>
        `;

        return;
    }

    eventos.forEach(function (evento) {
        lista.appendChild(criarCardEvento(evento));
    });
}

function criarCardEvento(evento) {

    const jaAdicionado = adicionados.includes(evento.id);

    const card = document.createElement("article");

    card.className = "card-evento";

    card.innerHTML = `
        <div class="icone-evento">
            <svg class="ic"><use href="#i-cal"/></svg>
            <small>EPT</small>
        </div>

        <div class="corpo-evento">

            <h2>${escaparHTML(evento.titulo)}</h2>

            <div class="barra-informacoes">

                <div class="informacao">
                    <svg class="ic"><use href="#i-cal"/></svg>
                    <span>${formatarDataEvento(evento)}</span>
                </div>

                <div class="informacao">
                    <svg class="ic"><use href="#i-pin"/></svg>
                    <span>${escaparHTML(evento.local)}</span>
                </div>

                <div class="informacao">
                    <svg class="ic"><use href="#i-users"/></svg>
                    <span>${escaparHTML(evento.publico)}</span>
                </div>

            </div>

            <div class="rodape-evento">

                <a href="#" class="referencia-evento">Referência oficial da EPT ↗</a>

                <button type="button" class="botao-agenda${jaAdicionado ? " evento-adicionado" : ""}"${jaAdicionado ? " disabled" : ""}>
                    ${jaAdicionado ? "✓ Adicionado à agenda" : "＋ Adicionar à agenda"}
                </button>

            </div>

        </div>
    `;

    card.querySelector(".referencia-evento")
        .addEventListener("click", function (evento) {
            evento.preventDefault();
        });

    card.querySelector(".botao-agenda")
        .addEventListener("click", function () {
            adicionarEvento(evento, this);
        });

    return card;
}


// =====================================================
// ADICIONAR EVENTO À AGENDA
// =====================================================

async function adicionarEvento(evento, botao) {

    if (botao.disabled) {
        return;
    }

    botao.disabled = true;

    try {

        const resposta = await fetch("/api/tarefas", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                titulo: `Evento EPT: ${evento.titulo}`,
                descricao: `Local: ${evento.local}\nPúblico: ${evento.publico}`,
                data: formatarDataISO(proximaOcorrencia(evento)),
                horario: evento.horario,
                categoria: "eventos",
                prioridade: "normal"
            })
        });

        let dados = {};

        try {
            dados = await resposta.json();
        } catch (erro) {
            dados = {};
        }

        if (!resposta.ok) {
            throw new Error(
                dados.mensagem ||
                `Erro HTTP ${resposta.status}`
            );
        }

        adicionados.push(evento.id);
        salvarAdicionados();

        botao.textContent = "✓ Adicionado à agenda";
        botao.classList.add("evento-adicionado");

        mostrarAviso("Evento adicionado à sua agenda!");

    } catch (erro) {

        console.error("Erro ao adicionar evento:", erro);

        botao.disabled = false;

        mostrarAviso(
            "Não foi possível adicionar o evento à agenda. " + erro.message,
            true
        );
    }
}


// =====================================================
// FILTROS E BUSCA
// =====================================================

function configurarFiltros() {

    const tipo = document.getElementById("filtro-tipo");
    const periodo = document.getElementById("filtro-periodo");
    const busca = document.getElementById("busca-evento");

    if (tipo) {
        tipo.addEventListener("change", function () {
            filtroTipo = tipo.value;
            mostrarEventos();
        });
    }

    if (periodo) {
        periodo.addEventListener("change", function () {
            filtroPeriodo = periodo.value;
            mostrarEventos();
        });
    }

    if (busca) {
        busca.addEventListener("input", function () {
            termoBusca = busca.value;
            mostrarEventos();
        });
    }
}


// =====================================================
// AVISO
// =====================================================

function mostrarAviso(mensagem, erro) {

    const aviso = document.createElement("div");

    aviso.className = "aviso-evento" + (erro ? " aviso-erro" : "");
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

    // Cada usuário tem a sua lista de eventos já adicionados
    const nome = document.querySelector(".botao-perfil .nome-usuario");

    if (nome && nome.textContent.trim()) {
        chaveArmazenamento = "eventosEptAdicionados:" + nome.textContent.trim();
    }

    carregarAdicionados();
    configurarFiltros();
    configurarLinksTemporarios();
    mostrarEventos();
});

