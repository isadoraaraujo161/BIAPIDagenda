
document.addEventListener("DOMContentLoaded", function () {

    const formulario = document.querySelector("form");

    formulario.addEventListener("submit", async function (evento) {

        evento.preventDefault();

        const nome = document.getElementById("nome").value.trim();
        const dataNascimento = document.getElementById("dataNascimento").value;
        const email = document.getElementById("email").value.trim();
        const senha = document.getElementById("senha").value;
        const confirmarSenha = document.getElementById("confirmar-senha").value;

        // Verifica se todos os campos foram preenchidos
        if (!nome || !dataNascimento || !email || !senha || !confirmarSenha) {
            mostrarAviso("Preencha todos os campos.");
            return;
        }

        // Verifica se as senhas são iguais
        if (senha !== confirmarSenha) {
            mostrarAviso("As senhas não são iguais.");
            return;
        }

        const botaoEnviar = formulario.querySelector('button[type="submit"]');
        botaoEnviar.disabled = true;

        try {

            const resposta = await fetch("/api/cadastro", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ nome, dataNascimento, email, senha })
            });

            const dados = await resposta.json();

            if (!dados.sucesso) {
                mostrarAviso(dados.mensagem || "Não foi possível criar a conta.");
                return;
            }

            mostrarAviso("Conta criada com sucesso!");

            // Vai para a página inicial (o cadastro já loga automaticamente)
            window.location.href = "paginainicial.html";

        } catch (erro) {

            console.error("Erro:", erro);
            mostrarAviso("Não foi possível conectar ao servidor. Verifique se o Node.js está funcionando.");

        } finally {

            botaoEnviar.disabled = false;

        }

    });

});


