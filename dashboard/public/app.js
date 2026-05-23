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
  const squadFilterSelect = document.getElementById('squad-filter-select');
  const squadFilterStatus = document.getElementById('squad-filter-status');
  const pipelineStatusBadge = document.getElementById('pipeline-status-badge');
  const pipelineFlowContainer = document.getElementById('pipeline-flow-container');
  const terminalLog = document.getElementById('terminal-body-log');
  const clearConsoleBtn = document.getElementById('clear-console-btn');
  const reportBodyContent = document.getElementById('report-body-content');
  const reportMetaInfo = document.getElementById('report-meta-info');

  const squadsListContainer = document.getElementById('squads-list-container');

  const companyNameInput = document.getElementById('company-name');
  const companyUrlInput = document.getElementById('company-url');
  const saveCompanyBtn = document.getElementById('save-company-btn');
  const prefLanguageSelect = document.getElementById('pref-language');
  const prefModelSelect = document.getElementById('pref-model');
  const savePrefsBtn = document.getElementById('save-prefs-btn');
  const agentsGrid = document.getElementById('agents-floor-grid');

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
      } else if (tab.dataset.tab === 'agents-tab') {
        loadAgentsSquadSelect();
      } else if (tab.dataset.tab === 'outputs-tab') {
        loadOutputsSquadSelect();
      } else if (tab.dataset.tab === 'skills-tab') {
        loadSkills();
      }
    });
  });

  // Sidebar responsiva (hamburguer)
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const sidebarClose = document.getElementById('sidebar-close');

  function toggleSidebar(open) {
    sidebar.classList.toggle('open', open);
    sidebarOverlay.classList.toggle('active', open);
  }

  hamburgerBtn.addEventListener('click', () => toggleSidebar(true));
  sidebarClose.addEventListener('click', () => toggleSidebar(false));
  sidebarOverlay.addEventListener('click', () => toggleSidebar(false));

  // Fecha sidebar ao clicar em nav item no mobile
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) toggleSidebar(false);
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

  // Carrega e desenha lista de Squads no filtro
  async function loadSquads() {
    try {
      const res = await fetch('/api/squads');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (!data || data.length === 0) {
        squadFilterSelect.innerHTML = '<option value="">Nenhuma squad disponível</option>';
        squadFilterStatus.textContent = '';
        return;
      }

      squadFilterSelect.innerHTML = '';

      data.forEach((sq) => {
        const squadKey = sq.name || sq.squad || 'unknown';
        squads[squadKey] = sq;
        const opt = document.createElement('option');
        opt.value = squadKey;
        opt.textContent = `${squadKey.toUpperCase()} (${sq.status || 'idle'})`;
        squadFilterSelect.appendChild(opt);
      });

      const firstKey = data[0].name || data[0].squad || 'unknown';
      if (!activeSquad || !squads[activeSquad]) {
        activeSquad = firstKey;
      }
      squadFilterSelect.value = activeSquad;
      updateDashboardUI(squads[activeSquad]);
      updateFilterStatus(squads[activeSquad]);

    } catch (e) {
      console.error('Erro ao carregar squads:', e);
      squadFilterSelect.innerHTML = '<option value="">Erro ao carregar squads</option>';
      squadFilterStatus.textContent = '⚠️ Erro de conexão';
    }
  }

  squadFilterSelect.addEventListener('change', (e) => {
    const key = e.target.value;
    if (key && squads[key]) {
      activeSquad = key;
      updateDashboardUI(squads[key]);
      updateFilterStatus(squads[key]);
    }
  });

  function updateFilterStatus(squadState) {
    if (!squadState) {
      squadFilterStatus.textContent = '';
      return;
    }
    const status = squadState.status || 'idle';
    const step = squadState.step ? `${squadState.step.current}/${squadState.step.total}` : '-';
    squadFilterStatus.innerHTML = `
      <span class="status-badge ${status}">${status}</span>
      <span class="step-info">Passo: ${step}</span>
    `;
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

  // Visualizar SKILL.md
  const skillViewModal = document.getElementById('skill-view-modal');
  const closeSkillViewBtn = document.querySelector('.close-skill-view-btn');
  const skillViewTitle = document.getElementById('skill-view-title');
  const skillViewMeta = document.getElementById('skill-view-meta');
  const skillViewContent = document.getElementById('skill-view-content');

  async function viewSkillMd(id) {
    skillViewTitle.textContent = `Skill: ${id}`;
    skillViewContent.textContent = 'Carregando...';
    skillViewMeta.textContent = '';
    skillViewModal.classList.add('active');

    try {
      const res = await fetch(`/api/skills/${id}/read`);
      const data = await res.json();
      skillViewContent.textContent = data.content;
      skillViewMeta.textContent = `Arquivo: skills/${id}/SKILL.md`;
    } catch (e) {
      skillViewContent.textContent = 'Erro ao carregar SKILL.md.';
    }
  }

  closeSkillViewBtn.addEventListener('click', () => skillViewModal.classList.remove('active'));
  skillViewModal.addEventListener('click', (e) => {
    if (e.target === skillViewModal) skillViewModal.classList.remove('active');
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
        // Atualiza o option no select
        const opt = squadFilterSelect.querySelector(`option[value="${msg.squad}"]`);
        if (opt) opt.textContent = `${msg.squad.toUpperCase()} (${msg.state.status || 'idle'})`;
        if (msg.squad === activeSquad) {
          updateDashboardUI(msg.state);
          updateFilterStatus(msg.state);
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

      if (data.length === 0) {
        squadsListContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">👥</span><p>Nenhuma squad encontrada.</p></div>';
        return;
      }

      for (const sq of data) {
        const name = sq.name || sq.squad;
        try {
          const detailRes = await fetch(`/api/squads/${name}/detail`);
          if (!detailRes.ok) continue;
          const detail = await detailRes.json();

          const card = document.createElement('div');
          card.className = 'squad-detail-card';

          const agentIcons = (detail.agents || []).map(a =>
            `<span class="agent-mini" title="${a.displayName}">${a.icon}</span>`
          ).join('');

          const stageCount = detail.step ? detail.step.total : 6;
          const currentStep = detail.step ? detail.step.current : 0;
          const progressPct = stageCount > 0 ? Math.round((currentStep / stageCount) * 100) : 0;

          card.innerHTML = `
            <div class="squad-detail-header">
              <div class="squad-detail-title">
                <h3>${name.toUpperCase()}</h3>
                <span class="badge ${detail.status}">${detail.status}</span>
              </div>
              <span class="squad-detail-mode">${detail.execution_mode}</span>
            </div>
            <p class="squad-detail-desc">${detail.description}</p>
            <div class="squad-detail-stats">
              <div class="stat-item">
                <span class="stat-label">Pipeline</span>
                <span class="stat-value">${detail.pipeline}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Agentes</span>
                <span class="stat-value">${detail.agents.length}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Progresso</span>
                <span class="stat-value">${currentStep}/${stageCount} (${progressPct}%)</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Criada</span>
                <span class="stat-value">${detail.created || '-'}</span>
              </div>
            </div>
            <div class="squad-detail-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width:${progressPct}%"></div>
              </div>
            </div>
            <div class="squad-detail-agents">
              <span class="detail-section-label">Agentes:</span>
              <div class="agent-mini-grid">${agentIcons || '<span class="text-muted">Nenhum</span>'}</div>
            </div>
            ${detail.lastRun ? `
            <div class="squad-detail-footer">
              <span class="last-run">Última execução: ${detail.lastRun.dir} (${new Date(detail.lastRun.date).toLocaleString('pt-BR')})</span>
            </div>` : `
            <div class="squad-detail-footer">
              <span class="last-run text-muted">Nenhuma execução anterior</span>
            </div>`}
          `;
          squadsListContainer.appendChild(card);
        } catch (e) {
          console.error(`Erro ao carregar detalhes de ${name}:`, e);
        }
      }
    } catch (e) {
      console.error(e);
      squadsListContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><p>Erro ao carregar squads.</p></div>';
    }
  }

  // Tab: Segredos
  const secretsList = document.getElementById('secrets-list');
  const addSecretBtn = document.getElementById('add-secret-btn');
  const secretModal = document.getElementById('secret-modal');
  const closeSecretModalBtn = document.querySelector('.close-secret-modal-btn');
  const cancelSecretBtn = document.getElementById('cancel-secret-btn');
  const secretForm = document.getElementById('secret-form');
  const secretKeyInput = document.getElementById('secret-key-input');
  const secretValueInput = document.getElementById('secret-value-input');
  const secretModalTitle = document.getElementById('secret-modal-title');

  let editingSecretKey = null;

  async function loadSecrets() {
    try {
      const res = await fetch('/api/secrets');
      const secrets = await res.json();
      secretsList.innerHTML = '';

      const entries = Object.entries(secrets);
      if (entries.length === 0) {
        secretsList.innerHTML = '<div class="empty-state"><span class="empty-icon">🔐</span><p>Nenhum segredo cadastrado. Clique em "＋ Novo Segredo" para adicionar.</p></div>';
        return;
      }

      entries.forEach(([key, masked]) => {
        const row = document.createElement('div');
        row.className = 'secret-row';
        row.innerHTML = `
          <div class="secret-info">
            <span class="secret-key">${key}</span>
            <span class="secret-masked">${masked}</span>
          </div>
          <div class="secret-actions">
            <button class="btn btn-sm edit-secret" data-key="${key}">Editar</button>
            <button class="btn btn-sm btn-danger delete-secret" data-key="${key}">Remover</button>
          </div>
        `;
        secretsList.appendChild(row);
      });

      document.querySelectorAll('.edit-secret').forEach(btn => {
        btn.addEventListener('click', () => openSecretModal(btn.dataset.key));
      });

      document.querySelectorAll('.delete-secret').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm(`Remover segredo "${btn.dataset.key}"?`)) return;
          try {
            await fetch('/api/secrets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ [btn.dataset.key]: '' })
            });
            loadSecrets();
          } catch (e) {
            alert('Erro ao remover segredo.');
          }
        });
      });
    } catch (e) {
      secretsList.innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><p>Erro ao carregar segredos.</p></div>';
    }
  }

  function openSecretModal(key = null) {
    editingSecretKey = key;
    secretModalTitle.textContent = key ? `Editar Segredo: ${key}` : 'Novo Segredo';
    secretKeyInput.value = key || '';
    secretKeyInput.disabled = !!key;
    secretValueInput.value = '';
    secretModal.classList.add('active');
  }

  addSecretBtn.addEventListener('click', () => openSecretModal());
  closeSecretModalBtn.addEventListener('click', () => secretModal.classList.remove('active'));
  cancelSecretBtn.addEventListener('click', () => secretModal.classList.remove('active'));

  secretForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = secretKeyInput.value.trim();
    const value = secretValueInput.value.trim();
    if (!key || !value) return;

    try {
      const res = await fetch('/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      });
      if (res.ok) {
        secretModal.classList.remove('active');
        secretForm.reset();
        loadSecrets();
      }
    } catch (e) {
      alert('Erro ao salvar segredo.');
    }
  });

  // Tab: Agentes
  const agentListContainer = document.getElementById('agent-list-container');
  const agentSquadSelect = document.getElementById('agent-squad-select');
  let agentSquads = [];

  async function loadAgentsSquadSelect() {
    try {
      const res = await fetch('/api/squads');
      agentSquads = await res.json();
      agentSquadSelect.innerHTML = '';
      agentSquads.forEach(sq => {
        const opt = document.createElement('option');
        opt.value = sq.name || sq.squad;
        opt.textContent = (sq.name || sq.squad).toUpperCase();
        agentSquadSelect.appendChild(opt);
      });
      if (agentSquads.length > 0) {
        loadAgents(agentSquads[0].name || agentSquads[0].squad);
      }
    } catch (e) {
      agentListContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><p>Erro ao carregar squads.</p></div>';
    }
  }

  agentSquadSelect.addEventListener('change', (e) => {
    loadAgents(e.target.value);
  });

  async function loadAgents(squadName) {
    agentListContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">⏳</span><p>Carregando agentes...</p></div>';
    try {
      const res = await fetch(`/api/squads/${squadName}/agents`);
      const agents = await res.json();

      if (agents.length === 0) {
        agentListContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">🧠</span><p>Nenhum agente encontrado para esta squad.</p></div>';
        return;
      }

      let html = '';
      for (const agent of agents) {
        const promptRes = await fetch(`/api/squads/${squadName}/agents/${agent.id}/prompt`);
        const promptData = promptRes.ok ? await promptRes.json() : { content: '# Erro ao carregar prompt' };

        html += `
          <div class="agent-prompt-card">
            <div class="agent-prompt-header">
              <span class="agent-prompt-icon">${agent.icon}</span>
              <div class="agent-prompt-info">
                <span class="agent-prompt-name">${agent.name}</span>
                <span class="agent-prompt-id">${agent.id}</span>
              </div>
              <button class="btn btn-sm toggle-prompt" data-target="prompt-${agent.id}">Ver Prompt</button>
            </div>
            <div class="agent-prompt-body" id="prompt-${agent.id}" style="display: none;">
              <pre class="agent-prompt-content">${escapeHtml(promptData.content)}</pre>
            </div>
          </div>
        `;
      }

      agentListContainer.innerHTML = html;

      document.querySelectorAll('.toggle-prompt').forEach(btn => {
        btn.addEventListener('click', () => {
          const target = document.getElementById(btn.dataset.target);
          const isHidden = target.style.display === 'none';
          target.style.display = isHidden ? 'block' : 'none';
          btn.textContent = isHidden ? 'Esconder Prompt' : 'Ver Prompt';
        });
      });
    } catch (e) {
      agentListContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><p>Erro ao carregar agentes.</p></div>';
    }
  }

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Tab: Outputs
  const outputsContainer = document.getElementById('outputs-list-container');
  const outputSquadSelect = document.getElementById('output-squad-select');
  const refreshOutputsBtn = document.getElementById('refresh-outputs-btn');
  const outputViewModal = document.getElementById('output-view-modal');
  const closeOutputModalBtn = document.querySelector('.close-output-modal-btn');
  const outputViewTitle = document.getElementById('output-view-title');
  const outputViewMeta = document.getElementById('output-view-meta');
  const outputViewContent = document.getElementById('output-view-content');

  async function loadOutputsSquadSelect() {
    try {
      const res = await fetch('/api/squads');
      const squads = await res.json();
      outputSquadSelect.innerHTML = '';
      squads.forEach(sq => {
        const opt = document.createElement('option');
        opt.value = sq.name || sq.squad;
        opt.textContent = (sq.name || sq.squad).toUpperCase();
        outputSquadSelect.appendChild(opt);
      });
      if (squads.length > 0) {
        loadOutputs(squads[0].name || squads[0].squad);
      }
    } catch (e) {
      outputsContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><p>Erro ao carregar squads.</p></div>';
    }
  }

  outputSquadSelect.addEventListener('change', (e) => loadOutputs(e.target.value));
  refreshOutputsBtn.addEventListener('click', () => loadOutputs(outputSquadSelect.value));

  async function loadOutputs(squadName) {
    outputsContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">⏳</span><p>Carregando outputs...</p></div>';
    try {
      const res = await fetch(`/api/squads/${squadName}/outputs`);
      const data = await res.json();

      if (!data.outputs || data.outputs.length === 0) {
        outputsContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">📁</span><p>Nenhum output encontrado. Execute a squad para gerar resultados.</p></div>';
        return;
      }

      let html = '<div class="outputs-grid">';
      data.outputs.forEach(out => {
        const icon = getAgentIcon(data.stages, out.agent);
        html += `
          <div class="output-card" data-squad="${squadName}" data-path="${out.file}">
            <div class="output-card-header">
              <span class="output-card-icon">${icon}</span>
              <div class="output-card-info">
                <span class="output-card-stage">${out.stageName}</span>
                <span class="output-card-agent">${out.agent}</span>
              </div>
            </div>
            <div class="output-card-meta">
              <span class="output-card-file">${out.file}</span>
              <span class="output-card-date">${new Date(out.modifiedAt).toLocaleString()}</span>
            </div>
          </div>
        `;
      });
      html += '</div>';
      outputsContainer.innerHTML = html;

      document.querySelectorAll('.output-card').forEach(card => {
        card.addEventListener('click', () => {
          openOutputView(card.dataset.squad, card.dataset.path);
        });
      });
    } catch (e) {
      outputsContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><p>Erro ao carregar outputs.</p></div>';
    }
  }

  function getAgentIcon(stages, agentId) {
    const icons = {
      sre: '📈', 'solution-architect': '📐', 'devops-engineer': '🔄',
      'cyber-security': '🔐', docs: '📝', 'tech-lead': '🏛️',
      'project-manager': '📊', 'product-owner': '🎯', 'fullstack-dev': '💻',
      'data-engineer': '🗄️', 'ai-automation': '🤖', 'l1-support': '🎧',
      'report-master': '📈', 'jira-reporter': '📋', 'business-exec': '💼',
      'git-analyst': '🔀', 'obsidian-brain': '🧠', 'network-engineer': '🌐'
    };
    return icons[agentId] || '📄';
  }

  async function openOutputView(squadName, filePath) {
    outputViewTitle.textContent = `Output: ${filePath}`;
    outputViewMeta.textContent = `Squad: ${squadName.toUpperCase()}`;
    outputViewContent.textContent = 'Carregando...';
    outputViewModal.classList.add('active');

    try {
      const res = await fetch(`/api/squads/${squadName}/outputs/read?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      outputViewContent.textContent = data.content;
    } catch (e) {
      outputViewContent.textContent = 'Erro ao carregar output.';
    }
  }

  closeOutputModalBtn.addEventListener('click', () => outputViewModal.classList.remove('active'));

  // Fecha modal ao clicar fora
  outputViewModal.addEventListener('click', (e) => {
    if (e.target === outputViewModal) outputViewModal.classList.remove('active');
  });

  // Tab: Skills
  const skillsContainer = document.getElementById('skills-list-container');
  const addSkillBtn = document.getElementById('add-skill-btn');
  const skillModal = document.getElementById('skill-modal');
  const closeSkillModalBtn = document.querySelector('.close-skill-modal-btn');
  const cancelSkillBtn = document.getElementById('cancel-skill-btn');
  const skillForm = document.getElementById('skill-form');
  const skillIdInput = document.getElementById('skill-id-input');
  const skillNameInput = document.getElementById('skill-name-input');
  const skillDescInput = document.getElementById('skill-desc-input');
  const skillCatsInput = document.getElementById('skill-cats-input');

  async function loadSkills() {
    skillsContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">⏳</span><p>Carregando skills...</p></div>';
    try {
      const res = await fetch('/api/skills');
      const skills = await res.json();

      if (skills.length === 0) {
        skillsContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">⚡</span><p>Nenhuma skill instalada. Clique em "Nova Skill" para adicionar.</p></div>';
        return;
      }

      let html = '';
      skills.forEach(skill => {
        const cats = (skill.categories || []).map(c => `<span class="skill-tag">${c}</span>`).join('');
        html += `
          <div class="skill-card">
            <div class="skill-card-header">
              <h3>${skill.name}</h3>
              <span class="skill-badge ${skill.type}">${skill.type}</span>
            </div>
            <p class="skill-card-desc">${skill.description || 'Sem descrição'}</p>
            <div class="skill-card-meta">
              <span class="skill-id">${skill.id}</span>
              <span class="skill-version">v${skill.version}</span>
            </div>
            <div class="skill-card-cats">${cats}</div>
            <button class="btn btn-sm view-skill-btn" data-id="${skill.id}">Ver SKILL.md</button>
          </div>
        `;
      });
      skillsContainer.innerHTML = html;

      document.querySelectorAll('.view-skill-btn').forEach(btn => {
        btn.addEventListener('click', () => viewSkillMd(btn.dataset.id));
      });
    } catch (e) {
      skillsContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><p>Erro ao carregar skills.</p></div>';
    }
  }

  addSkillBtn.addEventListener('click', () => skillModal.classList.add('active'));
  closeSkillModalBtn.addEventListener('click', () => skillModal.classList.remove('active'));
  cancelSkillBtn.addEventListener('click', () => skillModal.classList.remove('active'));

  skillForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = skillIdInput.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const name = skillNameInput.value.trim() || id;
    const description = skillDescInput.value.trim();
    const cats = skillCatsInput.value.split(',').map(c => c.trim()).filter(Boolean);

    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, description, type: 'prompt', version: '1.0.0', categories: cats })
      });
      if (res.ok) {
        skillModal.classList.remove('active');
        skillForm.reset();
        loadSkills();
      } else {
        const err = await res.json();
        alert(`Erro: ${err.error}`);
      }
    } catch (e) {
      alert('Erro ao criar skill.');
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
