
// =====================================================
// AVISO - notificação flutuante (substitui o alert())
// BIPAID
// =====================================================
//
// Como usar em qualquer página (no lugar de alert("...")):
//
//     mostrarAviso("Evento adicionado à sua agenda!");
//     mostrarAviso("Não foi possível salvar.", "erro");
//     mostrarAviso("Isso é só um aviso.", "info");
//
// Tipos disponíveis: "sucesso" (padrão), "erro", "info"

function obterAreaAvisos() {

    let area = document.getElementById("area-avisos");

    if (!area) {
        area = document.createElement("div");
        area.id = "area-avisos";
        document.body.appendChild(area);
    }

    return area;
}

function iconeDoAviso(tipo) {

    if (tipo === "erro") {
        return `
            <svg viewBox="0 0 24 24" fill="none">
                <path d="M6 6L18 18M18 6L6 18" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
            </svg>
        `;
    }

    if (tipo === "info") {
        return `
            <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="1.5" fill="#fff"/>
                <path d="M12 11V17" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
        `;
    }

    // sucesso (padrão)
    return `
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M5 12L10 17L19 8" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
}

function mostrarAviso(mensagem, tipo) {

    tipo = tipo || "sucesso";

    const area =
        obterAreaAvisos();

    const toast =
        document.createElement("div");

    toast.className = `aviso-toast aviso-${tipo}`;

    toast.innerHTML = `
        <span class="aviso-icone">${iconeDoAviso(tipo)}</span>
        <span class="aviso-texto"></span>
    `;

    // Usa textContent pra mensagem (evita problemas se o texto tiver símbolos especiais)
    toast.querySelector(".aviso-texto").textContent = mensagem;

    area.appendChild(toast);

    // Força o navegador a aplicar a transição de entrada
    requestAnimationFrame(function () {
        toast.classList.add("aviso-visivel");
    });

    setTimeout(function () {

        toast.classList.remove("aviso-visivel");
        toast.classList.add("aviso-saindo");

        setTimeout(function () {
            toast.remove();
        }, 250);

    }, 3000);
}
