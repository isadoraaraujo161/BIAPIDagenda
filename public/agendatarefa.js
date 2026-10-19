
document.addEventListener("DOMContentLoaded", async function () {
    await mostrarUsuario();
    configurarCampoData();
    configurarContadorDescricao();
});


/* =====================================================
   DATA: só hoje ou futuro, e somente datas que existem
===================================================== */

// Data de hoje no formato AAAA-MM-DD (usa o fuso do aparelho, não o UTC)
function obterHojeISO() {

    const hoje = new Date();

    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    return `${hoje.getFullYear()}-${mes}-${dia}`;
}

// Confere se a data realmente existe (ex.: 31/02 e 29/02 de ano comum não existem)
function dataExiste(valor) {

    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);

    if (!partes) {
        return false;
    }

    const ano = Number(partes[1]);
    const mes = Number(partes[2]);
    const dia = Number(partes[3]);

    const data = new Date(ano, mes - 1, dia);

    return (
        data.getFullYear() === ano &&
        data.getMonth() === mes - 1 &&
        data.getDate() === dia
    );
}

// Devolve a mensagem de erro, ou "" se a data estiver válida
function validarData(campo) {

    const valor = campo.value;

    // Navegador não aceitou o que foi digitado (ex.: 31/02/2026)
    if (!valor && campo.validity.badInput) {
        return "Essa data não existe. Confira o dia e o mês.";
    }

    if (!valor) {
        return "Escolha uma data para a tarefa.";
    }

    if (!dataExiste(valor)) {
        return "Essa data não existe. Confira o dia e o mês.";
    }

    // Datas no formato AAAA-MM-DD podem ser comparadas como texto
    if (valor < obterHojeISO()) {
        return "Escolha a data de hoje ou uma data futura.";
    }

    return "";
}

function mostrarErroData(mensagem) {

    const campo = document.getElementById("data");
    const aviso = document.getElementById("erro-data");

    if (!campo || !aviso) {
        return;
    }

    campo.classList.toggle("invalido", mensagem !== "");

    aviso.textContent = mensagem;
    aviso.hidden = mensagem === "";
}

function configurarCampoData() {

    const campo = document.getElementById("data");

    if (!campo) {
        return;
    }

    // Bloqueia no calendário os dias que já passaram
    campo.min = obterHojeISO();

    // Mostra o aviso na hora em que a data fica inválida
    // (campo vazio ainda não reclama; isso fica para o envio)
    campo.addEventListener("input", function () {

        if (!campo.value && !campo.validity.badInput) {
            mostrarErroData("");
            return;
        }

        mostrarErroData(validarData(campo));
    });

    campo.addEventListener("change", function () {

        if (!campo.value && !campo.validity.badInput) {
            mostrarErroData("");
            return;
        }

        mostrarErroData(validarData(campo));
    });
}


/* =====================================================
   CONTADOR DA DESCRIÇÃO (0/500)
===================================================== */

function configurarContadorDescricao() {

    const descricao = document.getElementById("descricao");
    const contador = document.getElementById("contador-descricao");

    if (!descricao || !contador) {
        return;
    }

    function atualizar() {
        contador.textContent = `${descricao.value.length}/${descricao.maxLength}`;
    }

    descricao.addEventListener("input", atualizar);

    atualizar();
}


/* =====================================================
   ENVIO DO FORMULÁRIO
===================================================== */

const formulario = document.getElementById("formulario-tarefa");

if (formulario) {
    formulario.addEventListener("submit", async function (evento) {
        evento.preventDefault();

        // Pega os valores preenchidos no formulário
        const titulo = document.getElementById("titulo").value.trim();
        const descricao = document.getElementById("descricao").value.trim();
        const campoData = document.getElementById("data");
        const data = campoData.value;
        const horario = document.getElementById("horario").value;
        const categoria = document.getElementById("categoria").value;
        const prioridade = document.getElementById("prioridade").value;

        // Verifica se os campos obrigatórios foram preenchidos
        if (!titulo) {
            mostrarAviso("Digite o nome da tarefa.");
            return;
        }

        // Valida a data: precisa existir e ser hoje ou futura
        const erroData = validarData(campoData);

        if (erroData) {
            mostrarErroData(erroData);
            mostrarAviso(erroData);
            campoData.focus();
            return;
        }

        // Monta a tarefa
        const tarefa = {
            titulo: titulo,
            descricao: descricao,
            data: data,
            horario: horario,
            categoria: categoria,
            prioridade: prioridade
        };

        // Pega o botão e desabilita antes de enviar
        const botaoEnviar = formulario.querySelector('button[type="submit"]');
        botaoEnviar.disabled = true;

        try {
            // Envia a tarefa para o Node.js
            const resposta = await fetch("/api/tarefas", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(tarefa)
            });

            const dados = await resposta.json();

            // Verifica se o servidor aceitou a tarefa
            if (!dados.sucesso) {
                mostrarAviso(dados.mensagem || "Não foi possível adicionar a tarefa.");
                return;
            }

            // Tarefa adicionada
            mostrarAviso("Tarefa adicionada com sucesso!");

            // Volta para a agenda no modo Dia
            window.location.href = "agenda.html#dia";

        } catch (erro) {
            console.error("Erro:", erro);

            mostrarAviso(
                "Não foi possível conectar ao servidor. " +
                "Verifique se o Node.js está funcionando."
            );

        } finally {
            // Reabilita o botão, aconteça o que acontecer
            botaoEnviar.disabled = false;
        }
    });
}
