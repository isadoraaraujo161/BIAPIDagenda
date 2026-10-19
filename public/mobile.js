(function () {

    const botao = document.getElementById("botaoMenu");
    const menu = document.getElementById("barraLateral");
    const fundo = document.getElementById("fundoMenu");

    if (!botao || !menu || !fundo) {
        return;
    }

    const telaCelular = window.matchMedia("(max-width: 760px)");

    function abrirMenu() {
        menu.classList.add("aberto");
        fundo.classList.add("ativo");
        document.body.classList.add("menu-aberto");
        botao.setAttribute("aria-expanded", "true");
    }

    function fecharMenu() {
        menu.classList.remove("aberto");
        fundo.classList.remove("ativo");
        document.body.classList.remove("menu-aberto");
        botao.setAttribute("aria-expanded", "false");
    }

    botao.addEventListener("click", function (evento) {

        // No desktop o botão continua levando para o perfil
        if (!telaCelular.matches) {
            return;
        }

        evento.preventDefault();

        if (menu.classList.contains("aberto")) {
            fecharMenu();
        } else {
            abrirMenu();
        }
    });

    fundo.addEventListener("click", fecharMenu);

    document.addEventListener("keydown", function (evento) {
        if (evento.key === "Escape") {
            fecharMenu();
        }
    });

    // Fecha o menu ao tocar em um link (útil para links de âncora)
    menu.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", fecharMenu);
    });

    // Se a tela voltar ao tamanho de computador, reseta tudo
    telaCelular.addEventListener("change", function (evento) {
        if (!evento.matches) {
            fecharMenu();
        }
    });

})();