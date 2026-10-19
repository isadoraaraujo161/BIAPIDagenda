

// =====================================================
// NOVA META - BIPAID
// =====================================================

const ANOS_MAXIMOS = 50;

let enviando = false;


// =====================================================
// DATAS
// =====================================================

function formatarDataISO(data) {

    return String(data.getFullYear()).padStart(4, "0") +
        "-" +
        String(data.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(data.getDate()).padStart(2, "0");
}

// Hoje, no horário do usuário (AAAA-MM-DD)
function obterDataHoje() {
    return formatarDataISO(new Date());
}

// Limite máximo: hoje + 50 anos
function obterDataMaxima() {

    const agora = new Date();

    return formatarDataISO(
        new Date(
            agora.getFullYear() + ANOS_MAXIMOS,
            agora.getMonth(),
            agora.getDate()
        )
    );
}

// Impede escolher dias passados no calendário
function definirLimitesDaData() {

    const campo = document.getElementById("dataLimite");

    if (!campo) {
        return;
    }

    campo.min = obterDataHoje();
    campo.max = obterDataMaxima();
}

// Confere se o dia realmente existe (ex.: 31/02 não existe)
function dataExiste(texto) {

    const partes = String(texto).split("-").map(Number);

    if (partes.length !== 3 || partes.some(isNaN)) {
        return false;
    }

    const ano = partes[0];
    const mes = partes[1];
    const dia = partes[2];

    const data = new Date(2000, 0, 1);

    data.setFullYear(ano, mes - 1, dia);

    return (
        data.getFullYear() === ano &&
        data.getMonth() === mes - 1 &&
        data.getDate() === dia
    );
}

// Devolve a mensagem de erro, ou "" se a data estiver correta
function validarDataLimite() {

    const campo = document.getElementById("dataLimite");
    const valor = campo.value;

    // O navegador deixa o campo vazio quando a data digitada é inválida
    if (!valor) {

        if (campo.validity.badInput) {
            return "Essa data não existe. Confira o dia, o mês e o ano.";
        }

        return "Escolha uma data limite.";
    }

    if (!dataExiste(valor)) {
        return "Essa data não existe. Confira o dia, o mês e o ano.";
    }

    if (valor < obterDataHoje()) {
        return "A data limite não pode ser uma data passada. Escolha hoje ou um dia futuro.";
    }

    if (valor > obterDataMaxima()) {
        return `Escolha uma data de até ${ANOS_MAXIMOS} anos a partir de hoje.`;
    }

    return "";
}


// =====================================================
// MENSAGENS
// =====================================================

function mostrarErro(mensagem) {

    const erro = document.getElementById("erro-formulario");

    if (erro) {
        erro.textContent = mensagem;
    }
}

function mostrarAviso(mensagem) {

    const aviso = document.createElement("div");

    aviso.className = "aviso-formulario";
    aviso.textContent = mensagem;

    document.body.appendChild(aviso);

    setTimeout(function () {
        aviso.remove();
    }, 3000);
}


// =====================================================
// CONTADOR DA DESCRIÇÃO
// =====================================================

function configurarContador() {

    const campo = document.getElementById("descricaoMeta");
    const contador = document.getElementById("contador-descricao");

    if (!campo || !contador) {
        return;
    }

    function atualizar() {
        contador.textContent = `${campo.value.length}/500`;
    }

    campo.addEventListener("input", atualizar);

    atualizar();
}


// =====================================================
// SALVAR META
// =====================================================

async function salvarMeta(evento) {

    evento.preventDefault();

    if (enviando) {
        return;
    }

    const campoNome = document.getElementById("nomeMeta");
    const campoCategoria = document.getElementById("categoriaMeta");
    const campoObjetivo = document.getElementById("valorObjetivo");
    const campoAtual = document.getElementById("valorAtual");
    const campoData = document.getElementById("dataLimite");
    const campoPrioridade = document.getElementById("prioridadeMeta");
    const campoDescricao = document.getElementById("descricaoMeta");

    const nome = campoNome.value.trim();
    const categoria = campoCategoria.value;
    const valorMeta = Number(campoObjetivo.value);
    const valorAtual = Number(campoAtual.value);
    const dataLimite = campoData.value;
    const prioridade = campoPrioridade.value;
    const descricao = campoDescricao.value.trim();

    // =================================================
    // VALIDAR
    // =================================================

    if (!nome) {
        mostrarAviso("Digite o nome da meta.");
        campoNome.focus();
        return;
    }

    if (!categoria) {
         mostrarAviso("Selecione uma categoria.");
        campoCategoria.focus();
        return;
    }

    if (!valorMeta || valorMeta <= 0) {
         mostrarAviso("Digite um valor objetivo maior que zero.");
        campoObjetivo.focus();
        return;
    }

    if (valorAtual < 0) {
         mostrarAviso("O valor já alcançado não pode ser negativo.");
        campoAtual.focus();
        return;
    }

    if (valorAtual > valorMeta) {
         mostrarAviso("O valor já alcançado não pode ser maior que o valor objetivo.");
        campoAtual.focus();
        return;
    }

    const erroData = validarDataLimite();

    if (erroData) {
         mostrarAviso(erroData);
        campoData.focus();
        return;
    }

    mostrarErro("");

    // =================================================
    // ENVIAR PARA O SERVIDOR
    // =================================================

    const botaoEnviar = document.querySelector(".botao-criar-meta");

    enviando = true;
    botaoEnviar.disabled = true;

    try {

        const resposta = await fetch("/api/metas", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nome,
                categoria,
                valorAtual,
                valorMeta,
                dataLimite,
                prioridade,
                descricao
            })
        });

        const dados = await resposta.json();

        if (!dados.sucesso) {
             mostrarAviso(dados.mensagem || "Não foi possível criar a meta.");
            enviando = false;
            botaoEnviar.disabled = false;
            return;
        }

        mostrarAviso("Meta criada com sucesso!");

        // Volta para as metas (o botão fica bloqueado até sair)
        setTimeout(function () {
            window.location.href = "metas.html";
        }, 900);

    } catch (erro) {

        console.error("Erro:", erro);

         mostrarAviso("Não foi possível conectar ao servidor. Verifique se o Node.js está funcionando.");

        enviando = false;
        botaoEnviar.disabled = false;
    }
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

    definirLimitesDaData();
    configurarContador();
    configurarLinksTemporarios();

    const formulario = document.getElementById("formulario-meta");

    if (!formulario) {
        return;
    }

    formulario.addEventListener("submit", salvarMeta);

    // Limpa o erro ao digitar
    formulario.querySelectorAll("input, select, textarea").forEach(function (campo) {
        campo.addEventListener("input", function () {
            mostrarErro("");
        });
    });

    // Avisa na hora se a data escolhida/digitada estiver errada
    const campoData = document.getElementById("dataLimite");

    campoData.addEventListener("change", function () {
         mostrarAviso(validarDataLimite());
    });

    campoData.addEventListener("blur", function () {

        if (campoData.value || campoData.validity.badInput) {
             mostrarAviso(validarDataLimite());
        }
    });
});


