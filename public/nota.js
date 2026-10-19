// =====================================================
// ESTADO
// =====================================================

let notas = [];
let notaEditandoId = null;
let corAtual = "azul";
let termoBusca = "";
let chaveArmazenamento = "notasBipaid";

// Cada cor representa uma categoria da nota
const CORES = {
    azul:    { categoria: "Estudos",  tarefa: "estudos"  },
    roxo:    { categoria: "Trabalho", tarefa: "trabalho" },
    rosa:    { categoria: "Alimentção",    tarefa: "outros"   },
    verde:   { categoria: "Finanças", tarefa: "outros"   },
    amarelo: { categoria: "Pessoal",  tarefa: "pessoal"  }
};

const MESES_ABREVIADOS = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez"
];


// =====================================================
// ARMAZENAMENTO (neste navegador, separado por usuário)
// =====================================================

function carregarNotas() {

    try {

        const salvas = JSON.parse(
            localStorage.getItem(chaveArmazenamento)
        );

        notas = Array.isArray(salvas) ? salvas : [];

    } catch (erro) {

        console.error("Erro ao ler as notas:", erro);
        notas = [];
    }

    notas.forEach(function (nota) {

        if (!CORES[nota.cor]) {
            nota.cor = "azul";
        }
    });
}


function salvarNotas() {

    try {

        localStorage.setItem(
            chaveArmazenamento,
            JSON.stringify(notas)
        );

        return true;

    } catch (erro) {

        console.error("Erro ao salvar as notas:", erro);
        mostrarAviso("Não foi possível salvar a nota neste navegador.", true);

        return false;
    }
}


// =====================================================
// FORMULÁRIO
// =====================================================

function configurarFormulario() {

    const formulario = document.getElementById("form-nota");
    const botaoCancelar = document.getElementById("cancelar-nota");
    const campoTitulo = document.getElementById("titulo-nota");
    const campoConteudo = document.getElementById("conteudo-nota");

    if (!formulario) {
        return;
    }

    formulario.addEventListener("submit", function (evento) {
        evento.preventDefault();
        salvarNota();
    });

    botaoCancelar.addEventListener("click", limparFormulario);

    [campoTitulo, campoConteudo].forEach(function (campo) {
        campo.addEventListener("input", function () {
            mostrarErro("");
        });
    });

    document.querySelectorAll(".cor-opcao").forEach(function (botao) {

        botao.addEventListener("click", function () {
            escolherCor(botao.getAttribute("data-cor"));
        });
    });

    montarLegendaCores();
    escolherCor("azul");
}


// Legenda: mostra para que serve cada cor (categoria)
function montarLegendaCores() {

    const legenda = document.getElementById("legenda-cores");

    if (legenda) {
        legenda.innerHTML = "";
    }

    Object.keys(CORES).forEach(function (cor) {

        const categoria = CORES[cor].categoria;

        // Dica ao passar o mouse sobre a bolinha
        const botao = document.querySelector(`.cor-opcao[data-cor="${cor}"]`);

        if (botao) {
            botao.title = categoria;
            botao.setAttribute("aria-label", `Cor ${cor}: ${categoria}`);
        }

        if (legenda) {

            const item = document.createElement("li");

            item.className = `cor-${cor}`;
            item.innerHTML = `<i></i>${categoria}`;

            legenda.appendChild(item);
        }
    });
}


function escolherCor(cor) {

    if (!CORES[cor]) {
        return;
    }

    corAtual = cor;

    document.querySelectorAll(".cor-opcao").forEach(function (botao) {

        const selecionada = botao.getAttribute("data-cor") === cor;

        botao.classList.toggle("selecionada", selecionada);
        botao.setAttribute("aria-pressed", selecionada);
    });
}


function mostrarErro(mensagem) {

    const erro = document.getElementById("erro-nota");

    if (erro) {
        erro.textContent = mensagem;
    }
}


function limparFormulario() {

    document.getElementById("titulo-nota").value = "";
    document.getElementById("conteudo-nota").value = "";

    notaEditandoId = null;

    document.getElementById("titulo-formulario").textContent = "Nova nota";

    escolherCor("azul");
    mostrarErro("");
}


function salvarNota() {

    const titulo = document.getElementById("titulo-nota").value.trim();
    const conteudo = document.getElementById("conteudo-nota").value.trim();

    if (!titulo) {
        mostrarAviso("Digite um título para a nota.");
        document.getElementById("titulo-nota").focus();
        return;
    }

    if (!conteudo) {
        mostrarAviso("Escreva o conteúdo da nota.");
        document.getElementById("conteudo-nota").focus();
        return;
    }

    if (notaEditandoId) {

        const nota = notas.find(function (item) {
            return item.id === notaEditandoId;
        });

        if (nota) {
            nota.titulo = titulo;
            nota.conteudo = conteudo;
            nota.cor = corAtual;
        }

    } else {

        notas.push({
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            titulo: titulo,
            conteudo: conteudo,
            cor: corAtual,
            criadoEm: new Date().toISOString()
        });
    }

    if (!salvarNotas()) {
        return;
    }

    const editou = notaEditandoId !== null;

    limparFormulario();
    mostrarNotas();

    mostrarAviso(editou ? "Nota atualizada!" : "Nota salva!");
}


function iniciarEdicao(nota) {

    notaEditandoId = nota.id;

    document.getElementById("titulo-nota").value = nota.titulo;
    document.getElementById("conteudo-nota").value = nota.conteudo;
    document.getElementById("titulo-formulario").textContent = "Editar nota";

    escolherCor(nota.cor);
    mostrarErro("");

    document.getElementById("titulo-nota").scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    document.getElementById("titulo-nota").focus();
}


// =====================================================
// LISTA DE NOTAS
// =====================================================

function formatarDataNota(iso) {

    const data = new Date(iso);

    if (isNaN(data)) {
        return "";
    }

    return `${data.getDate()} ${MESES_ABREVIADOS[data.getMonth()]} ${data.getFullYear()}`;
}


function mostrarNotas() {

    const lista = document.getElementById("lista-notas");

    if (!lista) {
        return;
    }

    const termo = termoBusca.trim().toLowerCase();

    const visiveis = notas
        .filter(function (nota) {

            if (!termo) {
                return true;
            }

            return (
                nota.titulo.toLowerCase().includes(termo) ||
                nota.conteudo.toLowerCase().includes(termo) ||
                CORES[nota.cor].categoria.toLowerCase().includes(termo)
            );
        })
        .sort(function (a, b) {
            return (b.criadoEm || "").localeCompare(a.criadoEm || "");
        });

    lista.innerHTML = "";

    if (visiveis.length === 0) {

        const vazio = document.createElement("p");

        vazio.className = "sem-notas";

        vazio.textContent = notas.length === 0
            ? "Você ainda não tem notas. Crie a primeira ao lado!"
            : "Nenhuma nota encontrada.";

        lista.appendChild(vazio);

        return;
    }

    visiveis.forEach(function (nota) {
        lista.appendChild(criarItemNota(nota));
    });
}


function criarItemNota(nota) {

    const item = document.createElement("article");

    item.className = `nota-item cor-${nota.cor}`;

    item.innerHTML = `
        <div class="icone-nota-item">
            <svg class="ic"><use href="#i-doc"/></svg>
        </div>

        <div class="corpo-nota-item">
            <strong>${escaparHTML(nota.titulo)}</strong>
            <p>${escaparHTML(nota.conteudo)}</p>

            <div class="rodape-nota-item">
                <span class="data-nota">${formatarDataNota(nota.criadoEm)}</span>
                <span class="tag-nota">${CORES[nota.cor].categoria}</span>
            </div>
        </div>

        <div class="area-menu-nota">
            <button type="button" class="botao-menu-nota" aria-label="Opções da nota">•••</button>

            <div class="menu-nota" hidden>
                <button type="button" data-acao="editar">Editar</button>
                <button type="button" data-acao="tarefa">Criar tarefa</button>
                <button type="button" data-acao="excluir" class="perigo">Excluir</button>
            </div>
        </div>
    `;

    const botaoMenu = item.querySelector(".botao-menu-nota");
    const menu = item.querySelector(".menu-nota");

    botaoMenu.addEventListener("click", function (evento) {

        evento.stopPropagation();

        const estavaFechado = menu.hidden;

        fecharMenus();

        menu.hidden = !estavaFechado;
    });

    menu.addEventListener("click", function (evento) {

        const botao = evento.target.closest("button[data-acao]");

        if (!botao) {
            return;
        }

        fecharMenus();

        const acao = botao.getAttribute("data-acao");

        if (acao === "editar") {
            iniciarEdicao(nota);
        }

        if (acao === "tarefa") {
            criarTarefaDaNota(nota);
        }

        if (acao === "excluir") {
            excluirNota(nota);
        }
    });

    return item;
}


function fecharMenus() {

    document.querySelectorAll(".menu-nota").forEach(function (menu) {
        menu.hidden = true;
    });
}


function excluirNota(nota) {

    if (!confirm("Deseja excluir esta nota?")) {
        return;
    }

    notas = notas.filter(function (item) {
        return item.id !== nota.id;
    });

    if (notaEditandoId === nota.id) {
        limparFormulario();
    }

    salvarNotas();
    mostrarNotas();

    mostrarAviso("Nota excluída.");
}


// =====================================================
// BUSCA
// =====================================================

function configurarBusca() {

    const campo = document.getElementById("busca-notas");

    if (!campo) {
        return;
    }

    campo.addEventListener("input", function () {
        termoBusca = campo.value;
        mostrarNotas();
    });
}


// =====================================================
// CRIAR TAREFA NA AGENDA A PARTIR DA NOTA
// =====================================================

async function criarTarefaDaNota(nota) {

    const agora = new Date();

    const dataHoje =
        agora.getFullYear() +
        "-" +
        String(agora.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(agora.getDate()).padStart(2, "0");

    try {

        const resposta = await fetch("/api/tarefas", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                titulo: nota.titulo,
                descricao: nota.conteudo.slice(0, 200),
                data: dataHoje,
                horario: "",
                categoria: CORES[nota.cor].tarefa,
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
                "Não foi possível criar a tarefa."
            );
        }

        // A nota virou tarefa: sai de "Minhas notas"
        notas = notas.filter(function (item) {
            return item.id !== nota.id;
        });

        salvarNotas();

        // Vai para a agenda (visão do dia, onde a tarefa de hoje aparece)
        window.location.href = "agenda.html#dia";

    } catch (erro) {

        console.error("Erro ao criar tarefa:", erro);

        mostrarAviso(
            erro.message || "Não foi possível criar a tarefa.",
            true
        );
    }
}


// =====================================================
// AUXILIARES
// =====================================================

function escaparHTML(texto) {

    const div = document.createElement("div");

    div.textContent = texto || "";

    return div.innerHTML;
}


function mostrarAviso(mensagem, erro) {

    const aviso = document.createElement("div");

    aviso.className = "aviso-nota" + (erro ? " aviso-erro" : "");
    aviso.textContent = mensagem;

    document.body.appendChild(aviso);

    setTimeout(function () {
        aviso.remove();
    }, 3000);
}


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

    // Cada usuário vê apenas as suas notas neste navegador
    const nome = document.querySelector(".botao-perfil .nome-usuario");

    if (nome && nome.textContent.trim()) {
        chaveArmazenamento = "notasBipaid:" + nome.textContent.trim();
    }

    document.addEventListener("click", fecharMenus);

    carregarNotas();
    configurarFormulario();
    configurarBusca();
    configurarLinksTemporarios();
    mostrarNotas();
});

