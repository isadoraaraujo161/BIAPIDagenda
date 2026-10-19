
// =====================================================
// PERFIL - BIPAID
// =====================================================

let usuarioAtual = null;


// =====================================================
// CALCULAR IDADE A PARTIR DA DATA DE NASCIMENTO
// =====================================================

function calcularIdade(dataNascimento) {

    const nascimento =
        new Date(dataNascimento);

    if (isNaN(nascimento.getTime())) {
        return null;
    }

    const hoje =
        new Date();

    let idade =
        hoje.getFullYear() - nascimento.getFullYear();

    const aindaNaoFezAniversario =
        (hoje.getMonth() < nascimento.getMonth()) ||
        (
            hoje.getMonth() === nascimento.getMonth() &&
            hoje.getDate() < nascimento.getDate()
        );

    if (aindaNaoFezAniversario) {
        idade--;
    }

    return idade;
}


// =====================================================
// FORMATAR DATA (AAAA-MM-DD -> DD/MM/AAAA)
// =====================================================

function formatarDataNascimento(data) {

    const partes =
        String(data).split("-");

    if (partes.length !== 3) {
        return null;
    }

    const [ano, mes, dia] =
        partes;

    return `${dia}/${mes}/${ano}`;
}


// =====================================================
// MOSTRAR OS DADOS NA TELA
// =====================================================

function obterIniciais(nome) {

    if (!nome) return "US";

    const partes =
        nome.trim().split(/\s+/);

    const primeira = partes[0] ? partes[0][0] : "";
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";

    const iniciais =
        (primeira + ultima).toUpperCase();

    return iniciais || "US";
}

function aplicarFotoNosAvatares(usuario) {

    document.querySelectorAll(".avatar-usuario").forEach(function (elemento) {

        if (usuario.fotoPerfil) {

            elemento.style.backgroundImage = `url('/uploads/fotos/${usuario.fotoPerfil}')`;
            elemento.classList.add("com-foto");
            elemento.textContent = "";

        } else {

            elemento.style.backgroundImage = "";
            elemento.classList.remove("com-foto");
            elemento.textContent = obterIniciais(usuario.nome);
        }
    });
}

function mostrarDadosNaTela(usuario) {

    const infoNome =
        document.getElementById("info-nome");

    const infoEmail =
        document.getElementById("info-email");

    const contaEmail =
        document.getElementById("conta-email");

    if (infoNome) {
        infoNome.textContent = usuario.nome || "—";
    }

    if (infoEmail) {
        infoEmail.textContent = usuario.email || "—";
    }

    if (contaEmail) {
        contaEmail.textContent = usuario.email || "—";
    }

    // Nome nos lugares compartilhados (sidebar, topo, cabeçalho)
    document.querySelectorAll(".nome-usuario").forEach(function (elemento) {
        elemento.textContent = usuario.nome || "Usuário";
    });

    // Foto (ou iniciais) nos avatares da página
    aplicarFotoNosAvatares(usuario);

    const infoNascimento =
        document.getElementById("info-nascimento");

    const infoIdade =
        document.getElementById("info-idade");

    if (usuario.dataNascimento) {

        const dataFormatada =
            formatarDataNascimento(usuario.dataNascimento);

        if (infoNascimento) {
            infoNascimento.textContent = dataFormatada || "Não informado";
        }

        const idade =
            calcularIdade(usuario.dataNascimento);

        if (infoIdade) {
            infoIdade.textContent = idade !== null ? `${idade} anos` : "Não informado";
        }

    } else {

        if (infoNascimento) infoNascimento.textContent = "Não informado";
        if (infoIdade) infoIdade.textContent = "Não informado";
    }

    const infoCidade =
        document.getElementById("info-cidade");

    if (infoCidade) {
        infoCidade.textContent = usuario.cidade || "Não informado";
    }
}


// =====================================================
// CARREGAR DADOS DO USUÁRIO
// =====================================================

async function carregarPerfil() {

    try {

        const resposta =
            await fetch("/api/usuario-atual");

        if (!resposta.ok) {
            return;
        }

        const dados =
            await resposta.json();

        if (!dados.usuario) {
            return;
        }

        usuarioAtual = dados.usuario;

        mostrarDadosNaTela(usuarioAtual);

    } catch (erro) {

        console.error(
            "Erro ao carregar o perfil:",
            erro
        );
    }
}


// =====================================================
// FOTO DE PERFIL
// =====================================================

function abrirSeletorFoto() {
    document.getElementById("input-foto-perfil").click();
}

async function enviarFotoPerfil(evento) {

    const arquivo =
        evento.target.files[0];

    if (!arquivo) return;

    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (!tiposPermitidos.includes(arquivo.type)) {
        mostrarAviso("Escolha uma imagem (JPG, PNG, WEBP ou GIF).", "erro");
        evento.target.value = "";
        return;
    }

    if (arquivo.size > 5 * 1024 * 1024) {
        mostrarAviso("A imagem precisa ter até 5MB.", "erro");
        evento.target.value = "";
        return;
    }

    const botaoCamera =
        document.getElementById("botao-camera");

    if (botaoCamera) botaoCamera.disabled = true;

    try {

        const formData = new FormData();
        formData.append("foto", arquivo);

        const resposta = await fetch("/api/usuario/foto", {
            method: "POST",
            body: formData
        });

        const dados = await resposta.json();

        if (!dados.sucesso) {
            mostrarAviso(dados.mensagem || "Não foi possível enviar a foto.", "erro");
            return;
        }

        usuarioAtual = dados.usuario;
        mostrarDadosNaTela(usuarioAtual);
        mostrarAviso("Foto de perfil atualizada!");

    } catch (erro) {

        console.error(erro);
        mostrarAviso("Não foi possível conectar ao servidor.", "erro");

    } finally {

        if (botaoCamera) botaoCamera.disabled = false;
        evento.target.value = "";
    }
}

function configurarFotoPerfil() {

    const botaoCamera =
        document.getElementById("botao-camera");

    const inputFoto =
        document.getElementById("input-foto-perfil");

    if (!botaoCamera || !inputFoto) return;

    botaoCamera.addEventListener("click", abrirSeletorFoto);
    inputFoto.addEventListener("change", enviarFotoPerfil);
}


// =====================================================
// MODAL: EDITAR INFORMAÇÕES PESSOAIS
// =====================================================

function abrirModalEditarPerfil() {

    if (!usuarioAtual) return;

    document.getElementById("campo-nome").value = usuarioAtual.nome || "";
    document.getElementById("campo-email").value = usuarioAtual.email || "";
    document.getElementById("campo-nascimento").value = usuarioAtual.dataNascimento || "";
    document.getElementById("campo-cidade").value = usuarioAtual.cidade || "";

    esconderErro("erro-editar-perfil");

    document.getElementById("modal-editar-perfil").classList.add("aberto");
}

function fecharModalEditarPerfil() {
    document.getElementById("modal-editar-perfil").classList.remove("aberto");
}

function esconderErro(id) {

    const elemento =
        document.getElementById(id);

    if (!elemento) return;

    elemento.textContent = "";
    elemento.classList.remove("visivel");
}

function mostrarErro(id, mensagem) {

    const elemento =
        document.getElementById(id);

    if (!elemento) return;

    elemento.textContent = mensagem;
    elemento.classList.add("visivel");
}

async function salvarEdicaoPerfil(evento) {

    evento.preventDefault();

    const nome = document.getElementById("campo-nome").value.trim();
    const email = document.getElementById("campo-email").value.trim();
    const dataNascimento = document.getElementById("campo-nascimento").value;
    const cidade = document.getElementById("campo-cidade").value.trim();

    esconderErro("erro-editar-perfil");

    if (!nome || nome.length < 2) {
        mostrarErro("erro-editar-perfil", "Digite um nome válido.");
        return;
    }

    if (!email || !email.includes("@")) {
        mostrarErro("erro-editar-perfil", "Digite um e-mail válido.");
        return;
    }

    const botaoSalvar =
        document.querySelector("#formulario-editar-perfil .botao-salvar-modal");

    botaoSalvar.disabled = true;

    try {

        const resposta = await fetch("/api/usuario", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nome,
                email,
                dataNascimento,
                cidade
            })
        });

        const dados = await resposta.json();

        if (!dados.sucesso) {
            mostrarErro("erro-editar-perfil", dados.mensagem || "Não foi possível salvar as alterações.");
            return;
        }

        usuarioAtual = dados.usuario;

        mostrarDadosNaTela(usuarioAtual);

        fecharModalEditarPerfil();

    } catch (erro) {

        console.error(erro);
        mostrarErro("erro-editar-perfil", "Não foi possível conectar ao servidor.");

    } finally {

        botaoSalvar.disabled = false;
    }
}


// =====================================================
// MODAL: ALTERAR SENHA
// =====================================================

function abrirModalAlterarSenha() {

    document.getElementById("formulario-alterar-senha").reset();
    esconderErro("erro-alterar-senha");

    document.getElementById("modal-alterar-senha").classList.add("aberto");
}

function fecharModalAlterarSenha() {
    document.getElementById("modal-alterar-senha").classList.remove("aberto");
}

async function salvarNovaSenha(evento) {

    evento.preventDefault();

    const senhaAtual = document.getElementById("campo-senha-atual").value;
    const novaSenha = document.getElementById("campo-senha-nova").value;
    const confirmarSenha = document.getElementById("campo-senha-confirmar").value;

    esconderErro("erro-alterar-senha");

    if (novaSenha.length < 6) {
        mostrarErro("erro-alterar-senha", "A nova senha deve ter pelo menos 6 caracteres.");
        return;
    }

    if (novaSenha !== confirmarSenha) {
        mostrarErro("erro-alterar-senha", "As senhas não são iguais.");
        return;
    }

    const botaoSalvar =
        document.querySelector("#formulario-alterar-senha .botao-salvar-modal");

    botaoSalvar.disabled = true;

    try {

        const resposta = await fetch("/api/usuario/senha", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                senhaAtual,
                novaSenha
            })
        });

        const dados = await resposta.json();

        if (!dados.sucesso) {
            mostrarErro("erro-alterar-senha", dados.mensagem || "Não foi possível alterar a senha.");
            return;
        }

        fecharModalAlterarSenha();

        mostrarAviso("Senha alterada com sucesso!");

    } catch (erro) {

        console.error(erro);
        mostrarErro("erro-alterar-senha", "Não foi possível conectar ao servidor.");

    } finally {

        botaoSalvar.disabled = false;
    }
}


// =====================================================
// SAIR DA CONTA
// =====================================================

function configurarBotaoSair() {

    const botaoSair =
        document.getElementById("botao-sair");

    if (!botaoSair) return;

    botaoSair.addEventListener("click", async function () {

        const confirmar =
            confirm("Deseja sair da sua conta?");

        if (!confirmar) {
            return;
        }

        try {

            await fetch("/api/logout", { method: "POST" });

        } catch (erro) {

            console.error(erro);

        } finally {

            window.location.href = "login.html";
        }
    });
}


// =====================================================
// CONFIGURAR TODOS OS BOTÕES DA PÁGINA
// =====================================================

function configurarBotoes() {

    configurarFotoPerfil();

    // Qualquer lápis das informações pessoais abre o mesmo modal
    document.querySelectorAll(
        "#botao-editar-perfil-1, #botao-editar-perfil-2, #botao-editar-perfil-3, #botao-editar-perfil-4"
    ).forEach(function (botao) {

        botao.addEventListener("click", abrirModalEditarPerfil);
    });

    document.getElementById("fechar-modal-perfil")
        .addEventListener("click", fecharModalEditarPerfil);

    document.getElementById("cancelar-editar-perfil")
        .addEventListener("click", fecharModalEditarPerfil);

    document.getElementById("modal-editar-perfil")
        .addEventListener("click", function (evento) {
            if (evento.target.id === "modal-editar-perfil") {
                fecharModalEditarPerfil();
            }
        });

    document.getElementById("formulario-editar-perfil")
        .addEventListener("submit", salvarEdicaoPerfil);

    // Os dois caminhos para alterar a senha (Segurança + Conta)
    document.querySelectorAll(
        "#botao-alterar-senha, #botao-alterar-senha-2"
    ).forEach(function (botao) {

        botao.addEventListener("click", abrirModalAlterarSenha);
    });

    document.getElementById("fechar-modal-senha")
        .addEventListener("click", fecharModalAlterarSenha);

    document.getElementById("cancelar-alterar-senha")
        .addEventListener("click", fecharModalAlterarSenha);

    document.getElementById("modal-alterar-senha")
        .addEventListener("click", function (evento) {
            if (evento.target.id === "modal-alterar-senha") {
                fecharModalAlterarSenha();
            }
        });

    document.getElementById("formulario-alterar-senha")
        .addEventListener("submit", salvarNovaSenha);

    configurarBotaoSair();
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

    await carregarPerfil();
    configurarBotoes();
});

