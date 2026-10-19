let tarefas = [];
let dataMesAtual = new Date();

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
    configurarLinks();
    criarModais();
    carregarTarefas();
    carregarResumoFinanceiro();
    carregarResumoMetas();

});


/* USUÁRIO (mostrarUsuario e sair vêm de usuario.js, carregado antes deste arquivo) */


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

        secoes.forEach(function (secao) {
            secao.classList.remove("ativa");
        });

        botoes.forEach(function (botao) {
            botao.classList.remove("ativo");
        });

        const secao = document.getElementById(id);
        const botao = document.querySelector(`[href="#${id}"]`);

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

function mostrarDia() {

    if (!tarefasHoje) {
        return;
    }

    tarefasHoje.innerHTML = "";

    const hoje = formatarData(new Date());

    const tarefasDoDia = tarefas
        .filter(function (tarefa) {
            return tarefa.data === hoje;
        })
        .sort(ordenarPorHorario);

    if (tarefasDoDia.length === 0) {

        tarefasHoje.innerHTML = `
            <p class="sem-tarefas">
                Nenhuma tarefa para hoje.
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

    const horario = tarefa.horario || "Sem horário";
    const categoria = formatarCategoria(tarefa.categoria);
    const prioridade = (
        tarefa.prioridade || "normal"
    ).toLowerCase();

    elemento.innerHTML = `
        <button
            type="button"
            class="marcador"
            title="${tarefa.concluida
                ? "Desmarcar tarefa"
                : "Concluir tarefa"}">
        </button>

        <div class="informacoes-tarefa">
            <strong>
                ${escaparHTML(tarefa.titulo)}
            </strong>

            <span>
                ${horario} · ${categoria}
            </span>
        </div>

        <span class="prioridade ${prioridade}">
            ${formatarPrioridade(prioridade)}
        </span>
    `;

    const marcador = elemento.querySelector(".marcador");

    marcador.addEventListener("click", function () {
        alternarConclusao(tarefa.id);
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

function mostrarSemana() {

    if (!calendarioSemana) {
        return;
    }

    calendarioSemana.innerHTML = "";

    const hoje = new Date();
    const inicioSemana = new Date(hoje);

    inicioSemana.setDate(
        hoje.getDate() - hoje.getDay()
    );

    const nomesDias = [
        "DOM",
        "SEG",
        "TER",
        "QUA",
        "QUI",
        "SEX",
        "SÁB"
    ];

    for (let i = 0; i < 7; i++) {

        const data = new Date(inicioSemana);

        data.setDate(
            inicioSemana.getDate() + i
        );

        const dataFormatada = formatarData(data);

        const coluna = document.createElement("div");

        coluna.className = "dia-semana";

        if (
            dataFormatada ===
            formatarData(hoje)
        ) {
            coluna.classList.add("dia-atual");
        }

        coluna.innerHTML = `
            <div class="cabecalho-dia-semana">
                <span>${nomesDias[i]}</span>
                <strong>${data.getDate()}</strong>
            </div>

            <div class="tarefas-dia"></div>
        `;

        const areaTarefas =
            coluna.querySelector(".tarefas-dia");

        const tarefasDoDia = tarefas
            .filter(function (tarefa) {
                return tarefa.data === dataFormatada;
            })
            .sort(ordenarPorHorario);

        if (tarefasDoDia.length === 0) {

            areaTarefas.innerHTML = `
                <span style="color:#52647c;font-size:8px;">
                    Nenhuma tarefa
                </span>
            `;

        } else {

            tarefasDoDia.forEach(function (tarefa) {

                const item =
                    document.createElement("div");

                item.className = "tarefa-semana";

                item.innerHTML = `
                    <strong>
                        ${escaparHTML(tarefa.titulo)}
                    </strong>

                    ${
                        tarefa.horario
                            ? `<br><small>${tarefa.horario}</small>`
                            : ""
                    }
                `;

                areaTarefas.appendChild(item);
            });
        }

        calendarioSemana.appendChild(coluna);
    }
}


/* MÊS */

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

    for (let i = 0; i < primeiroDia; i++) {

        const vazio =
            document.createElement("div");

        vazio.className = "vazio";

        diasCalendario.appendChild(vazio);
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

                item.innerHTML = `
                    <i></i>
                    <span>${escaparHTML(tarefa.titulo)}</span>
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

            dataMesAtual.setMonth(
                dataMesAtual.getMonth() - 1
            );

            mostrarMes();
        });
    }

    if (proximo) {

        proximo.addEventListener("click", function () {

            dataMesAtual.setMonth(
                dataMesAtual.getMonth() + 1
            );

            mostrarMes();
        });
    }
}


/* PRIORIDADES */

function atualizarPrioridades() {

    const contagem =
        contarPrioridades(tarefas);

    atualizarElemento(
        quantidadeUrgente,
        contagem.urgente,
        "tarefa",
        "tarefas"
    );

    atualizarElemento(
        quantidadeImportante,
        contagem.importante,
        "tarefa",
        "tarefas"
    );

    atualizarElemento(
        quantidadeNormal,
        contagem.normal,
        "item",
        "itens"
    );

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


/* PANORAMA FINANCEIRO (DADOS REAIS) */

function formatarMoeda(valor) {

    return (valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

async function carregarResumoFinanceiro() {

    const elementoStatus = document.querySelector(".status-financeiro");
    const elementoPorcentagem = document.querySelector(".cartao-financeiro .porcentagem strong");
    const elementoBarra = document.querySelector(".cartao-financeiro .progresso > div");
    const elementoMensagem = document.querySelector(".mensagem-financeira");

    try {

        const resposta = await fetch("/api/lancamentos");

        if (!resposta.ok) {
            throw new Error("Erro ao carregar lançamentos.");
        }

        const dados = await resposta.json();

        const lancamentos = Array.isArray(dados)
            ? dados
            : dados.lancamentos || [];

        const hoje = new Date();
        const anoMesAtual = hoje.getFullYear() + "-" + String(hoje.getMonth() + 1).padStart(2, "0");

        let entradasMes = 0;
        let saidasMes = 0;

        lancamentos.forEach(function (lancamento) {

            if (!lancamento.data || !lancamento.data.startsWith(anoMesAtual)) {
                return;
            }

            const valor = Number(lancamento.valor) || 0;

            if (lancamento.tipo === "entrada") {
                entradasMes += valor;
            } else {
                saidasMes += valor;
            }
        });

        if (entradasMes === 0 && saidasMes === 0) {

            if (elementoStatus) {
                elementoStatus.textContent = "— nenhum lançamento este mês";
                elementoStatus.style.color = "var(--cor-suave)";
            }

            if (elementoPorcentagem) elementoPorcentagem.textContent = "0%";
            if (elementoBarra) elementoBarra.style.width = "0%";

            if (elementoMensagem) {
                elementoMensagem.textContent = "Registre seus lançamentos em Meu Dinheiro pra ver seu panorama aqui.";
            }

            return;
        }

        let percentual;

        if (entradasMes > 0) {
            percentual = Math.round((saidasMes / entradasMes) * 100);
        } else {
            percentual = 100;
        }

        const percentualExibido = Math.min(percentual, 100);

        if (elementoPorcentagem) {
            elementoPorcentagem.textContent = percentual + "%";
        }

        if (elementoBarra) {
            elementoBarra.style.width = percentualExibido + "%";
        }

        if (elementoStatus) {

            if (percentual <= 50) {
                elementoStatus.textContent = "↘ gastos sob controle";
                elementoStatus.style.color = "var(--cor-verde)";
            } else if (percentual <= 85) {
                elementoStatus.textContent = "→ atenção aos gastos";
                elementoStatus.style.color = "var(--cor-laranja)";
            } else {
                elementoStatus.textContent = "↗ gastos acima do recebido";
                elementoStatus.style.color = "var(--cor-vermelho)";
            }
        }

        if (elementoMensagem) {

            elementoMensagem.textContent =
                `Este mês: ${formatarMoeda(entradasMes)} de entradas e ${formatarMoeda(saidasMes)} de saídas.`;
        }

    } catch (erro) {

        console.error("Erro ao carregar resumo financeiro:", erro);

        if (elementoStatus) {
            elementoStatus.textContent = "Não foi possível carregar.";
            elementoStatus.style.color = "var(--cor-vermelho)";
        }

        if (elementoMensagem) {
            elementoMensagem.textContent = "Não foi possível carregar seus lançamentos agora.";
        }
    }
}


/* METAS EM MOVIMENTO (DADOS REAIS) */

function obterVisualMeta(categoria) {

    const chave = (categoria || "").toLowerCase();

    if (chave === "saude") {
        return { icone: "i-heart", classeIcone: "rosa", classeBarra: "verde" };
    }

    if (chave === "financeiro" || chave === "dinheiro") {
        return { icone: "i-money", classeIcone: "", classeBarra: "verde" };
    }

    if (chave === "estudos" || chave === "enem") {
        return { icone: "i-enem", classeIcone: "", classeBarra: "azul" };
    }

    return { icone: "i-target", classeIcone: "", classeBarra: "azul" };
}

function criarLinhaMeta(meta) {

    const percentual = meta.valorMeta > 0
        ? Math.min(100, Math.round((meta.valorAtual / meta.valorMeta) * 100))
        : 0;

    const visual = obterVisualMeta(meta.categoria);

    const elemento = document.createElement("div");
    elemento.className = "meta";

    elemento.innerHTML = `
        <div class="icone-meta ${visual.classeIcone}">
            <svg class="ic"><use href="#${visual.icone}"/></svg>
        </div>
        <div class="corpo-meta">
            <div class="cabecalho-meta">
                <span>${escaparHTML(meta.nome)}</span>
                <strong>${percentual}%</strong>
            </div>
            <div class="progresso-meta"><div class="${visual.classeBarra}" style="width:${percentual}%"></div></div>
        </div>
    `;

    return elemento;
}

async function carregarResumoMetas() {

    const container = document.getElementById("lista-metas-painel");

    if (!container) return;

    try {

        const resposta = await fetch("/api/metas");

        if (!resposta.ok) {
            throw new Error("Erro ao carregar metas.");
        }

        const dados = await resposta.json();

        const metas = Array.isArray(dados)
            ? dados
            : dados.metas || [];

        if (metas.length === 0) {

            container.innerHTML = `<p class="sem-tarefas">Você ainda não criou nenhuma meta.</p>`;
            return;
        }

        // Prioriza as metas ainda não concluídas, da mais avançada pra menos avançada
        const emAndamento = metas
            .filter(function (meta) {
                return !meta.concluida;
            })
            .sort(function (a, b) {

                const percentualA = a.valorMeta > 0 ? a.valorAtual / a.valorMeta : 0;
                const percentualB = b.valorMeta > 0 ? b.valorAtual / b.valorMeta : 0;

                return percentualB - percentualA;
            });

        const destaque = (emAndamento.length > 0 ? emAndamento : metas).slice(0, 2);

        container.innerHTML = "";

        destaque.forEach(function (meta) {
            container.appendChild(criarLinhaMeta(meta));
        });

    } catch (erro) {

        console.error("Erro ao carregar metas:", erro);

        container.innerHTML = `<p class="sem-tarefas">Não foi possível carregar suas metas.</p>`;
    }
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

    const confirmar = confirm("Deseja excluir esta tarefa?");

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
        alert("Digite um nome com pelo menos 3 caracteres.");
        return;
    }

    if (!data) {
        alert("Escolha uma data para a tarefa.");
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
            alert(dados.mensagem || "Não foi possível salvar as alterações.");
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
        alert("Não foi possível conectar ao servidor. Verifique se o Node.js está funcionando.");

    } finally {

        botaoSalvar.disabled = false;
    }
}