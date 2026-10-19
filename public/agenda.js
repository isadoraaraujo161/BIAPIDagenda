
let tarefas = [];
// Sempre no dia 1, para não "pular" mês ao navegar (ex.: 31 de outubro -> novembro)
let dataMesAtual = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

// Dia exibido na visão "Dia" (começa em hoje)
let dataDiaAtual = new Date();

const tarefasHoje = document.getElementById("tarefas-hoje");
const calendarioSemana = document.getElementById("calendario-semana");
const diasCalendario = document.getElementById("dias-calendario");
const mesAtualElemento = document.getElementById("mes-atual");

const quantidadeUrgente = document.getElementById("quantidade-urgente");
const quantidadeImportante = document.getElementById("quantidade-importante");
const quantidadeNormal = document.getElementById("quantidade-normal");

const mesQuantidadeUrgente = document.getElementById("mes-quantidade-urgente");
const mesQuantidadeImportante = document.getElementById("mes-quantidade-importante");
const mesQuantidadeNormal = document.getElementById("mes-quantidade-normal");


document.addEventListener("DOMContentLoaded", async function () {

    const logado = await mostrarUsuario();

    if (!logado) {
        return;
    }

    configurarNavegacao();
    configurarBotoesMes();
    configurarBotoesDia();
    configurarBotoesSemana();
    configurarLinks();
    criarModais();
    carregarTarefas();

});


/* USUÁRIO */

async function mostrarUsuario() {

    try {

        const resposta = await fetch("/api/usuario-atual");

        if (!resposta.ok) {
            // Ninguém logado: volta para a tela de login
            window.location.href = "login.html";
            return false;
        }

        const dados = await resposta.json();
        const usuario = dados.usuario;

        if (!usuario || !usuario.nome) {
            window.location.href = "login.html";
            return false;
        }

        document.querySelectorAll(".nome-usuario").forEach(function (elemento) {
            elemento.textContent = usuario.nome;
        });

        const avatar = document.querySelector(".avatar-usuario");

        if (avatar) {

            const partes = usuario.nome
                .trim()
                .split(/\s+/);

            let iniciais;

            if (partes.length === 1) {
                iniciais = partes[0].substring(0, 2);
            } else {
                iniciais =
                    partes[0][0] +
                    partes[partes.length - 1][0];
            }

            avatar.textContent = iniciais.toUpperCase();
        }

        return true;

    } catch (erro) {

        console.error(erro);
        window.location.href = "login.html";
        return false;

    }
}


/* SAIR */

async function sair() {

    try {

        await fetch("/api/logout", { method: "POST" });

    } catch (erro) {

        console.error(erro);

    } finally {

        window.location.href = "login.html";

    }
}


/* CARREGAR TAREFAS */

async function carregarTarefas() {

    try {

        const resposta = await fetch("/api/tarefas");

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar as tarefas.");
        }

        const dados = await resposta.json();

        tarefas = Array.isArray(dados)
            ? dados
            : dados.tarefas || [];

        mostrarDia();
        mostrarSemana();
        mostrarMes();
        atualizarPrioridades();

    } catch (erro) {

        console.error(erro);

        if (tarefasHoje) {

            tarefasHoje.innerHTML = `
                <p class="sem-tarefas">
                    Não foi possível carregar as tarefas.
                </p>
            `;
        }
    }
}


/* NAVEGAÇÃO */

function configurarNavegacao() {

    const botoes = document.querySelectorAll(".botao-visualizacao");
    const secoes = document.querySelectorAll(".visualizacao-agenda");

    function mostrarSecao(id) {

        const cabecalho = document.querySelector(".cabecalho-pagina");

        if (cabecalho) {
            cabecalho.classList.toggle("modo-dia", id === "dia");
        }

        secoes.forEach(function (secao) {
            secao.classList.remove("ativa");
        });

        botoes.forEach(function (botao) {
            botao.classList.remove("ativo");
        });

        const secao = document.getElementById(id);
        const botao = document.querySelector(`.botao-visualizacao[href="#${id}"]`);

        if (secao) {
            secao.classList.add("ativa");
        }

        if (botao) {
            botao.classList.add("ativo");
        }

        if (id === "dia") {
            mostrarDia();
        }

        if (id === "semana") {
            mostrarSemana();
        }

        if (id === "mes") {
            mostrarMes();
        }
    }

    botoes.forEach(function (botao) {

        botao.addEventListener("click", function (evento) {

            evento.preventDefault();

            const id = botao
                .getAttribute("href")
                .replace("#", "");

            mostrarSecao(id);

            history.replaceState(
                null,
                "",
                `#${id}`
            );
        });
    });

    let inicio = location.hash.replace("#", "");

    if (!["dia", "semana", "mes"].includes(inicio)) {
        inicio = "mes";
    }

    mostrarSecao(inicio);
}


/* DIA */

function configurarBotoesDia() {

    const anterior = document.getElementById("dia-anterior");
    const proximo = document.getElementById("dia-proximo");

    function mudarDia(quantidade) {

        dataDiaAtual = new Date(
            dataDiaAtual.getFullYear(),
            dataDiaAtual.getMonth(),
            dataDiaAtual.getDate() + quantidade
        );

        mostrarDia();
    }

    if (anterior) {
        anterior.addEventListener("click", function () {
            mudarDia(-1);
        });
    }

    if (proximo) {
        proximo.addEventListener("click", function () {
            mudarDia(1);
        });
    }
}


function mostrarDia() {

    if (!tarefasHoje) {
        return;
    }

    const dataFormatada = formatarData(dataDiaAtual);
    const ehHoje = dataFormatada === formatarData(new Date());

    const tituloDia = document.getElementById("titulo-dia");
    const resumoDia = document.getElementById("resumo-dia");

    const tarefasDoDia = tarefas
        .filter(function (tarefa) {
            return tarefa.data === dataFormatada;
        })
        .sort(ordenarPorHorario);

    if (tituloDia) {

        if (ehHoje) {

            tituloDia.textContent = "Hoje, " +
                dataDiaAtual.toLocaleDateString("pt-BR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                });

        } else {

            const texto = dataDiaAtual.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            });

            tituloDia.textContent =
                texto.charAt(0).toUpperCase() + texto.slice(1);
        }
    }

    if (resumoDia) {

        const total = tarefasDoDia.length;

        const concluidas = tarefasDoDia.filter(function (tarefa) {
            return tarefa.concluida;
        }).length;

        resumoDia.textContent = total === 0
            ? "Nenhuma tarefa"
            : `${total} ${total === 1 ? "tarefa" : "tarefas"} • ` +
              `${concluidas} ${concluidas === 1 ? "concluída" : "concluídas"}`;
    }

    tarefasHoje.innerHTML = "";

    if (tarefasDoDia.length === 0) {

        tarefasHoje.innerHTML = `
            <p class="sem-tarefas">
                ${ehHoje ? "Nenhuma tarefa para hoje." : "Nenhuma tarefa neste dia."}
            </p>
        `;

        return;
    }

    tarefasDoDia.forEach(function (tarefa) {
        tarefasHoje.appendChild(
            criarTarefa(tarefa)
        );
    });
}


/* CRIAR TAREFA */

function criarTarefa(tarefa) {

    const elemento = document.createElement("div");

    elemento.className = "tarefa";

    if (tarefa.concluida) {
        elemento.classList.add("tarefa-concluida");
    }

    const horario = tarefa.horario || "—";

    const chaveCategoria = (tarefa.categoria || "outros")
        .toLowerCase()
        .replace(/[^a-z]/g, "");

    const categoria = formatarCategoria(chaveCategoria);

    const prioridade = (
        tarefa.prioridade || "normal"
    ).toLowerCase();

    const descricao = tarefa.descricao
        ? `<span>${escaparHTML(tarefa.descricao)}</span>`
        : "";

    const acao = tarefa.concluida
        ? "Desmarcar tarefa"
        : "Concluir tarefa";

    elemento.innerHTML = `
        <button
            type="button"
            class="marcador"
            title="${acao}"
            aria-label="${acao}">
        </button>

        <span class="hora-tarefa">${escaparHTML(horario)}</span>

        <div class="informacoes-tarefa">
            <strong>${escaparHTML(tarefa.titulo)}</strong>
            ${descricao}
        </div>

        <span class="categoria-tarefa cat-${chaveCategoria}">
            ${categoria}
        </span>

        <span class="prioridade ${prioridade}">
            ${formatarPrioridade(prioridade)}
        </span>

        <button
            type="button"
            class="menu-tarefa"
            title="Editar tarefa"
            aria-label="Editar tarefa">⋮</button>
    `;

    elemento
        .querySelector(".marcador")
        .addEventListener("click", function () {
            alternarConclusao(tarefa.id);
        });

    elemento
        .querySelector(".menu-tarefa")
        .addEventListener("click", function () {
            abrirModalEditar(tarefa);
        });

    return elemento;
}


/* CONCLUIR TAREFA */

async function alternarConclusao(id) {

    const tarefa = tarefas.find(function (item) {
        return item.id === id;
    });

    if (!tarefa) {
        return;
    }

    const concluida = !tarefa.concluida;

    try {

        const resposta = await fetch(
            `/api/tarefas/${id}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    concluida: concluida
                })
            }
        );

        if (!resposta.ok) {
            throw new Error(
                "Não foi possível atualizar a tarefa."
            );
        }

        tarefa.concluida = concluida;

        mostrarDia();
        mostrarSemana();
        mostrarMes();
        atualizarPrioridades();

    } catch (erro) {

        console.error(erro);
    }
}


/* SEMANA */

// 0 = semana atual, -1 = anterior, 1 = próxima...
let deslocamentoSemana = 0;

function obterInicioSemana() {

    const hoje = new Date();

    // A semana começa na segunda-feira
    const diaDaSemana = (hoje.getDay() + 6) % 7;

    return new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate() - diaDaSemana + deslocamentoSemana * 7
    );
}


function formatarIntervaloSemana(inicio, fim) {

    const dois = function (numero) {
        return String(numero).padStart(2, "0");
    };

    const mesInicio = inicio.toLocaleDateString("pt-BR", { month: "long" });
    const mesFim = fim.toLocaleDateString("pt-BR", { month: "long" });

    if (inicio.getFullYear() !== fim.getFullYear()) {
        return `${dois(inicio.getDate())} de ${mesInicio} de ${inicio.getFullYear()} – ` +
               `${dois(fim.getDate())} de ${mesFim} de ${fim.getFullYear()}`;
    }

    if (inicio.getMonth() !== fim.getMonth()) {
        return `${dois(inicio.getDate())} de ${mesInicio} – ` +
               `${dois(fim.getDate())} de ${mesFim} de ${fim.getFullYear()}`;
    }

    return `${dois(inicio.getDate())} – ${dois(fim.getDate())} de ${mesFim} de ${fim.getFullYear()}`;
}


function configurarBotoesSemana() {

    document.querySelectorAll("[data-semana]").forEach(function (botao) {

        botao.addEventListener("click", function () {

            const valor = botao.getAttribute("data-semana");

            if (valor === "atual") {
                deslocamentoSemana = 0;
            } else {
                deslocamentoSemana += Number(valor);
            }

            mostrarSemana();
        });
    });
}


function criarTarefaSemana(tarefa) {

    const item = document.createElement("div");

    const chaveCategoria = (tarefa.categoria || "outros")
        .toLowerCase()
        .replace(/[^a-z]/g, "");

    item.className = `tarefa-semana tsc-${chaveCategoria}`;

    if (tarefa.concluida) {
        item.classList.add("tarefa-semana-concluida");
    }

    const acao = tarefa.concluida
        ? "Desmarcar tarefa"
        : "Concluir tarefa";

    item.innerHTML = `
        <div class="topo-tarefa-semana">
            <button type="button" class="radio-tarefa" title="${acao}" aria-label="${acao}"></button>
            <span class="hora-semana">${escaparHTML(tarefa.horario || "—")}</span>
            <button type="button" class="menu-tarefa-semana" title="Editar tarefa" aria-label="Editar tarefa">⋮</button>
        </div>

        <strong>${escaparHTML(tarefa.titulo)}</strong>

        <span class="categoria-mini">${formatarCategoria(chaveCategoria)}</span>
    `;

    item.querySelector(".radio-tarefa")
        .addEventListener("click", function () {
            alternarConclusao(tarefa.id);
        });

    item.querySelector(".menu-tarefa-semana")
        .addEventListener("click", function () {
            abrirModalEditar(tarefa);
        });

    return item;
}


function criarVazioSemana(data, ehHoje) {

    const area = document.createElement("div");

    area.className = "vazio-semana";

    const diaDaSemana = data.getDay();

    if (diaDaSemana === 6) {

        area.innerHTML = `
            <svg class="ic"><use href="#i-cal"/></svg>
            <span>Aproveite o dia!</span>
            <span class="emoji">☀️</span>
        `;

    } else if (diaDaSemana === 0) {

        area.innerHTML = `
            <svg class="ic"><use href="#i-cal"/></svg>
            <span>Descanse também é produtivo!</span>
            <span class="emoji rosa">♥</span>
        `;

    } else {

        area.innerHTML = `
            <svg class="ic"><use href="#i-cal"/></svg>
            <span>Que tal adicionar uma tarefa ${ehHoje ? "de hoje" : "para este dia"}?</span>
            <a href="agendatarefa.html">+ Nova tarefa</a>
        `;
    }

    return area;
}


function mostrarSemana() {

    if (!calendarioSemana) {
        return;
    }

    calendarioSemana.innerHTML = "";

    const inicioSemana = obterInicioSemana();

    const fimSemana = new Date(
        inicioSemana.getFullYear(),
        inicioSemana.getMonth(),
        inicioSemana.getDate() + 6
    );

    const rotulo = formatarIntervaloSemana(inicioSemana, fimSemana);

    document.querySelectorAll(".rotulo-semana").forEach(function (elemento) {
        elemento.textContent = rotulo;
    });

    const hojeFormatado = formatarData(new Date());

    const nomesDias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

    const nomesCompletos = [
        "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
        "Quinta-feira", "Sexta-feira", "Sábado"
    ];

    const tarefasDaSemana = [];

    let maisProdutiva = { total: 0, dia: null };

    for (let i = 0; i < 7; i++) {

        const data = new Date(
            inicioSemana.getFullYear(),
            inicioSemana.getMonth(),
            inicioSemana.getDate() + i
        );

        const dataFormatada = formatarData(data);
        const ehHoje = dataFormatada === hojeFormatado;

        const tarefasDoDia = tarefas
            .filter(function (tarefa) {
                return tarefa.data === dataFormatada;
            })
            .sort(ordenarPorHorario);

        tarefasDaSemana.push(...tarefasDoDia);

        if (tarefasDoDia.length > maisProdutiva.total) {
            maisProdutiva = { total: tarefasDoDia.length, dia: data };
        }

        const total = tarefasDoDia.length;

        // Dia sem tarefas: não mostra contagem (a mensagem já aparece no quadro)
        const resumo = total === 0
            ? ""
            : `${total} ${total === 1 ? "tarefa" : "tarefas"}`;

        const coluna = document.createElement("div");

        coluna.className = "dia-semana";

        if (ehHoje) {
            coluna.classList.add("dia-atual");
        }

        coluna.innerHTML = `
            <div class="cabecalho-dia-semana">
                <span>${nomesDias[i]}</span>
                <strong>${data.getDate()}</strong>
                <small>${resumo}</small>
            </div>

            <div class="tarefas-dia"></div>
        `;

        const areaTarefas = coluna.querySelector(".tarefas-dia");

        if (total === 0) {

            areaTarefas.appendChild(criarVazioSemana(data, ehHoje));

        } else {

            tarefasDoDia.forEach(function (tarefa) {
                areaTarefas.appendChild(criarTarefaSemana(tarefa));
            });
        }

        calendarioSemana.appendChild(coluna);
    }

    // Prioridades da semana exibida
    const contagem = contarPrioridades(tarefasDaSemana);

    atualizarElemento(quantidadeUrgente, contagem.urgente, "tarefa", "tarefas");
    atualizarElemento(quantidadeImportante, contagem.importante, "tarefa", "tarefas");
    atualizarElemento(quantidadeNormal, contagem.normal, "tarefa", "tarefas");

    // Destaque: dia mais produtivo
    const destaque = document.getElementById("destaque-produtiva");

    if (destaque) {

        destaque.textContent = maisProdutiva.dia
            ? `${nomesCompletos[maisProdutiva.dia.getDay()]} • ` +
              `${maisProdutiva.total} ${maisProdutiva.total === 1 ? "tarefa" : "tarefas"}`
            : "Sem tarefas na semana";
    }
}


/* MÊS */

function criarDiaForaDoMes(numero) {

    // Dia do mês anterior/seguinte: aparece cinza, sem tarefas e sem clique
    const elemento = document.createElement("div");
    const numeroDia = document.createElement("span");

    elemento.className = "vazio";

    numeroDia.className = "numero-dia";
    numeroDia.textContent = numero;

    elemento.appendChild(numeroDia);

    return elemento;
}

function mostrarMes() {

    if (!diasCalendario || !mesAtualElemento) {
        return;
    }

    const ano = dataMesAtual.getFullYear();
    const mes = dataMesAtual.getMonth();

    const nomesMeses = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro"
    ];

    mesAtualElemento.textContent =
        `${nomesMeses[mes]} ${ano}`;

    diasCalendario.innerHTML = "";

    const primeiroDia =
        new Date(ano, mes, 1).getDay();

    const quantidadeDias =
        new Date(ano, mes + 1, 0).getDate();

    const diasMesAnterior =
        new Date(ano, mes, 0).getDate();

    // Completa a última semana com dias do mês seguinte
    const totalCelulas =
        Math.ceil((primeiroDia + quantidadeDias) / 7) * 7;

    const diasRestantes =
        totalCelulas - primeiroDia - quantidadeDias;

    // Dias do mês anterior (ex.: 30, 31)
    for (let i = 0; i < primeiroDia; i++) {

        diasCalendario.appendChild(
            criarDiaForaDoMes(
                diasMesAnterior - primeiroDia + 1 + i
            )
        );
    }

    for (let dia = 1; dia <= quantidadeDias; dia++) {

        const data =
            new Date(ano, mes, dia);

        const dataFormatada =
            formatarData(data);

        const elemento =
            document.createElement("div");

        const numeroDia =
            document.createElement("span");

        numeroDia.className = "numero-dia";
        numeroDia.textContent = dia;

        elemento.appendChild(numeroDia);

        if (
            dataFormatada ===
            formatarData(new Date())
        ) {

            elemento.classList.add("hoje");
        }

        const tarefasDoDia =
            tarefas
                .filter(function (tarefa) {
                    return tarefa.data === dataFormatada;
                })
                .sort(ordenarPorHorario);

        if (tarefasDoDia.length > 0) {

            const listaMini =
                document.createElement("div");

            listaMini.className = "lista-mini-tarefas";

            const MAXIMO_VISIVEL = 2;

            tarefasDoDia.slice(0, MAXIMO_VISIVEL).forEach(function (tarefa) {

                const prioridade =
                    (tarefa.prioridade || "normal").toLowerCase();

                const item =
                    document.createElement("div");

                item.className = `mini-tarefa ${prioridade}`;

                // Mostra o título completo ao passar o mouse
                item.title = tarefa.titulo || "";

                // Título + horário embaixo (igual ao layout)
                item.innerHTML = `
                    <i></i>
                    <div class="mini-texto">
                        <span>${escaparHTML(tarefa.titulo)}</span>
                        ${
                            tarefa.horario
                                ? `<small>${escaparHTML(tarefa.horario)}</small>`
                                : ""
                        }
                    </div>
                `;

                listaMini.appendChild(item);
            });

            if (tarefasDoDia.length > MAXIMO_VISIVEL) {

                const maisTexto =
                    document.createElement("span");

                maisTexto.className = "mini-tarefas-extra";

                maisTexto.textContent =
                    `+${tarefasDoDia.length - MAXIMO_VISIVEL} mais`;

                listaMini.appendChild(maisTexto);
            }

            elemento.appendChild(listaMini);

            elemento.classList.add("com-tarefas");

            elemento.addEventListener("click", function () {
                abrirModalDia(dataFormatada);
            });
        }

        diasCalendario.appendChild(elemento);
    }

    // Dias do mês seguinte (ex.: 1, 2, 3)
    for (let dia = 1; dia <= diasRestantes; dia++) {

        diasCalendario.appendChild(
            criarDiaForaDoMes(dia)
        );
    }

    atualizarPrioridadesMes();
}


/* BOTÕES DO MÊS */

function configurarBotoesMes() {

    const anterior =
        document.getElementById("mes-anterior");

    const proximo =
        document.getElementById("mes-proximo");

    if (anterior) {

        anterior.addEventListener("click", function () {

            dataMesAtual = new Date(
                dataMesAtual.getFullYear(),
                dataMesAtual.getMonth() - 1,
                1
            );

            mostrarMes();
        });
    }

    if (proximo) {

        proximo.addEventListener("click", function () {

            dataMesAtual = new Date(
                dataMesAtual.getFullYear(),
                dataMesAtual.getMonth() + 1,
                1
            );

            mostrarMes();
        });
    }
}


/* PRIORIDADES */

function atualizarPrioridades() {

    // A contagem da semana é feita em mostrarSemana()
    atualizarPrioridadesMes();
}


function atualizarPrioridadesMes() {

    const ano =
        dataMesAtual.getFullYear();

    const mes =
        dataMesAtual.getMonth();

    const tarefasMes =
        tarefas.filter(function (tarefa) {

            if (!tarefa.data) {
                return false;
            }

            const partes =
                tarefa.data.split("-");

            const anoTarefa =
                Number(partes[0]);

            const mesTarefa =
                Number(partes[1]) - 1;

            return (
                anoTarefa === ano &&
                mesTarefa === mes
            );
        });

    const contagem =
        contarPrioridades(tarefasMes);

    atualizarElemento(
        mesQuantidadeUrgente,
        contagem.urgente,
        "tarefa",
        "tarefas"
    );

    atualizarElemento(
        mesQuantidadeImportante,
        contagem.importante,
        "tarefa",
        "tarefas"
    );

    atualizarElemento(
        mesQuantidadeNormal,
        contagem.normal,
        "item",
        "itens"
    );
}


function contarPrioridades(lista) {

    return lista.reduce(
        function (resultado, tarefa) {

            const prioridade =
                (
                    tarefa.prioridade ||
                    "normal"
                ).toLowerCase();

            if (prioridade === "urgente") {
                resultado.urgente++;
            } else if (prioridade === "importante") {
                resultado.importante++;
            } else {
                resultado.normal++;
            }

            return resultado;

        },
        {
            urgente: 0,
            importante: 0,
            normal: 0
        }
    );
}


function atualizarElemento(
    elemento,
    quantidade,
    singular,
    plural
) {

    if (!elemento) {
        return;
    }

    elemento.textContent =
        `${quantidade} ${
            quantidade === 1
                ? singular
                : plural
        }`;
}


/* LINKS */

function configurarLinks() {

    document.querySelectorAll(
        ".link-configuracoes, .cartao-financeiro a, .link-agenda"
    ).forEach(function (link) {

        link.addEventListener(
            "click",
            function (evento) {

                if (
                    link.getAttribute("href") === "#"
                ) {
                    evento.preventDefault();
                }
            }
        );
    });
}


/* AUXILIARES */

function ordenarPorHorario(a, b) {

    return (
        a.horario || "23:59"
    ).localeCompare(
        b.horario || "23:59"
    );
}


function formatarData(data) {

    const ano =
        data.getFullYear();

    const mes =
        String(data.getMonth() + 1)
            .padStart(2, "0");

    const dia =
        String(data.getDate())
            .padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}


function formatarCategoria(categoria) {

    const categorias = {
        estudos: "Estudos",
        saude: "Saúde",
        pessoal: "Pessoal",
        trabalho: "Trabalho",
        outros: "Outros"
    };

    return categorias[categoria] || "Outros";
}


function formatarPrioridade(prioridade) {

    const prioridades = {
        urgente: "Urgente",
        importante: "Importante",
        normal: "Normal"
    };

    return prioridades[prioridade] || "Normal";
}


function escaparHTML(texto) {

    const div =
        document.createElement("div");

    div.textContent = texto || "";

    return div.innerHTML;
}


/* =====================================================
   MODAIS (TAREFAS DO DIA + EDITAR TAREFA)
===================================================== */

let dataModalAtual = null;

function criarModais() {

    const modais = document.createElement("div");

    modais.innerHTML = `
        <div class="fundo-modal" id="modal-dia-tarefas">
            <div class="caixa-modal">
                <div class="cabecalho-modal">
                    <strong id="titulo-modal-dia">Tarefas do dia</strong>
                    <button type="button" class="fechar-modal" id="fechar-modal-dia">×</button>
                </div>
                <div class="corpo-modal" id="lista-modal-dia"></div>
            </div>
        </div>

        <div class="fundo-modal" id="modal-editar-tarefa">
            <div class="caixa-modal">
                <div class="cabecalho-modal">
                    <strong>Editar tarefa</strong>
                    <button type="button" class="fechar-modal" id="fechar-modal-editar">×</button>
                </div>

                <form class="formulario-modal" id="formulario-editar-tarefa">

                    <input type="hidden" id="editar-id">

                    <div class="grupo-modal">
                        <label for="editar-titulo">Nome da tarefa</label>
                        <input type="text" id="editar-titulo" required>
                    </div>

                    <div class="grupo-modal">
                        <label for="editar-descricao">Descrição</label>
                        <textarea id="editar-descricao"></textarea>
                    </div>

                    <div class="linha-modal">
                        <div class="grupo-modal">
                            <label for="editar-data">Data</label>
                            <input type="date" id="editar-data" required>
                        </div>

                        <div class="grupo-modal">
                            <label for="editar-horario">Horário</label>
                            <input type="time" id="editar-horario">
                        </div>
                    </div>

                    <div class="linha-modal">
                        <div class="grupo-modal">
                            <label for="editar-categoria">Categoria</label>
                            <select id="editar-categoria">
                                <option value="estudos">Estudos</option>
                                <option value="pessoal">Pessoal</option>
                                <option value="trabalho">Trabalho</option>
                                <option value="outros">Outros</option>
                            </select>
                        </div>

                        <div class="grupo-modal">
                            <label for="editar-prioridade">Prioridade</label>
                            <select id="editar-prioridade">
                                <option value="normal">Normal</option>
                                <option value="importante">Importante</option>
                                <option value="urgente">Urgente</option>
                            </select>
                        </div>
                    </div>

                    <div class="botoes-modal">
                        <button type="button" class="botao-cancelar-modal" id="cancelar-edicao">Cancelar</button>
                        <button type="submit" class="botao-salvar-modal">Salvar alterações</button>
                    </div>

                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modais);

    // Fechar clicando no X ou fora da caixa
    document.getElementById("fechar-modal-dia")
        .addEventListener("click", fecharModalDia);

    document.getElementById("modal-dia-tarefas")
        .addEventListener("click", function (evento) {
            if (evento.target.id === "modal-dia-tarefas") {
                fecharModalDia();
            }
        });

    document.getElementById("fechar-modal-editar")
        .addEventListener("click", fecharModalEditar);

    document.getElementById("cancelar-edicao")
        .addEventListener("click", fecharModalEditar);

    document.getElementById("modal-editar-tarefa")
        .addEventListener("click", function (evento) {
            if (evento.target.id === "modal-editar-tarefa") {
                fecharModalEditar();
            }
        });

    document.getElementById("formulario-editar-tarefa")
        .addEventListener("submit", salvarEdicaoTarefa);
}


/* ABRIR/FECHAR MODAL DO DIA */

function abrirModalDia(dataFormatada) {

    dataModalAtual = dataFormatada;

    renderizarListaModalDia();

    document.getElementById("modal-dia-tarefas").classList.add("aberto");
}

function fecharModalDia() {

    document.getElementById("modal-dia-tarefas").classList.remove("aberto");
}

function renderizarListaModalDia() {

    const titulo = document.getElementById("titulo-modal-dia");
    const lista = document.getElementById("lista-modal-dia");

    const [ano, mes, dia] = dataModalAtual.split("-");

    titulo.textContent = `Tarefas de ${dia}/${mes}/${ano}`;

    const tarefasDoDia = tarefas
        .filter(function (tarefa) {
            return tarefa.data === dataModalAtual;
        })
        .sort(ordenarPorHorario);

    lista.innerHTML = "";

    if (tarefasDoDia.length === 0) {

        lista.innerHTML = `
            <p class="sem-tarefas">Nenhuma tarefa neste dia.</p>
        `;

        fecharModalDia();

        return;
    }

    tarefasDoDia.forEach(function (tarefa) {

        const item = document.createElement("div");

        item.className = "item-modal-tarefa";

        const horario = tarefa.horario || "Sem horário";
        const categoria = formatarCategoria(tarefa.categoria);
        const prioridade = (tarefa.prioridade || "normal").toLowerCase();

        item.innerHTML = `
            <div class="info-item-modal">
                <strong>${escaparHTML(tarefa.titulo)}</strong>
                <span>${horario} · ${categoria}</span>
                <span class="prioridade ${prioridade}">${formatarPrioridade(prioridade)}</span>
            </div>

            <div class="acoes-item-modal">
                <button type="button" class="botao-editar-modal" title="Editar">✎</button>
                <button type="button" class="botao-excluir-modal" title="Excluir">🗑</button>
            </div>
        `;

        item.querySelector(".botao-editar-modal")
            .addEventListener("click", function () {
                abrirModalEditar(tarefa);
            });

        item.querySelector(".botao-excluir-modal")
            .addEventListener("click", function () {
                excluirTarefaModal(tarefa.id);
            });

        lista.appendChild(item);
    });
}


/* EXCLUIR TAREFA (a partir do modal) */

async function excluirTarefaModal(id) {

    const confirmar = mostrarAviso("Deseja excluir esta tarefa?");

    if (!confirmar) {
        return;
    }

    try {

        const resposta = await fetch(`/api/tarefas/${id}`, {
            method: "DELETE"
        });

        if (!resposta.ok) {
            throw new Error("Não foi possível excluir a tarefa.");
        }

        await carregarTarefas();

        renderizarListaModalDia();

    } catch (erro) {

        console.error(erro);
        alert("Não foi possível excluir a tarefa.");
    }
}


/* ABRIR/FECHAR MODAL DE EDITAR */

function abrirModalEditar(tarefa) {

    document.getElementById("editar-id").value = tarefa.id;
    document.getElementById("editar-titulo").value = tarefa.titulo;
    document.getElementById("editar-descricao").value = tarefa.descricao || "";
    document.getElementById("editar-data").value = tarefa.data;
    document.getElementById("editar-horario").value = tarefa.horario || "";
    document.getElementById("editar-categoria").value = tarefa.categoria || "outros";
    document.getElementById("editar-prioridade").value = tarefa.prioridade || "normal";

    document.getElementById("modal-editar-tarefa").classList.add("aberto");
}

function fecharModalEditar() {

    document.getElementById("modal-editar-tarefa").classList.remove("aberto");
}


/* SALVAR EDIÇÃO */

async function salvarEdicaoTarefa(evento) {

    evento.preventDefault();

    const id = document.getElementById("editar-id").value;

    const titulo = document.getElementById("editar-titulo").value.trim();
    const descricao = document.getElementById("editar-descricao").value.trim();
    const data = document.getElementById("editar-data").value;
    const horario = document.getElementById("editar-horario").value;
    const categoria = document.getElementById("editar-categoria").value;
    const prioridade = document.getElementById("editar-prioridade").value;

    if (!titulo || titulo.length < 3) {
        mostrarAviso("Digite um nome com pelo menos 3 caracteres.");
        return;
    }

    if (!data) {
        mostrarAviso("Escolha uma data para a tarefa.");
        return;
    }

    const botaoSalvar = document.querySelector("#formulario-editar-tarefa .botao-salvar-modal");
    botaoSalvar.disabled = true;

    try {

        const resposta = await fetch(`/api/tarefas/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                titulo,
                descricao,
                data,
                horario,
                categoria,
                prioridade
            })
        });

        const dados = await resposta.json();

        if (!dados.sucesso) {
            mostrarAviso(dados.mensagem || "Não foi possível salvar as alterações.");
            return;
        }

        fecharModalEditar();

        await carregarTarefas();

        // Se o dia mudou, o dado exibido no modal do dia precisa refletir isso
        if (document.getElementById("modal-dia-tarefas").classList.contains("aberto")) {
            dataModalAtual = data;
            renderizarListaModalDia();
        }

    } catch (erro) {

        console.error(erro);
        mostrarAviso("Não foi possível conectar ao servidor. Verifique se o Node.js está funcionando.");

    } finally {

        botaoSalvar.disabled = false;
    }
}

