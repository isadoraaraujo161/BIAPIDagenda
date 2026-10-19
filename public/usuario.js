
function obterIniciais(nome) {

    if (!nome) return "US";

    const partes =
        nome.trim().split(/\s+/);

    if (partes.length === 1) {
        return partes[0].substring(0, 2).toUpperCase();
    }

    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
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

async function mostrarUsuario() {

    try {

        const resposta = await fetch("/api/usuario-atual");

        if (!resposta.ok) {
            window.location.href = "login.html";
            return null;
        }

        const dados = await resposta.json();
        const usuario = dados.usuario;

        if (!usuario || !usuario.nome) {
            window.location.href = "login.html";
            return null;
        }

        document.querySelectorAll(".nome-usuario").forEach(function (elemento) {
            elemento.textContent = usuario.nome;
        });

        aplicarFotoNosAvatares(usuario);

        return usuario;

    } catch (erro) {

        console.error(erro);
        window.location.href = "login.html";
        return null;

    }
}

async function sair() {

    try {
        await fetch("/api/logout", { method: "POST" });
    } catch (erro) {
        console.error(erro);
    } finally {
        window.location.href = "login.html";
    }
}
