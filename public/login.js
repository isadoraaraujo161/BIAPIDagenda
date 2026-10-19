
document.addEventListener("DOMContentLoaded", function () {

    const formulario = document.getElementById("formulario-login");

    formulario.addEventListener("submit", async function (evento) {

        evento.preventDefault();

        const email = document.getElementById("email").value.trim();
        const senha = document.getElementById("senha").value;

        // Verifica se os campos foram preenchidos
        if (!email || !senha) {
           mostrarAviso ("Preencha o e-mail e a senha.");
            return;
        }

        const botaoEnviar = formulario.querySelector('button[type="submit"]');
        botaoEnviar.disabled = true;

        try {

            const resposta = await fetch("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, senha })
            });

            const dados = await resposta.json();

            if (!dados.sucesso) {
                mostrarAviso(dados.mensagem || "E-mail ou senha incorretos.");
                return;
            }

            // Entra na página inicial
            window.location.href = "paginainicial.html";

        } catch (erro) {

            console.error("Erro:", erro);
            mostrarAviso("Não foi possível conectar ao servidor. Verifique se o Node.js está funcionando.");

        } finally {

            botaoEnviar.disabled = false;

        }

    });

});
