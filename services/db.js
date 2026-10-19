
const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "..", "tarefas.db"));

db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        dataNascimento TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        senhaHash TEXT NOT NULL
    )
`);

// Adiciona as colunas dataNascimento, cidade e fotoPerfil sem apagar os usuários que já existem
try {
    db.exec(`ALTER TABLE usuarios ADD COLUMN dataNascimento TEXT`);
} catch (erro) {
    // Coluna já existe, pode ignorar
}

try {
    db.exec(`ALTER TABLE usuarios ADD COLUMN cidade TEXT`);
} catch (erro) {
    // Coluna já existe, pode ignorar
}

try {
    db.exec(`ALTER TABLE usuarios ADD COLUMN fotoPerfil TEXT`);
} catch (erro) {
    // Coluna já existe, pode ignorar
}

db.exec(`
    CREATE TABLE IF NOT EXISTS tarefas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuarioId INTEGER NOT NULL,
        titulo TEXT NOT NULL,
        descricao TEXT,
        data TEXT NOT NULL,
        horario TEXT,
        categoria TEXT DEFAULT 'outros',
        prioridade TEXT DEFAULT 'normal',
        concluida INTEGER DEFAULT 0,
        criadaEm TEXT NOT NULL,
        FOREIGN KEY (usuarioId) REFERENCES usuarios(id)
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS metas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuarioId INTEGER NOT NULL,
        nome TEXT NOT NULL,
        categoria TEXT NOT NULL,
        valorAtual REAL DEFAULT 0,
        valorMeta REAL NOT NULL,
        dataLimite TEXT NOT NULL,
        descricao TEXT,
        concluida INTEGER DEFAULT 0,
        criadaEm TEXT NOT NULL,
        FOREIGN KEY (usuarioId) REFERENCES usuarios(id)
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS lancamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuarioId INTEGER NOT NULL,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL,
        valor REAL NOT NULL,
        categoria TEXT DEFAULT 'outros',
        data TEXT NOT NULL,
        criadaEm TEXT NOT NULL,
        FOREIGN KEY (usuarioId) REFERENCES usuarios(id)
    )
`);

// Garante a coluna "descricao" mesmo se a tabela já existia sem ela
try {
    db.exec(`ALTER TABLE lancamentos ADD COLUMN descricao TEXT`);
} catch (erro) {
    // Coluna já existe — tudo bem, ignora
}

db.exec(`
    CREATE TABLE IF NOT EXISTS preferencias (
        usuarioId INTEGER PRIMARY KEY,
        tema TEXT DEFAULT 'claro',
        tamanhoFonte TEXT DEFAULT 'padrao',
        altoContraste INTEGER DEFAULT 0,
        areaToque INTEGER DEFAULT 0,
        FOREIGN KEY (usuarioId) REFERENCES usuarios(id)
    )
`);

// Adiciona a coluna escalaFonte sem apagar os dados que já existem
try {
    db.exec(`ALTER TABLE preferencias ADD COLUMN escalaFonte REAL DEFAULT 1`);
} catch (erro) {
    // Coluna já existe, pode ignorar
}

module.exports = db;
