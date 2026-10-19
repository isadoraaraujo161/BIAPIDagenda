
// =====================================================
// NOVO LANÇAMENTO - BIPAID
// =====================================================

// A página abre como "despesa" (como no design).
// Para abrir como receita: novolancamento.html?tipo=receita
let tipoAtual = "despesa";

const TEXTOS = {

    despesa: {
        crumb: "Nova despesa",
        titulo: "Registrar nova despesa",
        subtitulo: "Adicione seus gastos para manter seu controle financeiro em dia.",
        card: "Nova despesa",
        nome: "Nome da despesa",
        erroNome: "Digite o nome da despesa.",
        placeholderNome: "Ex: Mercado, transporte, lazer...",
        forma: "Forma de pagamento",
        selecioneForma: "Selecione a forma de pagamento",
        botao: "Adicionar despesa",
        sucesso: "Despesa adicionada com sucesso!",
        frase: "Pequenos gastos<br>fazem grandes<br>diferenças!"
    },

    receita: {
        crumb: "Valor recebido",
        titulo: "Registrar valor recebido",
        subtitulo: "Adicione o que você recebeu para manter seu controle financeiro em dia.",
        card: "Valor recebido",
        nome: "Nome do recebimento",
        erroNome: "Digite o nome do recebimento.",
        placeholderNome: "Ex: Mesada, salário, freelance...",
        forma: "Forma de recebimento",
        selecioneForma: "Selecione a forma de recebimento",
        botao: "Adicionar valor recebido",
        sucesso: "Valor recebido adicionado com sucesso!",
        frase: "Cada entrada<br>conta para<br>seus sonhos!"
    }
};

let enviando = false;


// =====================================================
// DATA DE HOJE (AAAA-MM-DD, no horário do usuário)
// =====================================================

function obterDataHoje() {

    const agora = new Date();

    return agora.getFullYear() +
        "-" +
        String(agora.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(agora.getDate()).padStart(2, "0");
}


// Impede escolher dias que ainda não chegaram
function definirDataMaxima() {

    const campo = document.getElementById("data");

    if (campo) {
        campo.max = obterDataHoje();
    }
}


// =====================================================
// TIPO (DESPESA / RECEITA)
// =====================================================

function aplicarTipo(tipo) {

    tipoAtual = tipo;

    const t = TEXTOS[tipo];

    function texto(id, valor) {

        const elemento = document.getElementById(id);

        if (elemento) {
            elemento.textContent = valor;
        }
    }

    texto("crumb-tipo", t.crumb);
    texto("titulo-pagina", t.titulo);
    texto("subtitulo-pagina", t.subtitulo);
    texto("titulo-card", t.card);
    texto("rotulo-nome-texto", t.nome);
    texto("rotulo-forma-texto", t.forma);
    texto("opcao-forma-vazia", t.selecioneForma);
    texto("texto-botao", t.botao);

    const frase = document.getElementById("frase-pagina");

    if (frase) {
        frase.innerHTML = t.frase;
    }

    const campoNome = document.getElementById("nome-lancamento");

    if (campoNome) {
        campoNome.placeholder = t.placeholderNome;
    }

    document.title = `${t.crumb} - BIPAID`;

    document.querySelectorAll(".opcao-tipo").forEach(function (botao) {

        const ativo = botao.getAttribute("data-tipo") === tipo;

        botao.classList.toggle("ativo", ativo);
        botao.setAttribute("aria-pressed", ativo);
    });

    mostrarErro("");
}


function configurarTipo() {

    document.querySelectorAll(".opcao-tipo").forEach(function (botao) {

        botao.addEventListener("click", function () {
            aplicarTipo(botao.getAttribute("data-tipo"));
        });
    });

    const parametro = new URLSearchParams(window.location.search).get("tipo");

    aplicarTipo(parametro === "receita" ? "receita" : "despesa");
}


// =====================================================
// CONTADOR DA DESCRIÇÃO
// =====================================================

function configurarContador() {

    const campo = document.getElementById("descricao");
    const contador = document.getElementById("contador-descricao");

    if (!campo || !contador) {
        return;
    }

    function atualizar() {
        contador.textContent = `${campo.value.length}/200`;
    }

    campo.addEventListener("input", atualizar);

    atualizar();
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
// SALVAR LANÇAMENTO
// =====================================================

async function salvarLancamento(evento) {

    evento.preventDefault();

    if (enviando) {
        return;
    }

    // =================================================
    // PEGAR OS DADOS
    // =================================================

    const campoNome = document.getElementById("nome-lancamento");
    const campoValor = document.getElementById("valor");
    const campoData = document.getElementById("data");
    const campoCategoria = document.getElementById("categoria");
    const campoForma = document.getElementById("forma-pagamento");
    const campoDescricao = document.getElementById("descricao");

    const nome = campoNome.value.trim();
    const valor = Number(campoValor.value);
    const data = campoData.value;
    const categoria = campoCategoria.value;
    const formaPagamento = campoForma.value;
    const descricao = campoDescricao.value.trim();

    // =================================================
    // VALIDAR
    // =================================================

    if (!nome) {
        mostrarAviso(TEXTOS[tipoAtual].erroNome);
        campoNome.focus();
        return;
    }

    if (!valor || valor <= 0) {
        mostrarAviso("Digite um valor maior que zero.");
        campoValor.focus();
        return;
    }

    if (!data) {
        mostrarAviso("Escolha uma data.");
        campoData.focus();
        return;
    }

    // Não aceita datas futuras (nem digitando à mão)
    if (data > obterDataHoje()) {
        mostrarErro("Não é possível lançar uma data futura. Escolha hoje ou um dia anterior.");
        campoData.focus();
        return;
    }

    if (!categoria) {
        mostrarAviso("Selecione uma categoria.");
        campoCategoria.focus();
        return;
    }

    if (!formaPagamento) {
       mostrarAviso(`Selecione a ${TEXTOS[tipoAtual].forma.toLowerCase()}.`);
        campoForma.focus();
        return;
    }

    mostrarErro("");

    // =================================================
    // CONVERTER O TIPO (igual ao que o servidor espera)
    // =================================================

    const tipo = tipoAtual === "receita"
        ? "entrada"
        : "saida";

    // =================================================
    // ENVIAR PARA O SERVIDOR
    // =================================================

    const botaoEnviar = document.querySelector(".botao-adicionar");

    enviando = true;
    botaoEnviar.disabled = true;

    try {

        const resposta = await fetch("/api/lancamentos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nome,
                tipo,
                valor,
                categoria,
                formaPagamento,
                data,
                descricao
            })
        });

        const dados = await resposta.json();

        if (!dados.sucesso) {
           mostrarAviso(dados.mensagem || "Não foi possível adicionar o lançamento.");
            enviando = false;
            botaoEnviar.disabled = false;
            return;
        }

        mostrarAviso(TEXTOS[tipoAtual].sucesso);

        // Volta para o Meu Dinheiro (o botão fica bloqueado até sair)
        setTimeout(function () {
            window.location.href = "meudinheiro.html";
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

    configurarTipo();
    definirDataMaxima();
    configurarContador();
    configurarLinksTemporarios();

    const formulario = document.getElementById("formulario-lancamento");

    if (formulario) {
        formulario.addEventListener("submit", salvarLancamento);

        formulario.querySelectorAll("input, select, textarea").forEach(function (campo) {
            campo.addEventListener("input", function () {
                mostrarErro("");
            });
        });
    }
});


