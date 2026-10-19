// =====================================================
// MEU DINHEIRO - BIPAID
// =====================================================

let lancamentos = [];

// Mês exibido nos cartões e em "Gastos do mês" (formato AAAA-MM)
let mesSelecionado = obterChaveMes(new Date());

// Mostrar todos os lançamentos ou só os 5 últimos
let mostrarTodos = false;

const LIMITE_ULTIMOS = 5;

const NOMES_MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const NOMES_CATEGORIAS = {
    alimentacao: "Alimentação",
    transporte: "Transporte",
    estudos: "Estudos",
    lazer: "Lazer"
};


// =====================================================
// CARREGAR LANÇAMENTOS
// =====================================================

async function carregarLancamentos() {

    try {

        const resposta = await fetch("/api/lancamentos");

        if (!resposta.ok) {
            throw new Error("Erro ao carregar lançamentos.");
        }

        const dados = await resposta.json();

        lancamentos = Array.isArray(dados)
            ? dados
            : dados.lancamentos || [];

    } catch (erro) {

        console.error(
            "Erro ao carregar lançamentos:",
            erro
        );

        lancamentos = [];
    }

    mostrarLancamentos();
    atualizarResumo();
    atualizarCategorias();
}


// =====================================================
// FORMATAÇÕES
// =====================================================

function formatarMoeda(valor) {

    return Number(valor || 0).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );
}


function formatarData(data) {

    if (!data) {
        return "";
    }

    const partes = data.split("-");

    if (partes.length !== 3) {
        return data;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}


function obterChaveMes(data) {

    return data.getFullYear() +
        "-" +
        String(data.getMonth() + 1).padStart(2, "0");
}


// "Alimentação" -> "alimentacao"
function normalizarCategoria(texto) {

    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}


function formatarNomeCategoria(categoria) {

    const chave = normalizarCategoria(categoria);

    if (NOMES_CATEGORIAS[chave]) {
        return NOMES_CATEGORIAS[chave];
    }

    const texto = String(categoria || "").trim();

    return texto
        ? texto.charAt(0).toUpperCase() + texto.slice(1)
        : "Outros";
}


function escaparHTML(texto) {

    const div = document.createElement("div");

    div.textContent = texto || "";

    return div.innerHTML;
}


// =====================================================
// TIPOS E PERÍODO
// =====================================================

function ehEntrada(tipo) {

    return (
        tipo === "entrada" ||
        tipo === "receita"
    );
}


function ehDespesa(tipo) {

    return (
        tipo === "saida" ||
        tipo === "despesa"
    );
}


function ehDoMesSelecionado(data) {

    if (!data) {
        return false;
    }

    const partes = data.split("-");

    if (partes.length !== 3) {
        return false;
    }

    return `${partes[0]}-${partes[1]}` === mesSelecionado;
}


// =====================================================
// SELETOR DE MÊS
// =====================================================

function montarSeletorMes() {

    const seletor = document.getElementById("seletor-mes");

    if (!seletor) {
        return;
    }

    const hoje = new Date();

    seletor.innerHTML = "";

    // Mês atual + 11 meses anteriores
    for (let i = 0; i < 12; i++) {

        const data = new Date(
            hoje.getFullYear(),
            hoje.getMonth() - i,
            1
        );

        const opcao = document.createElement("option");

        opcao.value = obterChaveMes(data);

        opcao.textContent = NOMES_MESES[data.getMonth()] +
            (data.getFullYear() !== hoje.getFullYear()
                ? " " + data.getFullYear()
                : "");

        seletor.appendChild(opcao);
    }

    seletor.value = mesSelecionado;

    seletor.addEventListener("change", function () {

        mesSelecionado = seletor.value;

        atualizarResumo();
        atualizarCategorias();
    });
}


// =====================================================
// ÚLTIMOS LANÇAMENTOS
// =====================================================

function mostrarLancamentos() {

    const linhas = document.getElementById("linhas-lancamentos");
    const vazio = document.getElementById("estado-vazio");
    const cabecalho = document.getElementById("cabecalho-tabela");

    if (!linhas) {
        return;
    }

    linhas.innerHTML = "";

    if (lancamentos.length === 0) {

        if (vazio) {
            vazio.hidden = false;
        }

        if (cabecalho) {
            cabecalho.hidden = false;
        }

        return;
    }

    if (vazio) {
        vazio.hidden = true;
    }

    // Mais recentes primeiro
    const ordenados = lancamentos
        .slice()
        .sort(function (a, b) {
            return String(b.data || "").localeCompare(String(a.data || ""));
        });

    const visiveis = mostrarTodos
        ? ordenados
        : ordenados.slice(0, LIMITE_ULTIMOS);

    visiveis.forEach(function (lancamento) {

        const entrada = ehEntrada(lancamento.tipo);

        const linha = document.createElement("div");

        linha.className = "linha-lancamento";

        linha.innerHTML = `
            <span class="descricao-lancamento">
                <i class="marca-tipo ${entrada ? "positivo" : "negativo"}">${entrada ? "↗" : "↘"}</i>
                ${escaparHTML(lancamento.nome || "Sem nome")}
            </span>

            <span>${escaparHTML(formatarNomeCategoria(lancamento.categoria))}</span>

            <span>${formatarData(lancamento.data)}</span>

            <strong class="valor-lancamento ${entrada ? "positivo" : "negativo"}">
                ${entrada ? "+" : "−"}${formatarMoeda(lancamento.valor)}
            </strong>

            <span class="acoes-lancamento">
                <button type="button" class="botao-excluir-lancamento" title="Excluir lançamento" aria-label="Excluir lançamento">×</button>
            </span>
        `;

        linha
            .querySelector(".botao-excluir-lancamento")
            .addEventListener("click", function () {
                excluirLancamento(lancamento.id);
            });

        linhas.appendChild(linha);
    });

    const botaoVerTodos = document.getElementById("ver-todos");

    if (botaoVerTodos) {

        botaoVerTodos.textContent = mostrarTodos && lancamentos.length > LIMITE_ULTIMOS
            ? "Ver menos ↑"
            : "Ver todos →";
    }
}


function configurarVerTodos() {

    const botao = document.getElementById("ver-todos");

    if (!botao) {
        return;
    }

    botao.addEventListener("click", function () {

        if (lancamentos.length <= LIMITE_ULTIMOS) {
            return;
        }

        mostrarTodos = !mostrarTodos;

        mostrarLancamentos();
    });
}


// =====================================================
// EXCLUIR LANÇAMENTO
// =====================================================

async function excluirLancamento(id) {

    const confirmar = confirm("Deseja excluir este lançamento?");

    if (!confirmar) {
        return;
    }

    try {

        const resposta = await fetch(`/api/lancamentos/${id}`, {
            method: "DELETE"
        });

        if (!resposta.ok) {
            throw new Error("Não foi possível excluir o lançamento.");
        }

        await carregarLancamentos();

    } catch (erro) {

        console.error(erro);
        mostrarAviso("Não foi possível excluir o lançamento.");
    }
}


// =====================================================
// RESUMO FINANCEIRO (mês selecionado)
// =====================================================

function atualizarResumo() {

    let totalRecebido = 0;
    let totalGasto = 0;

    lancamentos.forEach(function (lancamento) {

        if (!ehDoMesSelecionado(lancamento.data)) {
            return;
        }

        const valor = Number(lancamento.valor) || 0;

        if (ehEntrada(lancamento.tipo)) {
            totalRecebido += valor;
        }

        if (ehDespesa(lancamento.tipo)) {
            totalGasto += valor;
        }
    });

    const saldo = totalRecebido - totalGasto;

    const valorSaldo = document.getElementById("valor-saldo");
    const valorRecebido = document.getElementById("valor-recebido");
    const valorGasto = document.getElementById("valor-gasto");

    if (valorSaldo) {
        valorSaldo.textContent = formatarMoeda(saldo);
    }

    if (valorRecebido) {
        valorRecebido.textContent = formatarMoeda(totalRecebido);
    }

    if (valorGasto) {
        valorGasto.textContent = formatarMoeda(totalGasto);
    }

    const aviso = document.getElementById("aviso-gastos");

    if (aviso) {

        if (totalGasto === 0) {

            aviso.textContent =
                "Ainda não há gastos registrados neste mês.";

        } else {

            aviso.innerHTML =
                `Você já usou <strong>${formatarMoeda(totalGasto)}</strong> em gastos neste mês.`;
        }
    }
}


// =====================================================
// GASTOS POR CATEGORIA (mês selecionado)
// =====================================================

function atualizarCategorias() {

    const gastos = {
        alimentacao: 0,
        transporte: 0,
        estudos: 0,
        lazer: 0
    };

    lancamentos.forEach(function (lancamento) {

        if (!ehDespesa(lancamento.tipo)) {
            return;
        }

        if (!ehDoMesSelecionado(lancamento.data)) {
            return;
        }

        const chave = normalizarCategoria(lancamento.categoria);

        if (chave in gastos) {
            gastos[chave] += Number(lancamento.valor) || 0;
        }
    });

    const total = Object.values(gastos).reduce(
        function (soma, valor) {
            return soma + valor;
        },
        0
    );

    document.querySelectorAll(".linha-categoria").forEach(
        function (linha) {

            const chave = linha.getAttribute("data-categoria");

            const valor = gastos[chave] || 0;

            const porcentagem = total === 0
                ? 0
                : (valor / total) * 100;

            const textoValor = linha.querySelector(".valor-categoria");
            const textoPorcentagem = linha.querySelector(".porcentagem-categoria");
            const barra = linha.querySelector(".preenchimento-categoria");

            if (textoValor) {
                textoValor.textContent = formatarMoeda(valor);
            }

            if (textoPorcentagem) {
                textoPorcentagem.textContent = `${Math.round(porcentagem)}%`;
            }

            if (barra) {
                barra.style.width = `${porcentagem}%`;
            }
        }
    );
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
// INICIALIZAÇÃO
// =====================================================

document.addEventListener("DOMContentLoaded", async function () {

    const logado = await mostrarUsuario();

    if (!logado) {
        return;
    }

    montarSeletorMes();
    configurarVerTodos();
    configurarLinksTemporarios();
    carregarLancamentos();
});

