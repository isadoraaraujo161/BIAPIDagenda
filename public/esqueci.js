document.addEventListener("DOMContentLoaded", function () {

    const formulario = document.querySelector("form");

    formulario.addEventListener("submit", function (evento) {

        evento.preventDefault();

        const email = document.getElementById("email").value.trim();

        if (!email) {
            alert("Digite seu e-mail.");
            return;
        }

        // Busca os usuários cadastrados
        const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

        // Procura o usuário pelo e-mail
        const indiceUsuario = usuarios.findIndex(function (usuario) {
            return usuario.email === email;
        });

        // Verifica se o e-mail existe
        if (indiceUsuario === -1) {
            alert("Nenhuma conta foi encontrada com esse e-mail.");
            return;
        }

        const novaSenha = prompt("Digite sua nova senha:");

        if (!novaSenha) {
            return;
        }

        if (novaSenha.length < 6) {
            alert("A nova senha deve ter pelo menos 6 caracteres.");
            return;
        }

        // Atualiza a senha
        usuarios[indiceUsuario].senha = novaSenha;

        // Salva novamente os usuários
        localStorage.setItem(
            "usuarios",
            JSON.stringify(usuarios)
        );

        alert("Senha alterada com sucesso!");

        // Volta para o login
        window.location.href = "login.html";
    });

});

