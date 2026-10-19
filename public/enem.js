
// =====================================================
// BIPAID - ENEM
// enem.js
// =====================================================

document.addEventListener("DOMContentLoaded", function () {

    // =====================================================
    // ELEMENTOS
    // =====================================================

    const campoMensagem = document.getElementById("campo-mensagem");
    const botaoEnviar = document.getElementById("botao-enviar");
    const mensagens = document.getElementById("mensagens");

    const sugestoes = document.querySelectorAll(".sugestao");
    const acoesEstudo = document.querySelectorAll(".acao-estudo");


    // =====================================================
    // HORÁRIO DA MENSAGEM INICIAL
    // =====================================================

    const horaInicial = document.getElementById("hora-inicial");

    if (horaInicial) {
        horaInicial.textContent = new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }


    // =====================================================
    // ESCAPAR HTML
    // =====================================================

    function escaparHTML(texto) {

        return texto
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

    }


    // =====================================================
    // FORMATAR RESPOSTA DA BIPA
    // =====================================================

    function formatarResposta(texto) {

        if (!texto) {
            return "";
        }

        let resposta = escaparHTML(texto);

        // Títulos
        resposta = resposta.replace(/^###\s*(.+)$/gm, '<h4>$1</h4>');
        resposta = resposta.replace(/^##\s*(.+)$/gm, '<h3>$1</h3>');
        resposta = resposta.replace(/^#\s*(.+)$/gm, '<h2>$1</h2>');

        // Títulos escritos em negrito
        resposta = resposta.replace(/^\*\*(.+?)\*\*\s*$/gm, '<h3>$1</h3>');

        // Separadores
        resposta = resposta.replace(/^\s*---+\s*$/gm, '<div class="separador-bipa"></div>');

        // Negrito
        resposta = resposta.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Itálico
        resposta = resposta.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');

        // Listas
        resposta = resposta.replace(/^\s*[•●]\s+(.+)$/gm, '<li>$1</li>');
        resposta = resposta.replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>');
        resposta = resposta.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');

        // Agrupar li consecutivos em ul
        resposta = resposta.replace(
            /((?:<li>.*?<\/li>\s*)+)/gs,
            function (lista) {
                return "<ul>" + lista + "</ul>";
            }
        );

        // Quebras de linha
        resposta = resposta.replace(/\n{3,}/g, "\n\n");
        resposta = resposta.replace(/\n/g, "<br>");

        // Limpar br antes/depois de alguns elementos
        resposta = resposta.replace(/<br>\s*(<h[234]>)/g, "$1");
        resposta = resposta.replace(/(<\/h[234]>)\s*<br>/g, "$1");
        resposta = resposta.replace(/<br>\s*(<ul>)/g, "$1");
        resposta = resposta.replace(/(<\/ul>)\s*<br>/g, "$1");
        resposta = resposta.replace(/<br>\s*(<div class="separador-bipa">)/g, "$1");
        resposta = resposta.replace(/(<div class="separador-bipa"><\/div>)\s*<br>/g, "$1");

        return resposta;
    }


    // =====================================================
    // ROLAR PARA BAIXO
    // =====================================================

    function rolarParaBaixo() {

        mensagens.scrollTo({
            top: mensagens.scrollHeight,
            behavior: "smooth"
        });

    }


    // =====================================================
    // ADICIONAR MENSAGEM DO USUÁRIO
    // =====================================================

    function adicionarMensagemUsuario(texto) {

        const mensagem = document.createElement("div");

        mensagem.className = "mensagem mensagem-usuario";

        const conteudo = document.createElement("div");

        conteudo.className = "conteudo-mensagem";

        conteudo.textContent = texto;

        mensagem.appendChild(conteudo);

        mensagens.appendChild(mensagem);

        rolarParaBaixo();
    }


    // =====================================================
    // ADICIONAR MENSAGEM DA BIPA
    // =====================================================

    function adicionarMensagemBipa(texto) {

        const mensagem = document.createElement("div");

        mensagem.className = "mensagem mensagem-bipa";

        const avatar = document.createElement("div");

        avatar.className = "avatar-mensagem";

        avatar.textContent = "B";

        const conteudo = document.createElement("div");

        conteudo.className = "conteudo-mensagem";

        const nome = document.createElement("strong");

        nome.textContent = "BIPA";

        const resposta = document.createElement("div");

        resposta.className = "resposta-bipa";

        resposta.innerHTML = formatarResposta(texto);

        conteudo.appendChild(nome);

        conteudo.appendChild(resposta);

        mensagem.appendChild(avatar);

        mensagem.appendChild(conteudo);

        mensagens.appendChild(mensagem);

        rolarParaBaixo();
    }


    // =====================================================
    // CARREGANDO
    // =====================================================

    function mostrarCarregando() {

        removerCarregando();

        const mensagem = document.createElement("div");

        mensagem.id = "bipa-carregando";

        mensagem.className = "mensagem mensagem-bipa carregando";

        mensagem.innerHTML = `
            <div class="avatar-mensagem">
                B
            </div>

            <div class="conteudo-mensagem">

                <strong>BIPA</strong>

                <div class="indicador-digitacao">

                    <span></span>
                    <span></span>
                    <span></span>

                </div>

                <small>
                    A BIPA está pensando...
                </small>

            </div>
        `;

        mensagens.appendChild(mensagem);

        rolarParaBaixo();
    }


    // =====================================================
    // REMOVER CARREGANDO
    // =====================================================

    function removerCarregando() {

        const carregando = document.getElementById("bipa-carregando");

        if (carregando) {
            carregando.remove();
        }

    }


    // =====================================================
    // ENVIAR MENSAGEM
    // =====================================================

    async function enviarMensagem(texto) {

        if (!texto || !texto.trim()) {
            return;
        }

        texto = texto.trim();

        adicionarMensagemUsuario(texto);

        campoMensagem.value = "";

        campoMensagem.style.height = "52px";

        botaoEnviar.disabled = true;

        mostrarCarregando();

        try {

            const resposta = await fetch(
                "/api/bipa",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        mensagem: texto
                    })
                }
            );

            const dados = await resposta.json();

            removerCarregando();

            if (!resposta.ok || !dados.sucesso) {

                adicionarMensagemBipa(
                    dados.mensagem ||
                    "Não consegui responder agora. Tente novamente."
                );

                return;
            }

            adicionarMensagemBipa(dados.resposta);

        }

        catch (erro) {

            console.error("Erro ao conversar com o BIPA:", erro);

            removerCarregando();

            adicionarMensagemBipa(
                "Não consegui me conectar ao BIPA agora. Verifique se o servidor está funcionando."
            );

        }

        finally {

            botaoEnviar.disabled = false;

            campoMensagem.focus();

        }

    }


    // =====================================================
    // BOTÃO ENVIAR
    // =====================================================

    botaoEnviar.addEventListener("click", function () {

        enviarMensagem(campoMensagem.value);

    });


    // =====================================================
    // ENTER
    // =====================================================

    campoMensagem.addEventListener("keydown", function (evento) {

        if (evento.key === "Enter" && !evento.shiftKey) {

            evento.preventDefault();

            enviarMensagem(campoMensagem.value);

        }

    });


    // =====================================================
    // TEXTAREA AUTOMÁTICO
    // =====================================================

    campoMensagem.addEventListener("input", function () {

        campoMensagem.style.height = "52px";

        campoMensagem.style.height =
            Math.min(campoMensagem.scrollHeight, 140) + "px";

    });


    // =====================================================
    // SUGESTÕES
    // =====================================================

    sugestoes.forEach(function (botao) {

        botao.addEventListener("click", function () {

            enviarMensagem(botao.dataset.mensagem);

        });

    });


    // =====================================================
    // ATALHOS RÁPIDOS
    // =====================================================

    acoesEstudo.forEach(function (botao) {

        botao.addEventListener("click", function () {

            enviarMensagem(botao.dataset.mensagem);

        });

    });


    // =====================================================
    // DEIXAR DISPONÍVEL GLOBALMENTE
    // =====================================================

    window.enviarMensagemBipa = enviarMensagem;

});


// =====================================================
// USUÁRIO LOGADO
// =====================================================

document.addEventListener("DOMContentLoaded", async function () {

    const logado = await mostrarUsuario();

    if (!logado) {
        return;
    }

});

