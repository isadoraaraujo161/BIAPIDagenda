
// =====================================================
// AJUSTES - BIPAID
// =====================================================

// Controle do tamanho da fonte (agora é contínuo, não só 3 opções)
const ESCALA_FONTE_PADRAO = 1;
const ESCALA_FONTE_MINIMA = 0.75;
const ESCALA_FONTE_MAXIMA = 1.6;
const ESCALA_FONTE_PASSO = 0.05;

// Guarda a escala atual enquanto a pessoa clica várias vezes seguidas
let escalaFonteAtual = ESCALA_FONTE_PADRAO;

// Evita salvar no banco a cada clique quando a pessoa clica muito rápido
let temporizadorSalvarFonte = null;


// =====================================================
// APLICAR PREFERÊNCIAS NA TELA
// =====================================================

function aplicarPreferencias(preferencias) {

    const raiz =
        document.documentElement;


    // =================================================
    // TEMA
    // =================================================

    const tema =
        preferencias.tema || "claro";

    raiz.setAttribute(
        "data-tema",
        tema
    );


    // =================================================
    // TAMANHO DA FONTE
    // =================================================

    const escala =
        Number(preferencias.escalaFonte) || ESCALA_FONTE_PADRAO;

    aplicarEscalaFonte(escala);


    // =================================================
    // ALTO CONTRASTE
    // =================================================

    if (preferencias.altoContraste) {

        raiz.setAttribute(
            "data-contraste",
            "alto"
        );

    } else {

        raiz.removeAttribute(
            "data-contraste"
        );
    }


    // =================================================
    // ÁREA DE TOQUE
    // =================================================

    if (preferencias.areaToque) {

        raiz.setAttribute(
            "data-area-toque",
            "grande"
        );

    } else {

        raiz.removeAttribute(
            "data-area-toque"
        );
    }


    // =================================================
    // MARCAR SELEÇÕES NA TELA
    // =================================================

    marcarTemaSelecionado(tema);
    marcarAlternador("alternador-contraste", !!preferencias.altoContraste);
    marcarAlternador("alternador-toque", !!preferencias.areaToque);
}


// =====================================================
// APLICAR A ESCALA DA FONTE (sem salvar)
// =====================================================

function aplicarEscalaFonte(escala) {

    escalaFonteAtual =
        Math.min(
            ESCALA_FONTE_MAXIMA,
            Math.max(ESCALA_FONTE_MINIMA, escala)
        );

    document.documentElement.style.setProperty(
        "--escala-fonte",
        escalaFonteAtual
    );


    // =================================================
    // INDICADOR DE PORCENTAGEM
    // =================================================

    const indicador =
        document.getElementById("indicador-fonte");

    if (indicador) {

        indicador.textContent =
            `${Math.round(escalaFonteAtual * 100)}%`;
    }


    // =================================================
    // DESTACAR "PADRÃO" SÓ QUANDO ESTIVER EM 100%
    // =================================================

    const botaoPadrao =
        document.querySelector('.opcao-fonte[data-fonte="padrao"]');

    if (botaoPadrao) {

        if (Math.abs(escalaFonteAtual - ESCALA_FONTE_PADRAO) < 0.001) {

            botaoPadrao.classList.add("selecionado");

        } else {

            botaoPadrao.classList.remove("selecionado");
        }
    }


    // =================================================
    // DESABILITAR NOS LIMITES
    // =================================================

    const botaoDiminuir =
        document.getElementById("botao-diminuir-fonte");

    const botaoAumentar =
        document.getElementById("botao-aumentar-fonte");

    if (botaoDiminuir) {

        botaoDiminuir.disabled =
            escalaFonteAtual <= ESCALA_FONTE_MINIMA;
    }

    if (botaoAumentar) {

        botaoAumentar.disabled =
            escalaFonteAtual >= ESCALA_FONTE_MAXIMA;
    }
}


// =====================================================
// MARCAR TEMA SELECIONADO
// =====================================================

function marcarTemaSelecionado(tema) {

    const botoes =
        document.querySelectorAll(".cartao-tema");

    botoes.forEach(function (botao) {

        if (botao.dataset.tema === tema) {

            botao.classList.add("selecionado");

        } else {

            botao.classList.remove("selecionado");
        }
    });
}


// =====================================================
// MARCAR ALTERNADOR (TOGGLE)
// =====================================================

function marcarAlternador(id, ativo) {

    const botao =
        document.getElementById(id);

    if (!botao) return;

    if (ativo) {

        botao.classList.add("ativo");
        botao.setAttribute("aria-checked", "true");

    } else {

        botao.classList.remove("ativo");
        botao.setAttribute("aria-checked", "false");
    }
}


// =====================================================
// CARREGAR PREFERÊNCIAS DO SERVIDOR
// =====================================================

async function carregarPreferencias() {

    try {

        const resposta =
            await fetch("/api/preferencias");

        const dados =
            await resposta.json();

        if (dados.sucesso && dados.preferencias) {

            aplicarPreferencias(dados.preferencias);
        }

    } catch (erro) {

        console.error(
            "Erro ao carregar preferências:",
            erro
        );
    }
}


// =====================================================
// SALVAR PREFERÊNCIAS NO SERVIDOR
// =====================================================

async function salvarPreferencias(alteracoes) {

    try {

        const resposta =
            await fetch("/api/preferencias", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(alteracoes)
            });

        const dados =
            await resposta.json();

        if (!dados.sucesso) {

            console.error(
                "Não foi possível salvar as preferências:",
                dados.mensagem
            );
        }

    } catch (erro) {

        console.error(
            "Erro ao salvar preferências:",
            erro
        );
    }
}


// =====================================================
// SALVAR A ESCALA DA FONTE COM PEQUENO ATRASO
// (evita mandar uma requisição a cada clique rápido)
// =====================================================

function salvarEscalaFonteComAtraso() {

    if (temporizadorSalvarFonte) {

        clearTimeout(temporizadorSalvarFonte);
    }

    temporizadorSalvarFonte = setTimeout(function () {

        salvarPreferencias({ escalaFonte: escalaFonteAtual });

    }, 400);
}


// =====================================================
// CONFIGURAR SELETOR DE TEMA
// =====================================================

function configurarSeletorTema() {

    const botoes =
        document.querySelectorAll(".cartao-tema");

    botoes.forEach(function (botao) {

        botao.addEventListener("click", function () {

            const tema =
                botao.dataset.tema;

            document.documentElement.setAttribute(
                "data-tema",
                tema
            );

            marcarTemaSelecionado(tema);

            salvarPreferencias({ tema: tema });
        });
    });
}


// =====================================================
// CONFIGURAR SELETOR DE FONTE (agora contínuo)
// =====================================================

function configurarSeletorFonte() {

    const botaoDiminuir =
        document.getElementById("botao-diminuir-fonte");

    const botaoPadrao =
        document.querySelector('.opcao-fonte[data-fonte="padrao"]');

    const botaoAumentar =
        document.getElementById("botao-aumentar-fonte");


    // =================================================
    // DIMINUIR (pode clicar várias vezes seguidas)
    // =================================================

    if (botaoDiminuir) {

        botaoDiminuir.addEventListener("click", function () {

            aplicarEscalaFonte(escalaFonteAtual - ESCALA_FONTE_PASSO);

            salvarEscalaFonteComAtraso();
        });
    }


    // =================================================
    // PADRÃO (volta para 100%)
    // =================================================

    if (botaoPadrao) {

        botaoPadrao.addEventListener("click", function () {

            aplicarEscalaFonte(ESCALA_FONTE_PADRAO);

            salvarEscalaFonteComAtraso();
        });
    }


    // =================================================
    // AUMENTAR (pode clicar várias vezes seguidas)
    // =================================================

    if (botaoAumentar) {

        botaoAumentar.addEventListener("click", function () {

            aplicarEscalaFonte(escalaFonteAtual + ESCALA_FONTE_PASSO);

            salvarEscalaFonteComAtraso();
        });
    }
}


// =====================================================
// CONFIGURAR ALTERNADORES (TOGGLES) DE ACESSIBILIDADE
// =====================================================

function configurarAlternador(id, atributo, valorAtivo, chavePreferencia) {

    const botao =
        document.getElementById(id);

    if (!botao) return;

    botao.addEventListener("click", function () {

        const estaAtivo =
            botao.classList.contains("ativo");

        const novoEstado =
            !estaAtivo;

        marcarAlternador(id, novoEstado);

        if (novoEstado) {

            document.documentElement.setAttribute(
                atributo,
                valorAtivo
            );

        } else {

            document.documentElement.removeAttribute(
                atributo
            );
        }

        const alteracao = {};
        alteracao[chavePreferencia] = novoEstado;

        salvarPreferencias(alteracao);
    });
}


// =====================================================
// INICIAR PÁGINA
// =====================================================

document.addEventListener("DOMContentLoaded", async function () {

    const logado =
        await mostrarUsuario();

    if (!logado) {
        return;
    }

    configurarSeletorTema();
    configurarSeletorFonte();

    configurarAlternador(
        "alternador-contraste",
        "data-contraste",
        "alto",
        "altoContraste"
    );

    configurarAlternador(
        "alternador-toque",
        "data-area-toque",
        "grande",
        "areaToque"
    );

    carregarPreferencias();
});
