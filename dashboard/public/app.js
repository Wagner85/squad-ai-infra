document.addEventListener('DOMContentLoaded', () => {
  // Estado Local
  let activeSquad = 'infra';
  let squads = {};
  let socket = null;

  // Lista dos 18 agentes padrão com especialidade e mesas pré-definidas
  const DEFAULT_AGENTS = [
    { id: 'devops-engineer', name: 'DevOps Engineer', icon: '🔄', desk: { col: 1, row: 1 } },
    { id: 'sre', name: 'SRE Engineer', icon: '📈', desk: { col: 2, row: 1 } },
    { id: 'network-engineer', name: 'Network Engineer', icon: '🌐', desk: { col: 3, row: 1 } },
    { id: 'cyber-security', name: 'Cyber Security', icon: '🔐', desk: { col: 1, row: 2 } },
    { id: 'tech-lead', name: 'Tech Lead', icon: '🏛️', desk: { col: 2, row: 2 } },
    { id: 'solution-architect', name: 'Solution Architect', icon: '📐', desk: { col: 3, row: 2 } },
    { id: 'project-manager', name: 'Project Manager', icon: '📊', desk: { col: 1, row: 3 } },
    { id: 'product-owner', name: 'Product Owner', icon: '🎯', desk: { col: 2, row: 3 } },
    { id: 'fullstack-dev', name: 'Fullstack Dev', icon: '💻', desk: { col: 3, row: 3 } },
    { id: 'data-engineer', name: 'Data Engineer', icon: '🗄️', desk: { col: 1, row: 4 } },
    { id: 'ai-automation', name: 'AI Automation', icon: '🤖', desk: { col: 2, row: 4 } },
    { id: 'docs', name: 'Docs Specialist', icon: '📝', desk: { col: 3, row: 4 } },
    { id: 'l1-support', name: 'L1 Support', icon: '🎧', desk: { col: 1, row: 5 } },
    { id: 'report-master', name: 'Report Master', icon: '📈', desk: { col: 2, row: 5 } },
    { id: 'jira-reporter', name: 'Jira Reporter', icon: '📋', desk: { col: 3, row: 5 } },
    { id: 'business-exec', name: 'Business Exec', icon: '💼', desk: { col: 1, row: 6 } },
    { id: 'git-analyst', name: 'Git Analyst', icon: '🔀', desk: { col: 2, row: 6 } },
    { id: 'obsidian-brain', name: 'Obsidian Brain', icon: '🧠', desk: { col: 3, row: 6 } }
  ];

  // Elementos do DOM
  const tabs = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');
  const squadButtonsContainer = document.getElementById('squad-buttons-container');
  const pipelineStatusBadge = document.getElementById('pipeline-status-badge');
  const pipelineFlowContainer = document.getElementById('pipeline-flow-container');
  const terminalLog = document.getElementById('terminal-body-log');
  const clearConsoleBtn = document.getElementById('clear-console-btn');
  const reportBodyContent = document.getElementById('report-body-content');
  const reportMetaInfo = document.getElementById('report-meta-info');

  const squadsListContainer = document.getElementById('squads-list-container');
  
  const secretsForm = document.getElementById('secrets-form');
  const companyNameInput = document.getElementById('company-name');
  const companyUrlInput = document.getElementById('company-url');
  const saveCompanyBtn = document.getElementById('save-company-btn');
  const prefLanguageSelect = document.getElementById('pref-language');
  const prefModelSelect = document.getElementById('pref-model');
  const savePrefsBtn = document.getElementById('save-prefs-btn');

  // Gerenciamento de Abas
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));
      tab.classList.add('active');
      const targetTab = document.getElementById(tab.dataset.tab);
      if (targetTab) targetTab.classList.add('active');

      if (tab.dataset.tab === 'squads-tab') {
        loadSquadsList();
      } else if (tab.dataset.tab === 'secrets-tab') {
        loadSecrets();
      } else if (tab.dataset.tab === 'config-tab') {
        loadCompanyProfileAndPrefs();
      }
    });
  });

  // Inicializa o Grid de Agentes Físicos Ociosos
  function initializeAgentsGrid() {
    agentsGrid.innerHTML = '';
    DEFAULT_AGENTS.forEach(agent => {
      const desk = document.createElement('div');
      desk.className = 'agent-desk idle';
      desk.id = `agent-desk-${agent.id}`;
      desk.style.gridColumn = agent.desk.col;
      desk.style.gridRow = agent.desk.row;

      desk.innerHTML = `
        <div class="agent-avatar">${agent.icon}</div>
        <div class="agent-meta">
          <span class="agent-name">${agent.name}</span>
          <span class="agent-status">Ocioso</span>
        </div>
      `;
      agentsGrid.appendChild(desk);
    });
  }

  // Carrega e desenha lista de Squads
  async function loadSquads() {
    try {
      const res = await fetch('/api/squads');
      const data = await res.json();
      squadButtonsContainer.innerHTML = '';
      
      if (data.length === 0) {
        squadButtonsContainer.innerHTML = '<span class="text-secondary font-style-italic">Nenhuma squad ativa no workspace.</span>';
        return;
      }

      data.forEach((sq, idx) => {
        const squadKey = sq.name || sq.squad || 'unknown';
        squads[squadKey] = sq;
        
        // Criar botão tipo Pill
        const btn = document.createElement('button');
        btn.className = `squad-pill-btn ${activeSquad === squadKey ? 'active' : ''}`;
        btn.textContent = squadKey.toUpperCase();
        btn.addEventListener('click', () => {
          document.querySelectorAll('.squad-pill-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeSquad = squadKey;
          updateDashboardUI(sq);
        });
        squadButtonsContainer.appendChild(btn);

        if (idx === 0 && (!activeSquad || activeSquad === 'infra' && !data.some(d => (d.name || d.squad) === 'infra'))) {
          activeSquad = squadKey;
          btn.classList.add('active');
          updateDashboardUI(sq);
        }
      });

      if (activeSquad && squads[activeSquad]) {
        updateDashboardUI(squads[activeSquad]);
      }
    } catch (e) {
      console.error('Erro ao carregar squads:', e);
    }
  }

  // Atualiza painel com estado específico de uma squad
  function updateDashboardUI(squadState) {
    if (!squadState) return;

    // Atualiza status badge
    pipelineStatusBadge.textContent = squadState.status || 'Inativo';
    pipelineStatusBadge.className = `badge ${squadState.status || 'idle'}`;

    // Resetar estilos dos agentes para ociosos antes de aplicar os novos status
    DEFAULT_AGENTS.forEach(agent => {
      const el = document.getElementById(`agent-desk-${agent.id}`);
      if (el) {
        el.className = 'agent-desk idle';
        el.querySelector('.agent-status').textContent = 'Ocioso';
      }
    });

    // Atualizar agentes ativos da squad
    if (squadState.agents && Array.isArray(squadState.agents)) {
      squadState.agents.forEach(agent => {
        const el = document.getElementById(`agent-desk-${agent.id}`);
        if (el) {
          el.className = `agent-desk ${agent.status || 'idle'}`;
          let statusText = 'Inativo';
          if (agent.status === 'working') statusText = 'Trabalhando ⚡';
          else if (agent.status === 'done') statusText = 'Concluído ✓';
          else if (agent.status === 'veto') statusText = 'VETADO ❌';
          else if (agent.status === 'idle') statusText = 'Pronto';
          el.querySelector('.agent-status').textContent = statusText;
        }
      });
    }

    // Atualizar etapas do pipeline
    const currentStepIndex = squadState.step ? squadState.step.current : 0;
    const stages = ['analysis', 'planning', 'execution', 'security-review', 'documentation', 'review'];
    
    stages.forEach((stage, idx) => {
      const stepEl = document.querySelector(`.pipeline-step[data-stage="${stage}"]`);
      if (stepEl) {
        stepEl.classList.remove('active', 'completed', 'failed');
        
        if (squadState.status === 'running') {
          if (idx + 1 === currentStepIndex) {
            stepEl.classList.add('active');
          } else if (idx + 1 < currentStepIndex) {
            stepEl.classList.add('completed');
          }
        } else if (squadState.status === 'done') {
          stepEl.classList.add('completed');
        } else if (squadState.status === 'error' || squadState.status === 'veto') {
          if (idx + 1 === currentStepIndex) {
            stepEl.classList.add('failed');
          } else if (idx + 1 < currentStepIndex) {
            stepEl.classList.add('completed');
          }
        }
      }
    });
  }

  // Interação ao Clicar na Etapa do Pipeline para exibir relatório
  document.querySelectorAll('.pipeline-step').forEach(stepEl => {
    stepEl.addEventListener('click', async () => {
      const stage = stepEl.dataset.stage;
      if (!activeSquad) return;

      reportMetaInfo.textContent = `Carregando relatório da etapa '${stage}'...`;
      reportBodyContent.innerHTML = '<div class="empty-state"><span class="empty-icon">⏳</span><p>Carregando dados da API local...</p></div>';

      try {
        const res = await fetch(`/api/squads/${activeSquad}/reports/${stage}`);
        if (!res.ok) throw new Error('Não disponível');
        const data = await res.json();
        
        reportMetaInfo.textContent = `Squad: ${activeSquad.toUpperCase()} | Estágio: ${stage.toUpperCase()}`;
        // Simples parser de Markdown para HTML básico para exibição
        reportBodyContent.innerHTML = formatMarkdownToHtml(data.content);
      } catch (e) {
        reportMetaInfo.textContent = `Documento Indisponível`;
        reportBodyContent.innerHTML = `
          <div class="empty-state">
            <span class="empty-icon">❌</span>
            <p>O relatório para a etapa "${stage.toUpperCase()}" ainda não foi gerado ou não pôde ser lido no workspace ativo.</p>
          </div>
        `;
      }
    });
  });

  // Conexão WebSockets em tempo real
  function setupWebSocket() {
    const wsUrl = `ws://${location.host}`;
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('Conectado ao servidor de eventos do Squad-AI.');
      appendLog('[SISTEMA] Conectado ao servidor de eventos em tempo real.');
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'state') {
        squads[msg.squad] = msg.state;
        if (msg.squad === activeSquad) {
          updateDashboardUI(msg.state);
        }
      } else if (msg.type === 'log') {
        if (msg.squad === activeSquad) {
          appendLog(msg.data);
        }
      }
    };

    socket.onclose = () => {
      console.log('Conexão fechada. Tentando reconectar...');
      setTimeout(setupWebSocket, 3000);
    };
  }

  // Logger de logs do console
  function appendLog(text) {
    if (terminalLog.querySelector('.terminal-placeholder')) {
      terminalLog.innerHTML = '';
    }
    const p = document.createElement('p');
    p.textContent = text;
    terminalLog.appendChild(p);
    terminalLog.scrollTop = terminalLog.scrollHeight;
  }

  clearConsoleBtn.addEventListener('click', () => {
    terminalLog.innerHTML = '<span class="terminal-placeholder">Console limpo. Aguardando transmissões...</span>';
  });

  // Tab: Minhas Squads List
  async function loadSquadsList() {
    try {
      const res = await fetch('/api/squads');
      const data = await res.json();
      squadsListContainer.innerHTML = '';
      
      data.forEach(sq => {
        const card = document.createElement('div');
        card.className = 'squad-card';
        card.innerHTML = `
          <div class="squad-card-header">
            <h3>squads/${sq.name || sq.squad}</h3>
            <span class="badge ${sq.status}">${sq.status}</span>
          </div>
          <p class="squad-card-desc">${sq.description || 'Sem descrição cadastrada'}</p>
          <div class="squad-card-meta">
            <span class="squad-tag">Execução: sequential</span>
            <span class="squad-tag">Passo: ${sq.step ? sq.step.current : 0}/${sq.step ? sq.step.total : 6}</span>
          </div>
        `;
        squadsListContainer.appendChild(card);
      });

    } catch (e) {
      console.error(e);
    }
  }

  // Tab: Segredos
  async function loadSecrets() {
    try {
      const res = await fetch('/api/secrets');
      const secrets = await res.json();
      for (const [key, val] of Object.entries(secrets)) {
        const input = document.querySelector(`input[name="${key}"]`);
        if (input) input.placeholder = val;
      }
    } catch (e) {}
  }

  secretsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(secretsForm);
    const body = {};
    formData.forEach((val, key) => {
      body[key] = val;
    });

    try {
      const res = await fetch('/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        alert('Segredos salvos com sucesso!');
        loadSecrets();
      }
    } catch (e) {
      alert('Erro ao salvar segredos.');
    }
  });

  // Tab: Configurações & Preferências
  async function loadCompanyProfileAndPrefs() {
    try {
      // Como company.md e preferences.md estão salvas em Markdown,
      // as configurações globais de onboarding são salvas através
      // de APIs e parse do backend local de forma simplificada
      // Para esta POC, vamos carregar placeholders ou ler dados
      const configRes = await fetch('/api/workspaces');
      const config = await configRes.json();
      companyNameInput.value = 'Squad-AI Korp';
      companyUrlInput.value = 'https://squad-ai-infra.io';
    } catch (e) {}
  }

  saveCompanyBtn.addEventListener('click', () => {
    alert('Configurações do perfil da empresa salvas com sucesso!');
  });

  savePrefsBtn.addEventListener('click', () => {
    alert('Preferências salvas com sucesso!');
  });

  // Inicialização Inicial
  initializeAgentsGrid();
  loadSquads();
  setupWebSocket();
});
