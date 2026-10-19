
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
require("dotenv").config();

const {
    perguntarAoBipa
} = require("./services/bipaIA");

const bcrypt = require("bcrypt");
const session = require("express-session");
const db = require("./services/db");

const app = express();
const PORT = 3000;

// Permite requisições
app.use(cors());

// Permite receber dados em JSON
app.use(express.json());

// Permite receber dados de formulários
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || "troque-isso-no-.env",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 1 dia
    }
}));

// Mostra os arquivos da pasta public
app.use(express.static(path.join(__dirname, "public")));

// ==========================================
// UPLOAD DE FOTO DE PERFIL
// ==========================================

const PASTA_FOTOS = path.join(__dirname, "public", "uploads", "fotos");

// Garante que a pasta de fotos existe
fs.mkdirSync(PASTA_FOTOS, { recursive: true });

const armazenamentoFotos = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, PASTA_FOTOS);
    },
    filename: function (req, file, cb) {
        const extensao = path.extname(file.originalname).toLowerCase();
        const nomeArquivo = `usuario-${req.session.usuarioId}-${Date.now()}${extensao}`;
        cb(null, nomeArquivo);
    }
});

const uploadFoto = multer({
    storage: armazenamentoFotos,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: function (req, file, cb) {
        const tiposPermitidos = ["image/jpeg", "image/png", "image/webp", "image/gif"];

        if (!tiposPermitidos.includes(file.mimetype)) {
            return cb(new Error("Formato de imagem não permitido."));
        }

        cb(null, true);
    }
});

// ==========================================
// ROTA PRINCIPAL
// ==========================================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

function exigirLogin(req, res, next) {
    if (!req.session.usuarioId) {
        return res.status(401).json({ sucesso: false, mensagem: "Você precisa estar logado." });
    }
    next();
}

// ==========================================
// QUEM ESTÁ LOGADO
// ==========================================
app.get("/api/usuario-atual", (req, res) => {
    if (!req.session.usuarioId) {
        return res.status(401).json({ sucesso: false });
    }

    const usuario = db.prepare(
        "SELECT id, nome, email, dataNascimento, cidade, fotoPerfil FROM usuarios WHERE id = ?"
    ).get(req.session.usuarioId);

    return res.status(200).json({ sucesso: true, usuario });
});

// ==========================================
// ATUALIZAR INFORMAÇÕES DO PERFIL
// ==========================================
app.put("/api/usuario", exigirLogin, (req, res) => {

    const usuario = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(req.session.usuarioId);

    if (!usuario) {
        return res.status(404).json({ sucesso: false, mensagem: "Usuário não encontrado." });
    }

    const nome = req.body.nome !== undefined ? req.body.nome.trim() : usuario.nome;
    const email = req.body.email !== undefined ? req.body.email.trim().toLowerCase() : usuario.email;
    const dataNascimento = req.body.dataNascimento !== undefined ? req.body.dataNascimento : usuario.dataNascimento;
    const cidade = req.body.cidade !== undefined ? req.body.cidade.trim() : usuario.cidade;

    if (!nome || nome.length < 2) {
        return res.status(400).json({ sucesso: false, mensagem: "Digite um nome válido." });
    }

    if (!email || !email.includes("@")) {
        return res.status(400).json({ sucesso: false, mensagem: "E-mail inválido." });
    }

    const emailEmUso = db.prepare("SELECT id FROM usuarios WHERE email = ? AND id != ?")
        .get(email, req.session.usuarioId);

    if (emailEmUso) {
        return res.status(409).json({ sucesso: false, mensagem: "Esse e-mail já está sendo usado por outra conta." });
    }

    db.prepare(`
        UPDATE usuarios
        SET nome = ?, email = ?, dataNascimento = ?, cidade = ?
        WHERE id = ?
    `).run(nome, email, dataNascimento, cidade, req.session.usuarioId);

    const usuarioAtualizado = db.prepare(
        "SELECT id, nome, email, dataNascimento, cidade, fotoPerfil FROM usuarios WHERE id = ?"
    ).get(req.session.usuarioId);

    return res.status(200).json({
        sucesso: true,
        mensagem: "Informações atualizadas com sucesso!",
        usuario: usuarioAtualizado
    });
});

// ==========================================
// ATUALIZAR FOTO DE PERFIL
// ==========================================
app.post("/api/usuario/foto", exigirLogin, function (req, res) {

    uploadFoto.single("foto")(req, res, function (erro) {

        if (erro) {
            return res.status(400).json({
                sucesso: false,
                mensagem: erro.message || "Não foi possível enviar a imagem."
            });
        }

        if (!req.file) {
            return res.status(400).json({ sucesso: false, mensagem: "Escolha uma imagem." });
        }

        // Apaga a foto antiga (se tiver uma) pra não acumular arquivo no servidor
        const usuarioAtual = db.prepare("SELECT fotoPerfil FROM usuarios WHERE id = ?")
            .get(req.session.usuarioId);

        if (usuarioAtual && usuarioAtual.fotoPerfil) {

            const caminhoAntigo = path.join(PASTA_FOTOS, usuarioAtual.fotoPerfil);

            fs.unlink(caminhoAntigo, function () {
                // Se não existir mais, não tem problema
            });
        }

        db.prepare("UPDATE usuarios SET fotoPerfil = ? WHERE id = ?")
            .run(req.file.filename, req.session.usuarioId);

        const usuarioAtualizado = db.prepare(
            "SELECT id, nome, email, dataNascimento, cidade, fotoPerfil FROM usuarios WHERE id = ?"
        ).get(req.session.usuarioId);

        return res.status(200).json({
            sucesso: true,
            mensagem: "Foto atualizada com sucesso!",
            usuario: usuarioAtualizado
        });
    });
});

// ==========================================
// ALTERAR SENHA
// ==========================================
app.put("/api/usuario/senha", exigirLogin, async (req, res) => {

    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
        return res.status(400).json({ sucesso: false, mensagem: "Preencha a senha atual e a nova senha." });
    }

    if (novaSenha.length < 6) {
        return res.status(400).json({ sucesso: false, mensagem: "A nova senha deve ter pelo menos 6 caracteres." });
    }

    const usuario = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(req.session.usuarioId);

    if (!usuario) {
        return res.status(404).json({ sucesso: false, mensagem: "Usuário não encontrado." });
    }

    const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senhaHash);

    if (!senhaCorreta) {
        return res.status(401).json({ sucesso: false, mensagem: "Senha atual incorreta." });
    }

    const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

    db.prepare("UPDATE usuarios SET senhaHash = ? WHERE id = ?")
        .run(novaSenhaHash, req.session.usuarioId);

    return res.status(200).json({ sucesso: true, mensagem: "Senha alterada com sucesso!" });
});

// ADICIONAR TAREFA
app.post("/api/tarefas", exigirLogin, (req, res) => {
    const { titulo, descricao, data, horario, categoria, prioridade } = req.body;

    if (!titulo || titulo.trim().length < 3) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "O título da tarefa é obrigatório e deve ter pelo menos 3 caracteres."
        });
    }

    if (!data) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "A data da tarefa é obrigatória."
        });
    }

    const criadaEm = new Date().toISOString();

    const resultado = db.prepare(`
        INSERT INTO tarefas (usuarioId, titulo, descricao, data, horario, categoria, prioridade, concluida, criadaEm)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
        req.session.usuarioId,
        titulo.trim(),
        descricao ? descricao.trim() : "",
        data,
        horario || "",
        categoria || "outros",
        prioridade || "normal",
        criadaEm
    );

    const novaTarefa = db.prepare("SELECT * FROM tarefas WHERE id = ? AND usuarioId = ?")
        .get(resultado.lastInsertRowid, req.session.usuarioId);

    return res.status(201).json({
        sucesso: true,
        mensagem: "Tarefa adicionada com sucesso!",
        tarefa: novaTarefa
    });
});

// LISTAR TODAS AS TAREFAS
app.get("/api/tarefas", exigirLogin, (req, res) => {
    const tarefas = db.prepare("SELECT * FROM tarefas WHERE usuarioId = ?").all(req.session.usuarioId);
    return res.status(200).json({ sucesso: true, tarefas });
});

// BUSCAR UMA TAREFA PELO ID
app.get("/api/tarefas/:id", exigirLogin, (req, res) => {
    const tarefa = db.prepare("SELECT * FROM tarefas WHERE id = ? AND usuarioId = ?")
        .get(req.params.id, req.session.usuarioId);

    if (!tarefa) {
        return res.status(404).json({ sucesso: false, mensagem: "Tarefa não encontrada." });
    }

    return res.status(200).json({ sucesso: true, tarefa });
});

app.put("/api/tarefas/:id", exigirLogin, (req, res) => {
    const tarefa = db.prepare("SELECT * FROM tarefas WHERE id = ? AND usuarioId = ?")
        .get(req.params.id, req.session.usuarioId);

    if (!tarefa) {
        return res.status(404).json({ sucesso: false, mensagem: "Tarefa não encontrada." });
    }

    const {
        titulo,
        descricao,
        data,
        horario,
        categoria,
        prioridade,
        concluida
    } = req.body;

    // Só valida/atualiza o que veio no corpo do pedido
    const novoTitulo = titulo !== undefined ? titulo.trim() : tarefa.titulo;
    const novaData = data !== undefined ? data : tarefa.data;

    if (!novoTitulo || novoTitulo.length < 3) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "O título da tarefa é obrigatório e deve ter pelo menos 3 caracteres."
        });
    }

    if (!novaData) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "A data da tarefa é obrigatória."
        });
    }

    db.prepare(`
        UPDATE tarefas SET
            titulo = ?,
            descricao = ?,
            data = ?,
            horario = ?,
            categoria = ?,
            prioridade = ?,
            concluida = ?
        WHERE id = ? AND usuarioId = ?
    `).run(
        novoTitulo,
        descricao !== undefined ? descricao.trim() : tarefa.descricao,
        novaData,
        horario !== undefined ? horario : tarefa.horario,
        categoria !== undefined ? categoria : tarefa.categoria,
        prioridade !== undefined ? prioridade : tarefa.prioridade,
        typeof concluida === "boolean" ? (concluida ? 1 : 0) : tarefa.concluida,
        req.params.id,
        req.session.usuarioId
    );

    const tarefaAtualizada = db.prepare("SELECT * FROM tarefas WHERE id = ? AND usuarioId = ?")
        .get(req.params.id, req.session.usuarioId);

    return res.status(200).json({
        sucesso: true,
        mensagem: "Tarefa atualizada com sucesso!",
        tarefa: tarefaAtualizada
    });
});

// EXCLUIR TAREFA
app.delete("/api/tarefas/:id", exigirLogin, (req, res) => {
    const resultado = db.prepare("DELETE FROM tarefas WHERE id = ? AND usuarioId = ?")
        .run(req.params.id, req.session.usuarioId);

    if (resultado.changes === 0) {
        return res.status(404).json({ sucesso: false, mensagem: "Tarefa não encontrada." });
    }

    return res.status(200).json({ sucesso: true, mensagem: "Tarefa excluída com sucesso!" });
});



// ==========================================
// METAS
// ==========================================

// ADICIONAR META
app.post("/api/metas", exigirLogin, (req, res) => {
    const { nome, categoria, valorAtual, valorMeta, dataLimite, descricao } = req.body;

    if (!nome || !nome.trim()) {
        return res.status(400).json({ sucesso: false, mensagem: "Digite o nome da meta." });
    }

    if (!categoria) {
        return res.status(400).json({ sucesso: false, mensagem: "Selecione uma categoria." });
    }

    const valorMetaNum = Number(valorMeta);
    const valorAtualNum = Number(valorAtual) || 0;

    if (!valorMetaNum || valorMetaNum <= 0) {
        return res.status(400).json({ sucesso: false, mensagem: "Digite um valor objetivo maior que zero." });
    }

    if (valorAtualNum < 0) {
        return res.status(400).json({ sucesso: false, mensagem: "O valor já alcançado não pode ser negativo." });
    }

    if (valorAtualNum > valorMetaNum) {
        return res.status(400).json({ sucesso: false, mensagem: "O valor já alcançado não pode ser maior que o valor objetivo." });
    }

    if (!dataLimite) {
        return res.status(400).json({ sucesso: false, mensagem: "Escolha uma data limite." });
    }

    const criadaEm = new Date().toISOString();
    const concluida = valorAtualNum >= valorMetaNum ? 1 : 0;

    const resultado = db.prepare(`
        INSERT INTO metas (usuarioId, nome, categoria, valorAtual, valorMeta, dataLimite, descricao, concluida, criadaEm)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        req.session.usuarioId,
        nome.trim(),
        categoria,
        valorAtualNum,
        valorMetaNum,
        dataLimite,
        descricao ? descricao.trim() : "",
        concluida,
        criadaEm
    );

    const novaMeta = db.prepare("SELECT * FROM metas WHERE id = ? AND usuarioId = ?")
        .get(resultado.lastInsertRowid, req.session.usuarioId);

    return res.status(201).json({ sucesso: true, mensagem: "Meta criada com sucesso!", meta: novaMeta });
});

// LISTAR METAS
app.get("/api/metas", exigirLogin, (req, res) => {
    const metas = db.prepare("SELECT * FROM metas WHERE usuarioId = ?").all(req.session.usuarioId);
    return res.status(200).json({ sucesso: true, metas });
});

// ATUALIZAR META (ex: mudar valor alcançado)
app.put("/api/metas/:id", exigirLogin, (req, res) => {
    const meta = db.prepare("SELECT * FROM metas WHERE id = ? AND usuarioId = ?")
        .get(req.params.id, req.session.usuarioId);

    if (!meta) {
        return res.status(404).json({ sucesso: false, mensagem: "Meta não encontrada." });
    }

    const valorAtual = req.body.valorAtual !== undefined
        ? Number(req.body.valorAtual)
        : meta.valorAtual;

    const concluida = valorAtual >= meta.valorMeta ? 1 : 0;

    db.prepare("UPDATE metas SET valorAtual = ?, concluida = ? WHERE id = ? AND usuarioId = ?")
        .run(valorAtual, concluida, req.params.id, req.session.usuarioId);

    const metaAtualizada = db.prepare("SELECT * FROM metas WHERE id = ? AND usuarioId = ?")
        .get(req.params.id, req.session.usuarioId);

    return res.status(200).json({ sucesso: true, mensagem: "Meta atualizada com sucesso!", meta: metaAtualizada });
});

// EXCLUIR META
app.delete("/api/metas/:id", exigirLogin, (req, res) => {
    const resultado = db.prepare("DELETE FROM metas WHERE id = ? AND usuarioId = ?")
        .run(req.params.id, req.session.usuarioId);

    if (resultado.changes === 0) {
        return res.status(404).json({ sucesso: false, mensagem: "Meta não encontrada." });
    }

    return res.status(200).json({ sucesso: true, mensagem: "Meta excluída com sucesso!" });
});

// ==========================================
// LANÇAMENTOS (MEU DINHEIRO)
// ==========================================

// ADICIONAR LANÇAMENTO
app.post("/api/lancamentos", exigirLogin, (req, res) => {
    const { nome, tipo, valor, categoria, data, descricao } = req.body;

    if (!nome || !nome.trim()) {
        return res.status(400).json({ sucesso: false, mensagem: "Digite o nome do lançamento." });
    }

    const tipoNormalizado =
        (tipo === "entrada" || tipo === "receita") ? "entrada" :
        (tipo === "saida" || tipo === "despesa") ? "saida" : null;

    if (!tipoNormalizado) {
        return res.status(400).json({ sucesso: false, mensagem: "Informe se é uma entrada ou saída." });
    }

    const valorNum = Number(valor);

    if (!valorNum || valorNum <= 0) {
        return res.status(400).json({ sucesso: false, mensagem: "Digite um valor maior que zero." });
    }

    if (!data) {
        return res.status(400).json({ sucesso: false, mensagem: "Escolha uma data." });
    }

    const criadaEm = new Date().toISOString();

    const resultado = db.prepare(`
        INSERT INTO lancamentos (usuarioId, nome, tipo, valor, categoria, data, descricao, criadaEm)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        req.session.usuarioId,
        nome.trim(),
        tipoNormalizado,
        valorNum,
        categoria || "outros",
        data,
        descricao ? descricao.trim() : "",
        criadaEm
    );

    const novoLancamento = db.prepare("SELECT * FROM lancamentos WHERE id = ? AND usuarioId = ?")
        .get(resultado.lastInsertRowid, req.session.usuarioId);

    return res.status(201).json({ sucesso: true, mensagem: "Lançamento adicionado!", lancamento: novoLancamento });
});

// LISTAR LANÇAMENTOS
app.get("/api/lancamentos", exigirLogin, (req, res) => {
    const lancamentos = db.prepare("SELECT * FROM lancamentos WHERE usuarioId = ? ORDER BY data DESC, id DESC")
        .all(req.session.usuarioId);

    return res.status(200).json({ sucesso: true, lancamentos });
});

// EXCLUIR LANÇAMENTO
app.delete("/api/lancamentos/:id", exigirLogin, (req, res) => {
    const resultado = db.prepare("DELETE FROM lancamentos WHERE id = ? AND usuarioId = ?")
        .run(req.params.id, req.session.usuarioId);

    if (resultado.changes === 0) {
        return res.status(404).json({ sucesso: false, mensagem: "Lançamento não encontrado." });
    }

    return res.status(200).json({ sucesso: true, mensagem: "Lançamento excluído!" });
});

// ==========================================
// PREFERÊNCIAS (AJUSTES)
// ==========================================

const PREFERENCIAS_PADRAO = {
    tema: "claro",
    tamanhoFonte: "padrao",
    escalaFonte: 1,
    altoContraste: false,
    areaToque: false
};

// BUSCAR PREFERÊNCIAS
app.get("/api/preferencias", exigirLogin, (req, res) => {

    const preferencias = db.prepare("SELECT * FROM preferencias WHERE usuarioId = ?")
        .get(req.session.usuarioId);

    if (!preferencias) {
        return res.status(200).json({ sucesso: true, preferencias: PREFERENCIAS_PADRAO });
    }

    return res.status(200).json({
        sucesso: true,
        preferencias: {
            tema: preferencias.tema,
            tamanhoFonte: preferencias.tamanhoFonte,
            escalaFonte: preferencias.escalaFonte || 1,
            altoContraste: !!preferencias.altoContraste,
            areaToque: !!preferencias.areaToque
        }
    });
});

// SALVAR PREFERÊNCIAS
app.put("/api/preferencias", exigirLogin, (req, res) => {

    const { tema, tamanhoFonte, altoContraste, areaToque } = req.body;

    const temasValidos = ["claro", "escuro", "roxo", "verde", "rosa", "azul"];
    const fontesValidas = ["diminuir", "padrao", "aumentar"];

    if (tema !== undefined && !temasValidos.includes(tema)) {
        return res.status(400).json({ sucesso: false, mensagem: "Tema inválido." });
    }

    if (tamanhoFonte !== undefined && !fontesValidas.includes(tamanhoFonte)) {
        return res.status(400).json({ sucesso: false, mensagem: "Tamanho de fonte inválido." });
    }

    const existente = db.prepare("SELECT * FROM preferencias WHERE usuarioId = ?")
        .get(req.session.usuarioId);

    let escalaFonte = existente?.escalaFonte ?? 1;

    if (req.body.escalaFonte !== undefined) {

        const escala = Number(req.body.escalaFonte);

        if (!isNaN(escala) && escala >= 0.75 && escala <= 1.6) {
            escalaFonte = escala;
        }
    }

    const valores = {
        tema: tema !== undefined ? tema : (existente?.tema ?? PREFERENCIAS_PADRAO.tema),
        tamanhoFonte: tamanhoFonte !== undefined ? tamanhoFonte : (existente?.tamanhoFonte ?? PREFERENCIAS_PADRAO.tamanhoFonte),
        escalaFonte: escalaFonte,
        altoContraste: typeof altoContraste === "boolean" ? (altoContraste ? 1 : 0) : (existente?.altoContraste ?? 0),
        areaToque: typeof areaToque === "boolean" ? (areaToque ? 1 : 0) : (existente?.areaToque ?? 0)
    };

    if (existente) {

        db.prepare(`
            UPDATE preferencias SET tema = ?, tamanhoFonte = ?, escalaFonte = ?, altoContraste = ?, areaToque = ?
            WHERE usuarioId = ?
        `).run(valores.tema, valores.tamanhoFonte, valores.escalaFonte, valores.altoContraste, valores.areaToque, req.session.usuarioId);

    } else {

        db.prepare(`
            INSERT INTO preferencias (usuarioId, tema, tamanhoFonte, escalaFonte, altoContraste, areaToque)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(req.session.usuarioId, valores.tema, valores.tamanhoFonte, valores.escalaFonte, valores.altoContraste, valores.areaToque);

    }

    return res.status(200).json({
        sucesso: true,
        mensagem: "Preferências salvas!",
        preferencias: {
            tema: valores.tema,
            tamanhoFonte: valores.tamanhoFonte,
            escalaFonte: valores.escalaFonte,
            altoContraste: !!valores.altoContraste,
            areaToque: !!valores.areaToque
        }
    });
});

// ==========================================
// BIPA - PARCEIRO ACADÊMICO
// ==========================================

app.post("/api/bipa", async (req, res) => {

    try {

        const { mensagem } = req.body;

        // Verifica se o usuário enviou uma mensagem
        if (!mensagem || !mensagem.trim()) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "Digite uma pergunta para o BIPA."
            });

        }

        console.log("=================================");
        console.log("Pergunta recebida pelo BIPA:");
        console.log(mensagem);
        console.log("=================================");

        // Envia a pergunta para a inteligência artificial
        const resposta = await perguntarAoBipa(mensagem.trim());

        console.log("Resposta recebida do Gemini com sucesso.");

        return res.status(200).json({

            sucesso: true,
            resposta: resposta

        });

    } catch (erro) {

        console.error("=================================");
        console.error("ERRO COMPLETO DO BIPA:");
        console.error(erro);
        console.error("Mensagem:", erro.message);
        console.error("Status:", erro.status);
        console.error("=================================");

        return res.status(500).json({

            sucesso: false,
            mensagem: "Não foi possível conversar com o BIPA agora."

        });

    }

});
// ==========================================
// CADASTRO
// ==========================================
app.post("/api/cadastro", async (req, res) => {
    const { nome, dataNascimento, email, senha } = req.body;

    if (!nome || nome.trim().length < 2) {
        return res.status(400).json({ sucesso: false, mensagem: "Digite seu nome." });
    }

    if (!dataNascimento) {
        return res.status(400).json({ sucesso: false, mensagem: "Informe sua data de nascimento." });
    }

    if (!email || !email.includes("@")) {
        return res.status(400).json({ sucesso: false, mensagem: "E-mail inválido." });
    }

    if (!senha || senha.length < 6) {
        return res.status(400).json({ sucesso: false, mensagem: "A senha deve ter pelo menos 6 caracteres." });
    }

    const jaExiste = db.prepare("SELECT id FROM usuarios WHERE email = ?").get(email.trim().toLowerCase());

    if (jaExiste) {
        return res.status(409).json({ sucesso: false, mensagem: "Esse e-mail já está cadastrado." });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const resultado = db.prepare(`
        INSERT INTO usuarios (nome, dataNascimento, email, senhaHash) VALUES (?, ?, ?, ?)
    `).run(nome.trim(), dataNascimento, email.trim().toLowerCase(), senhaHash);

    req.session.usuarioId = resultado.lastInsertRowid;

    return res.status(201).json({
        sucesso: true,
        usuario: { id: resultado.lastInsertRowid, nome: nome.trim(), email: email.trim().toLowerCase() }
    });
});

// ==========================================
// LOGIN
// ==========================================
app.post("/api/login", async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ sucesso: false, mensagem: "Preencha o e-mail e a senha." });
    }

    const usuario = db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email.trim().toLowerCase());

    if (!usuario) {
        return res.status(401).json({ sucesso: false, mensagem: "E-mail ou senha incorretos." });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senhaHash);

    if (!senhaCorreta) {
        return res.status(401).json({ sucesso: false, mensagem: "E-mail ou senha incorretos." });
    }

    req.session.usuarioId = usuario.id;

    return res.status(200).json({
        sucesso: true,
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email }
    });
});

// ==========================================
// LOGOUT
// ==========================================
app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
        res.status(200).json({ sucesso: true });
    });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

app.listen(PORT, () => {

    console.log(
        `Servidor rodando com sucesso em http://localhost:${PORT}`
    );

});
