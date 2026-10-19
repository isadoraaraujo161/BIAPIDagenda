

// =====================================================
// MINHA SEMANA - BIPAID
// =====================================================

let tarefas = [];
let metas = [];
let lancamentos = [];

// 0 = semana atual, -1 = anterior, 1 = próxima...
let deslocamentoSemana = 0;

// Meta de gasto semanal (aparece no card "Gastos da semana")
const META_GASTO_SEMANAL = 50;

// Quantas tarefas aparecem em cada lista
const LIMITE_LISTA = 8;

const DIAS_ABREVIADOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const CATEGORIAS = {
    estudos:  "Estudo",
    estudo:   "Estudo",
    academica: "Estudo",
    pessoal:  "Pessoal",
    trabalho: "Trabalho",
    profissional: "Trabalho",
    saude:    "Saúde",
    eventos:  "Evento",
    outros:   "Outros"
};


// =====================================================
// CARREGAR DADOS
// =====================================================

async function buscar(url, chave) {

    try {

        const resposta = await fetch(url);

        if (!resposta.ok) {
            throw new Error(`Erro ${resposta.status}`);
        }

        const dados = await resposta.json();

        return Array.isArray(dados) ? dados : dados[chave] || [];

    } catch (erro) {

        console.error(`Erro ao carregar ${url}:`, erro);

        return [];
    }
}

async function carregarDados() {

    const resultados = await Promise.all([
        buscar("/api/tarefas", "tarefas"),
        buscar("/api/metas", "metas"),
        buscar("/api/lancamentos", "lancamentos")
    ]);

    tarefas = resultados[0];
    metas = resultados[1];
    lancamentos = resultados[2];

    mostrarTudo();
}

function mostrarTudo() {

    mostrarSemana();
    mostrarMetas();
    mostrarFinanceiro();
}


// =====================================================
// DATAS
// =====================================================

function formatarDataISO(data) {

    return data.getFullYear() +
        "-" +
        String(data.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(data.getDate()).padStart(2, "0");
}

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

function obterFimSemana(inicio) {

    return new Date(
        inicio.getFullYear(),
        inicio.getMonth(),
        inicio.getDate() + 6
    );
}

function formatarIntervaloSemana(inicio, fim) {

    const mesInicio = inicio.toLocaleDateString("pt-BR", { month: "long" });
    const mesFim = fim.toLocaleDateString("pt-BR", { month: "long" });

    if (inicio.getFullYear() !== fim.getFullYear()) {
        return `${inicio.getDate()} de ${mesInicio} de ${inicio.getFullYear()} – ` +
               `${fim.getDate()} de ${mesFim} de ${fim.getFullYear()}`;
    }

    if (inicio.getMonth() !== fim.getMonth()) {
        return `${inicio.getDate()} de ${mesInicio} – ${fim.getDate()} de ${mesFim} de ${fim.getFullYear()}`;
    }

    return `${inicio.getDate()} – ${fim.getDate()} de ${mesFim} de ${fim.getFullYear()}`;
}

// "15/09 - Seg"
function formatarDataTarefa(texto) {

    const partes = String(texto || "").split("-");

    if (partes.length !== 3) {
        return "";
    }

    const data = new Date(
        Number(partes[0]),
        Number(partes[1]) - 1,
        Number(partes[2])
    );

    return `${partes[2]}/${partes[1]} - ${DIAS_ABREVIADOS[data.getDay()]}`;
}

function criarData(texto) {

    const partes = String(texto || "").split("-");

    if (partes.length !== 3) {
        return null;
    }

    return new Date(
        Number(partes[0]),
        Number(partes[1]) - 1,
        Number(partes[2])
    );
}


// =====================================================
// AUXILIARES
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

function escaparHTML(texto) {

    const div = document.createElement("div");

    div.textContent = texto || "";

    return div.innerHTML;
}

function definirTexto(id, texto) {

    const elemento = document.getElementById(id);

    if (elemento) {
        elemento.textContent = texto;
    }
}

function definirBarra(id, porcentagem) {

    const barra = document.getElementById(id);

    if (barra) {

        const valor = Math.min(Math.max(porcentagem, 0), 100);

        barra.style.width = valor > 0
            ? `${Math.max(valor, 2)}%`
            : "0%";
    }
}

function porcentagemTexto(valor, total) {

    return total > 0
        ? Math.round((valor / total) * 100)
        : 0;
}

function ehEntrada(tipo) {
    return tipo === "entrada" || tipo === "receita";
}

function ehDespesa(tipo) {
    return tipo === "saida" || tipo === "despesa";
}

function mostrarAviso(mensagem, erro) {

    const aviso = document.createElement("div");

    aviso.className = "aviso-semana" + (erro ? " aviso-erro" : "");
    aviso.textContent = mensagem;

    document.body.appendChild(aviso);

    setTimeout(function () {
        aviso.remove();
    }, 3000);
}


// =====================================================
// SEMANA: CARDS, LISTAS E ATIVIDADES
// =====================================================

function mostrarSemana() {

    const inicio = obterInicioSemana();
    const fim = obterFimSemana(inicio);

    const primeiroDia = formatarDataISO(inicio);
    const ultimoDia = formatarDataISO(fim);

    definirTexto("rotulo-semana", formatarIntervaloSemana(inicio, fim));

    const tarefasSemana = tarefas
        .filter(function (tarefa) {
            return tarefa.data >= primeiroDia && tarefa.data <= ultimoDia;
        })
        .sort(function (a, b) {

            if (a.data !== b.data) {
                return a.data.localeCompare(b.data);
            }

            return (a.horario || "23:59").localeCompare(b.horario || "23:59");
        });

    const concluidas = tarefasSemana.filter(function (tarefa) {
        return tarefa.concluida === true;
    });

    const pendentes = tarefasSemana.filter(function (tarefa) {
        return tarefa.concluida !== true;
    });

    const total = tarefasSemana.length;

    // ---------- Card 1: tarefas concluídas ----------
    definirTexto("c1-valor", concluidas.length);
    definirTexto("c1-total", total);
    definirTexto("c1-pct", porcentagemTexto(concluidas.length, total) + "%");
    definirBarra("c1-barra", porcentagemTexto(concluidas.length, total));

    // ---------- Card 2: tarefas pendentes ----------
    definirTexto("c2-valor", pendentes.length);
    definirTexto("c2-total", total);
    definirTexto("c2-pct", porcentagemTexto(pendentes.length, total) + "%");
    definirBarra("c2-barra", porcentagemTexto(pendentes.length, total));

    // ---------- Card 3: metas concluídas ----------
    const metasConcluidas = metas.filter(function (meta) {
        return obterStatusMeta(meta) === "concluida";
    }).length;

    definirTexto("c3-valor", metasConcluidas);
    definirTexto("c3-total", metas.length);
    definirTexto("c3-pct", porcentagemTexto(metasConcluidas, metas.length) + "%");
    definirBarra("c3-barra", porcentagemTexto(metasConcluidas, metas.length));

    // ---------- Card 4: gastos da semana ----------
    const gastoSemana = lancamentos
        .filter(function (lancamento) {
            return (
                ehDespesa(lancamento.tipo) &&
                lancamento.data >= primeiroDia &&
                lancamento.data <= ultimoDia
            );
        })
        .reduce(function (soma, lancamento) {
            return soma + (Number(lancamento.valor) || 0);
        }, 0);

    const porcentagemGasto = Math.round((gastoSemana / META_GASTO_SEMANAL) * 100);

    definirTexto("c4-valor", formatarMoeda(gastoSemana));
    definirTexto("c4-meta", `de ${formatarMoeda(META_GASTO_SEMANAL)} (meta)`);
    definirTexto("c4-pct", porcentagemGasto + "%");
    definirBarra("c4-barra", porcentagemGasto);

    // ---------- Listas ----------
    definirTexto("aba-concluidas", `Concluídas (${concluidas.length})`);
    definirTexto("aba-pendentes", `Pendentes (${pendentes.length})`);
    definirTexto("titulo-pendentes", `Pendentes (${pendentes.length})`);

    preencherLista(
        "lista-concluidas",
        concluidas,
        "Nenhuma tarefa concluída nesta semana."
    );

    preencherLista(
        "lista-pendentes",
        pendentes,
        "Nenhuma tarefa pendente nesta semana."
    );

    // ---------- Resumo de atividades ----------
    const metasEmAndamento = metas.filter(function (meta) {
        return obterStatusMeta(meta) === "andamento";
    }).length;

    const eventos = tarefasSemana.filter(function (tarefa) {
        return String(tarefa.categoria || "").toLowerCase() === "eventos";
    }).length;

    definirTexto("at-concluidas", concluidas.length);
    definirTexto("at-pendentes", pendentes.length);
    definirTexto("at-metas", metasEmAndamento);
    definirTexto("at-eventos", eventos);
}


function preencherLista(id, lista, mensagemVazia) {

    const container = document.getElementById(id);

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (lista.length === 0) {

        container.innerHTML = `<p class="lista-vazia">${mensagemVazia}</p>`;

        return;
    }

    lista.slice(0, LIMITE_LISTA).forEach(function (tarefa) {
        container.appendChild(criarLinhaTarefa(tarefa));
    });

    if (lista.length > LIMITE_LISTA) {

        const mais = document.createElement("a");

        mais.href = "agenda.html#semana";
        mais.className = "ver-mais-tarefas";
        mais.textContent = `+ ${lista.length - LIMITE_LISTA} tarefas na agenda · Ver todas →`;

        container.appendChild(mais);
    }
}


function criarLinhaTarefa(tarefa) {

    const chave = String(tarefa.categoria || "outros")
        .toLowerCase()
        .replace(/[^a-z]/g, "");

    const rotulo = CATEGORIAS[chave] || "Outros";

    const classeCategoria = rotulo === "Estudo"
        ? "estudos"
        : rotulo === "Trabalho"
            ? "trabalho"
            : rotulo === "Pessoal"
                ? "pessoal"
                : rotulo === "Saúde"
                    ? "saude"
                    : "outros";

    const acao = tarefa.concluida
        ? "Desmarcar tarefa"
        : "Concluir tarefa";

    const linha = document.createElement("div");

    linha.className = "linha-tarefa" + (tarefa.concluida ? " concluida" : "");

    linha.innerHTML = `
        <button type="button" class="marca-tarefa" title="${acao}" aria-label="${acao}"></button>
        <span class="titulo-tarefa">${escaparHTML(tarefa.titulo)}</span>
        <span class="pilula-categoria cat-${classeCategoria}">${rotulo}</span>
        <span class="data-tarefa">${formatarDataTarefa(tarefa.data)}</span>
    `;

    linha
        .querySelector(".marca-tarefa")
        .addEventListener("click", function () {
            alternarConclusao(tarefa);
        });

    return linha;
}


async function alternarConclusao(tarefa) {

    const concluida = !tarefa.concluida;

    try {

        const resposta = await fetch(`/api/tarefas/${tarefa.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ concluida: concluida })
        });

        if (!resposta.ok) {
            throw new Error("Não foi possível atualizar a tarefa.");
        }

        tarefa.concluida = concluida;

        mostrarSemana();

    } catch (erro) {

        console.error(erro);

        mostrarAviso("Não foi possível atualizar a tarefa.", true);
    }
}


// =====================================================
// METAS
// =====================================================

function obterStatusMeta(meta) {

    const objetivo = Number(meta.valorMeta) || 0;
    const atual = Number(meta.valorAtual) || 0;

    if (objetivo > 0 && atual >= objetivo) {
        return "concluida";
    }

    return atual > 0 ? "andamento" : "nova";
}

function descreverPrazo(meta) {

    const data = criarData(meta.dataLimite);

    if (!data || isNaN(data)) {
        return "Sem prazo";
    }

    const hoje = new Date();

    const inicioHoje = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate()
    );

    const dias = Math.round((data - inicioHoje) / 86400000);

    if (dias < 0) {
        return "Prazo encerrado";
    }

    if (dias === 0) {
        return "Termina hoje";
    }

    return dias === 1 ? "Falta 1 dia" : `Faltam ${dias} dias`;
}

function criarAnel(porcentagem, cor) {

    const raio = 26;
    const circunferencia = 2 * Math.PI * raio;
    const preenchido = (Math.min(Math.max(porcentagem, 0), 100) / 100) * circunferencia;

    return `
        <div class="anel">
            <svg viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="32" r="${raio}" class="anel-fundo"/>
                <circle cx="32" cy="32" r="${raio}" class="anel-valor ${cor}"
                    stroke-dasharray="${preenchido.toFixed(1)} ${circunferencia.toFixed(1)}"
                    transform="rotate(-90 32 32)"/>
            </svg>
            <span>${Math.floor(porcentagem)}%</span>
        </div>
    `;
}

function mostrarMetas() {

    const container = document.getElementById("lista-metas-semana");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (metas.length === 0) {

        container.innerHTML = `
            <p class="lista-vazia">
                Você ainda não tem metas.
                <a href="novameta.html">Criar meta →</a>
            </p>
        `;

        return;
    }

    // Metas ainda abertas, com o prazo mais próximo primeiro
    const abertas = metas
        .filter(function (meta) {
            return obterStatusMeta(meta) !== "concluida";
        })
        .sort(function (a, b) {

            const dataA = criarData(a.dataLimite);
            const dataB = criarData(b.dataLimite);

            if (!dataA && !dataB) return 0;
            if (!dataA) return 1;
            if (!dataB) return -1;

            return dataA - dataB;
        })
        .slice(0, 2);

    if (abertas.length === 0) {

        container.innerHTML = `
            <p class="lista-vazia">
                Todas as suas metas foram concluídas!
                <a href="novameta.html">Criar nova meta →</a>
            </p>
        `;

        return;
    }

    const cores = ["azul", "roxo"];

    abertas.forEach(function (meta, indice) {

        const objetivo = Number(meta.valorMeta) || 0;

        const porcentagem = objetivo > 0
            ? Math.min(((Number(meta.valorAtual) || 0) / objetivo) * 100, 100)
            : 0;

        const item = document.createElement("a");

        item.href = "metas.html";
        item.className = "item-meta";

        item.innerHTML = `
            ${criarAnel(porcentagem, cores[indice % cores.length])}

            <div class="dados-meta">
                <strong>${escaparHTML(meta.nome)}</strong>
                <span>${descreverPrazo(meta)}</span>
            </div>

            <em>›</em>
        `;

        container.appendChild(item);
    });
}


// =====================================================
// RESUMO FINANCEIRO (mês atual)
// =====================================================

function mostrarFinanceiro() {

    const agora = new Date();

    const mes = agora.getFullYear() +
        "-" +
        String(agora.getMonth() + 1).padStart(2, "0");

    let recebido = 0;
    let gasto = 0;

    lancamentos.forEach(function (lancamento) {

        if (String(lancamento.data || "").slice(0, 7) !== mes) {
            return;
        }

        const valor = Number(lancamento.valor) || 0;

        if (ehEntrada(lancamento.tipo)) {
            recebido += valor;
        }

        if (ehDespesa(lancamento.tipo)) {
            gasto += valor;
        }
    });

    let porcentagem = 0;

    if (recebido > 0) {
        porcentagem = Math.min(Math.round((gasto / recebido) * 100), 100);
    } else if (gasto > 0) {
        porcentagem = 100;
    }

    definirBarra("fin-barra", porcentagem);
    definirTexto("fin-pct", porcentagem + "%");

    const valores = document.getElementById("fin-valores");

    if (valores) {

        valores.innerHTML =
            `<strong>${formatarMoeda(gasto)}</strong> de ${formatarMoeda(recebido)}`;
    }

    let texto;

    if (recebido === 0 && gasto === 0) {
        texto = "Sem lançamentos neste mês.";
    } else if (recebido - gasto >= 0) {
        texto = `Saldo do mês: ${formatarMoeda(recebido - gasto)}`;
    } else {
        texto = `Você gastou ${formatarMoeda(gasto - recebido)} a mais do que recebeu.`;
    }

    definirTexto("fin-texto", texto);
}


// =====================================================
// NAVEGAÇÃO ENTRE SEMANAS E ABAS
// =====================================================

function configurarSemanas() {

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

function configurarAbas() {

    document.querySelectorAll(".aba-tarefas").forEach(function (aba) {

        aba.addEventListener("click", function () {

            document.querySelectorAll(".aba-tarefas").forEach(function (outra) {
                outra.classList.toggle("ativa", outra === aba);
            });

            const destino = document.getElementById(aba.getAttribute("data-destino"));

            if (destino) {
                destino.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
    });
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
// INICIAR
// =====================================================

document.addEventListener("DOMContentLoaded", async function () {

    const logado = await mostrarUsuario();

    if (!logado) {
        return;
    }

    configurarSemanas();
    configurarAbas();
    configurarLinksTemporarios();
    carregarDados();
});


