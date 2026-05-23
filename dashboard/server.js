import express from 'express';
import { WebSocketServer } from 'ws';
import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import crypto from 'crypto';
import { notifyPipelineStart, notifyPipelineEnd, notifyCheckpoint } from '../_squad-ai/core/connector.slack.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4200;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Caminhos padrão
const GLOBAL_CONFIG_DIR = path.join(__dirname, '..', '_squad-ai', 'config');
const WORKSPACES_FILE = path.join(GLOBAL_CONFIG_DIR, 'workspaces.json');
const SECRETS_FILE = path.join(GLOBAL_CONFIG_DIR, 'secrets.enc.json');

// Chave secreta interna para criptografia simples
const SECRET_KEY = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'squad-ai-default-key-32-chars-long!', 'salt', 32);
const IV_LENGTH = 16;

// Funções auxiliares para Workspaces
function getWorkspacesConfig() {
  try {
    if (fs.existsSync(WORKSPACES_FILE)) {
      return JSON.parse(fs.readFileSync(WORKSPACES_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Erro ao ler workspaces.json:', e);
  }
  return {
    activeWorkspace: 'default',
    workspaces: [{
      id: 'default',
      name: 'Infraestrutura Principal',
      path: path.resolve(path.join(__dirname, '..')),
      description: 'Workspace padrão para orquestração de infraestrutura de alta performance'
    }]
  };
}

function saveWorkspacesConfig(config) {
  try {
    if (!fs.existsSync(GLOBAL_CONFIG_DIR)) {
      fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(WORKSPACES_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {
    console.error('Erro ao salvar workspaces.json:', e);
  }
}

function getActiveWorkspacePath() {
  const config = getWorkspacesConfig();
  const active = config.workspaces.find(w => w.id === config.activeWorkspace);
  return active ? active.path : path.resolve(path.join(__dirname, '..'));
}

// Criptografia de segredos
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', SECRET_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return '';
  }
}

// APIs para gerenciamento de Workspaces
app.get('/api/workspaces', (req, res) => {
  res.json(getWorkspacesConfig());
});

app.post('/api/workspaces/select', (req, res) => {
  const { id } = req.body;
  const config = getWorkspacesConfig();
  const exists = config.workspaces.some(w => w.id === id);
  
  if (!exists) {
    return res.status(404).json({ error: 'Workspace não encontrado' });
  }

  config.activeWorkspace = id;
  saveWorkspacesConfig(config);
  
  // Reinicializa o watcher para o novo workspace
  setupStateWatcher();
  
  res.json({ success: true, activeWorkspace: id });
});

app.post('/api/workspaces/add', (req, res) => {
  const { name, path: wsPath, description } = req.body;
  if (!name || !wsPath) {
    return res.status(400).json({ error: 'Nome e caminho do workspace são obrigatórios' });
  }

  const normalizedPath = path.resolve(wsPath).replace(/\\/g, '/');
  const config = getWorkspacesConfig();
  const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');

  if (config.workspaces.some(w => w.id === id)) {
    return res.status(400).json({ error: 'Workspace com este nome já existe' });
  }

  config.workspaces.push({
    id,
    name,
    path: normalizedPath,
    description: description || ''
  });

  saveWorkspacesConfig(config);
  res.json({ success: true, workspace: { id, name, path: normalizedPath, description } });
});

// APIs para Squads do Workspace ativo
app.get('/api/squads', (req, res) => {
  const wsPath = getActiveWorkspacePath();
  const squadsDir = path.join(wsPath, 'squads');
  
  try {
    if (!fs.existsSync(squadsDir)) {
      return res.json([]);
    }

    const squads = fs.readdirSync(squadsDir)
      .filter(file => fs.statSync(path.join(squadsDir, file)).isDirectory())
      .map(dir => {
        const squadYamlPath = path.join(squadsDir, dir, 'squad.yaml');
        const stateJsonPath = path.join(squadsDir, dir, 'state.json');
        
        let squadInfo = { name: dir, status: 'idle' };
        if (fs.existsSync(stateJsonPath)) {
          try {
            squadInfo = { name: dir, ...JSON.parse(fs.readFileSync(stateJsonPath, 'utf8')) };
          } catch (e) {
            console.error(`Erro ao decodificar state.json da squad ${dir}:`, e);
          }
        }
        return squadInfo;
      });

    res.json(squads);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao listar squads', details: e.message });
  }
});

// APIs para obter relatórios/outputs de estágios
app.get('/api/squads/:squadName/reports/:stageId', (req, res) => {
  const { squadName, stageId } = req.params;
  const wsPath = getActiveWorkspacePath();
  const outputDir = path.join(wsPath, 'squads', squadName, 'output');

  try {
    if (!fs.existsSync(outputDir)) {
      return res.status(404).json({ error: 'Pasta de outputs não encontrada' });
    }

    // Procura por arquivos com formato {prefix}-{stageId}.md ou {stageId}.md recursivamente
    // priorizando o run_id mais recente
    const findReport = (dir) => {
      const files = fs.readdirSync(dir);
      
      // Ordenar por data de modificação reversa para pegar os mais novos primeiro
      const sortedFiles = files.map(file => {
        const filePath = path.join(dir, file);
        return { name: file, path: filePath, stat: fs.statSync(filePath) };
      }).sort((a, b) => b.stat.mtime - a.stat.mtime);

      for (const file of sortedFiles) {
        if (file.stat.isDirectory()) {
          // Busca recursiva dentro de pastas como v1, v2, run_id, etc.
          const found = findReport(file.path);
          if (found) return found;
        } else if (file.name.endsWith('.md') && file.name.toLowerCase().includes(stageId.toLowerCase())) {
          return fs.readFileSync(file.path, 'utf8');
        }
      }
      return null;
    };

    const reportContent = findReport(outputDir);
    if (reportContent) {
      res.json({ content: reportContent });
    } else {
      res.status(404).json({ error: `Relatório do estágio '${stageId}' não encontrado` });
    }
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar relatório', details: e.message });
  }
});

// APIs para obter agentes de uma squad
app.get('/api/squads/:squadName/agents', (req, res) => {
  const { squadName } = req.params;
  const wsPath = getActiveWorkspacePath();
  const partyCsvPath = path.join(wsPath, 'squads', squadName, 'squad-party.csv');

  try {
    if (!fs.existsSync(partyCsvPath)) {
      return res.json([]);
    }

    const csv = fs.readFileSync(partyCsvPath, 'utf8');
    const lines = csv.trim().split('\n');
    const agents = lines.slice(1).map(line => {
      const [agentPath, displayName, icon] = line.split(',');
      const agentId = path.basename(agentPath, '.agent.md');
      return { id: agentId, name: displayName, icon: icon || '🤖', file: agentPath.trim() };
    });

    res.json(agents);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao listar agentes', details: e.message });
  }
});

// APIs para obter o prompt de um agente
app.get('/api/squads/:squadName/agents/:agentId/prompt', (req, res) => {
  const { squadName, agentId } = req.params;
  const wsPath = getActiveWorkspacePath();
  const agentDir = path.join(wsPath, 'squads', squadName, 'agents');
  const agentFile = fs.readdirSync(agentDir).find(f => f.startsWith(agentId) && f.endsWith('.agent.md'));

  try {
    if (!agentFile) {
      return res.status(404).json({ error: 'Agente não encontrado' });
    }

    const content = fs.readFileSync(path.join(agentDir, agentFile), 'utf8');
    res.json({ content, filename: agentFile });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao ler prompt do agente', details: e.message });
  }
});

// APIs para listar outputs de uma squad
app.get('/api/squads/:squadName/outputs', (req, res) => {
  const { squadName } = req.params;
  const wsPath = getActiveWorkspacePath();
  const squadDir = path.join(wsPath, 'squads', squadName);
  const outputDir = path.join(squadDir, 'output');
  const pipelinePath = path.join(squadDir, 'pipeline', 'pipeline.yaml');

  try {
    const stages = [];

    // Lê o pipeline.yaml para mapear estágios → agentes
    if (fs.existsSync(pipelinePath)) {
      const yaml = fs.readFileSync(pipelinePath, 'utf8');
      const stageBlocks = yaml.split('\n  - id:');
      stageBlocks.shift(); // remove header
      stageBlocks.forEach(block => {
        const idMatch = block.match(/^([^\n]+)/);
        const agentMatch = block.match(/agent:\s*(\S+)/);
        const nameMatch = block.match(/name:\s*(.+)/);
        const outputMatch = block.match(/outputFile:\s*(.+)/);
        if (idMatch) {
          stages.push({
            id: idMatch[1].trim(),
            name: nameMatch ? nameMatch[1].trim() : idMatch[1].trim(),
            agent: agentMatch ? agentMatch[1].trim() : 'unknown',
            outputFile: outputMatch ? outputMatch[1].trim() : null
          });
        }
      });
    }

    // Escaneia outputs existentes
    const outputs = [];
    if (fs.existsSync(outputDir)) {
      const walkDir = (dir, basePath = '') => {
        fs.readdirSync(dir).forEach(file => {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            walkDir(fullPath, path.join(basePath, file));
          } else if (file.endsWith('.md')) {
            const stage = stages.find(s => s.outputFile && s.outputFile.includes(file.replace(/^\d+-/, '').replace('.md', '')));
            outputs.push({
              file: path.join(basePath, file).replace(/\\/g, '/'),
              fullPath: fullPath,
              stage: stage ? stage.id : 'unknown',
              stageName: stage ? stage.name : file.replace('.md', ''),
              agent: stage ? stage.agent : 'unknown',
              modifiedAt: stat.mtime,
              size: stat.size
            });
          }
        });
      };
      walkDir(outputDir);
    }

    // Ordena por data (mais recente primeiro)
    outputs.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));

    res.json({ stages, outputs });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao listar outputs', details: e.message });
  }
});

// APIs para obter conteúdo de um output específico
app.get('/api/squads/:squadName/outputs/read', (req, res) => {
  const { squadName } = req.params;
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ error: 'Parâmetro path é obrigatório' });
  }

  const wsPath = getActiveWorkspacePath();
  const fullPath = path.join(wsPath, 'squads', squadName, 'output', filePath);

  try {
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    res.json({ content, file: filePath });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao ler output', details: e.message });
  }
});

// APIs para gerenciamento de credenciais criptografadas
app.get('/api/secrets', (req, res) => {
  try {
    if (fs.existsSync(SECRETS_FILE)) {
      const encryptedData = JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf8'));
      const decrypted = {};
      for (const [key, val] of Object.entries(encryptedData)) {
        decrypted[key] = '********'; // Não expor os valores descriptografados de volta
      }
      return res.json(decrypted);
    }
  } catch (e) {
    console.error('Erro ao ler segredos:', e);
  }
  res.json({});
});

app.post('/api/secrets', (req, res) => {
  const secrets = req.body;
  try {
    let encryptedData = {};
    if (fs.existsSync(SECRETS_FILE)) {
      encryptedData = JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf8'));
    }

    for (const [key, val] of Object.entries(secrets)) {
      if (val === '********') continue; // Preserva o atual
      if (val === '') {
        delete encryptedData[key];
      } else {
        encryptedData[key] = encrypt(val);
      }
    }

    if (!fs.existsSync(GLOBAL_CONFIG_DIR)) {
      fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(SECRETS_FILE, JSON.stringify(encryptedData, null, 2), 'utf8');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao salvar segredos', details: e.message });
  }
});


// Configuração do Servidor HTTP e WebSocket
const server = app.listen(PORT, 'localhost', () => {
  console.log(`====================================================`);
  console.log(`🚀 SQUAD-AI Dashboard rodando em http://localhost:${PORT}`);
  console.log(`====================================================`);
});

const wss = new WebSocketServer({ server });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`Cliente WebSocket conectado. Clientes ativos: ${clients.size}`);
  
  // Enviar estado atual imediato de todas as squads
  const squadsDir = path.join(getActiveWorkspacePath(), 'squads');
  if (fs.existsSync(squadsDir)) {
    fs.readdirSync(squadsDir)
      .filter(file => fs.statSync(path.join(squadsDir, file)).isDirectory())
      .forEach(dir => {
        const stateJsonPath = path.join(squadsDir, dir, 'state.json');
        if (fs.existsSync(stateJsonPath)) {
          try {
            const state = JSON.parse(fs.readFileSync(stateJsonPath, 'utf8'));
            ws.send(JSON.stringify({ type: 'state', squad: dir, state }));
          } catch (e) {}
        }
      });
  }

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`Cliente WebSocket desconectado. Clientes ativos: ${clients.size}`);
  });
});

function broadcast(data) {
  const payload = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

// Watcher de arquivos de estado das squads
let watcher = null;
const previousStates = {};

function setupStateWatcher() {
  if (watcher) {
    watcher.close();
  }

  const wsPath = getActiveWorkspacePath();
  const watchPath = path.join(wsPath, 'squads', '**', 'state.json').replace(/\\/g, '/');
  console.log(`Iniciando monitoramento de arquivos state.json em: ${watchPath}`);

  watcher = chokidar.watch(watchPath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50
    }
  });

  watcher.on('change', async (filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const state = JSON.parse(content);
      const squadName = path.basename(path.dirname(filePath));
      console.log(`Alteração de estado detectada para a squad: ${squadName}`);
      broadcast({ type: 'state', squad: squadName, state });

      // Processar transições de estado para notificações no Slack
      const prevState = previousStates[squadName];
      if (prevState) {
        if (state.status !== prevState.status) {
          if (state.status === 'running' && prevState.status !== 'running') {
            const agentsList = (state.agents || []).map(a => `${a.icon} ${a.name}`);
            await notifyPipelineStart(squadName, state.step ? state.step.total : 6, agentsList);
          } else if ((state.status === 'done' || state.status === 'error' || state.status === 'veto') && prevState.status === 'running') {
            await notifyPipelineEnd(squadName, state.status);
          }
        }
        
        // Se houver um checkpoint ativo e não havia antes no estado anterior
        if (state.status === 'running' && state.handoff && (!prevState.handoff || prevState.handoff.type !== 'checkpoint')) {
          if (state.handoff.type === 'checkpoint') {
            const activeAgent = (state.agents || []).find(a => a.status === 'working') || { name: 'Tech Lead', icon: '🏛️' };
            await notifyCheckpoint(squadName, state.step ? state.step.label : 'Revisão Técnica', `${activeAgent.icon} ${activeAgent.name}`, state.handoff.message);
          }
        }
      } else {
        // Primeira leitura em execução ativa
        if (state.status === 'running') {
          const agentsList = (state.agents || []).map(a => `${a.icon} ${a.name}`);
          await notifyPipelineStart(squadName, state.step ? state.step.total : 6, agentsList);
        }
      }

      previousStates[squadName] = state;
    } catch (e) {
      console.error(`Erro ao processar modificação de estado em ${filePath}:`, e);
    }
  });
}

// Inicializa o watcher
setupStateWatcher();
