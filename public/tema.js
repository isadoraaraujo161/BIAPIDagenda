
// =====================================================
// TEMA - BIPAID
// Aplica o tema, o tamanho da fonte e as opções de
// acessibilidade salvas pelo usuário em QUALQUER página.
//
// IMPORTANTE: pra evitar a "piscada" de tela (a página
// aparecer clara e só depois trocar pra escura), esse
// script precisa ficar bem no TOPO do <head>, ANTES de
// qualquer <link rel="stylesheet">. Assim:
//
//     <head>
//         <meta charset="UTF-8">
//         <script src="tema.js"></script>
//         <link rel="stylesheet" href="estilo-da-pagina.css">
//         ...
//     </head>
//     <body>
//         ...
//         <script src="usuario.js"></script>
//         <script src="arquivo-da-pagina.js"></script>
//     </body>
// =====================================================

(function () {

    const ESCALA_FONTE_PADRAO = 1;
    const ESCALA_FONTE_MINIMA = 0.75;
    const ESCALA_FONTE_MAXIMA = 1.6;
    const CHAVE_CACHE = "bipaid-preferencias";


    // =================================================
    // APLICAR PREFERÊNCIAS NA PÁGINA
    // =================================================

    function aplicarPreferencias(preferencias) {

        const raiz =
            document.documentElement;


        // =============================================
        // TEMA
        // =============================================

        raiz.setAttribute(
            "data-tema",
            preferencias.tema || "claro"
        );


        // =============================================
        // TAMANHO DA FONTE
        // =============================================

        const escala =
            Number(preferencias.escalaFonte) || ESCALA_FONTE_PADRAO;

        const escalaLimitada =
            Math.min(
                ESCALA_FONTE_MAXIMA,
                Math.max(ESCALA_FONTE_MINIMA, escala)
            );

        raiz.style.setProperty(
            "--escala-fonte",
            escalaLimitada
        );


        // =============================================
        // ALTO CONTRASTE
        // =============================================

        if (preferencias.altoContraste) {

            raiz.setAttribute("data-contraste", "alto");

        } else {

            raiz.removeAttribute("data-contraste");
        }


        // =============================================
        // ÁREA DE TOQUE
        // =============================================

        if (preferencias.areaToque) {

            raiz.setAttribute("data-area-toque", "grande");

        } else {

            raiz.removeAttribute("data-area-toque");
        }
    }


    // =================================================
    // CACHE LOCAL (evita a piscada entre páginas)
    // =================================================

    function aplicarCacheLocal() {

        try {

            const salvo =
                localStorage.getItem(CHAVE_CACHE);

            if (!salvo) {
                return;
            }

            aplicarPreferencias(JSON.parse(salvo));

        } catch (erro) {

            // Se o cache estiver corrompido, ignora e segue
            // com o padrão até o servidor responder.
        }
    }

    function salvarCacheLocal(preferencias) {

        try {

            localStorage.setItem(
                CHAVE_CACHE,
                JSON.stringify(preferencias)
            );

        } catch (erro) {

            // Sem problema se o navegador bloquear o localStorage
        }
    }


    // =================================================
    // BUSCAR PREFERÊNCIAS NO SERVIDOR
    // =================================================

    async function carregarTema() {

        try {

            const resposta =
                await fetch("/api/preferencias");

            if (!resposta.ok) {
                return;
            }

            const dados =
                await resposta.json();

            if (dados.sucesso && dados.preferencias) {

                aplicarPreferencias(dados.preferencias);
                salvarCacheLocal(dados.preferencias);
            }

        } catch (erro) {

            console.error(
                "Erro ao carregar o tema:",
                erro
            );
        }
    }


    // 1) Aplica na hora o que já está salvo no navegador
    //    (sem esperar o servidor responder) — isso elimina a piscada.
    aplicarCacheLocal();

    // 2) Confirma/atualiza com o servidor em segundo plano.
    carregarTema();

})();

