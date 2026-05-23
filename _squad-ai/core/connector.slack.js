import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SECRETS_FILE = path.join(__dirname, '..', 'config', 'secrets.enc.json');
const SECRET_KEY = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'squad-ai-default-key-32-chars-long!', 'salt', 32);

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

function getSlackWebhookUrl() {
  try {
    if (fs.existsSync(SECRETS_FILE)) {
      const encryptedData = JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf8'));
      if (encryptedData.SLACK_WEBHOOK_URL) {
        return decrypt(encryptedData.SLACK_WEBHOOK_URL);
      }
    }
  } catch (e) {
    console.error('Erro ao ler webhook do Slack:', e);
  }
  return process.env.SLACK_WEBHOOK_URL || '';
}

export async function sendSlackMessage(payload) {
  const webhookUrl = getSlackWebhookUrl();
  if (!webhookUrl) {
    console.log('[SLACK-CONNECTOR] Nenhum webhook do Slack configurado. Ignorando envio.');
    return false;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (e) {
    console.error('[SLACK-CONNECTOR] Falha ao enviar mensagem para o Slack:', e);
    return false;
  }
}

export async function notifyPipelineStart(squadName, stepsCount, agentsList) {
  const blocks = {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🚀 *Nova Execução de Squad iniciada!* \n*Squad:* \`squads/${squadName}\` \n*Pipeline:* ${stepsCount} passos sequenciais.`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `🤖 *Agentes Ativos:* ${agentsList.join(', ')}`
          }
        ]
      }
    ]
  };
  return sendSlackMessage(blocks);
}

export async function notifyCheckpoint(squadName, stepName, agentName, description) {
  const blocks = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🛑 Checkpoint Requerido: ${stepName}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Squad:* \`squads/${squadName}\` \n*Agente:* ${agentName} \n*Ação Requerida:* Aprovação técnica manual necessária para prosseguir.`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `> *Resumo do Trabalho:* \n> ${description || 'Sem detalhes fornecidos.'}`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Aprovar Execução'
            },
            style: 'primary',
            value: `approve_${squadName}`,
            action_id: 'approve_checkpoint'
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Abortar'
            },
            style: 'danger',
            value: `abort_${squadName}`,
            action_id: 'abort_checkpoint'
          }
        ]
      }
    ]
  };
  return sendSlackMessage(blocks);
}

export async function notifyPipelineEnd(squadName, status) {
  const color = status === 'done' ? '🟢' : '🔴';
  const text = status === 'done' 
    ? `${color} *Pipeline concluído com sucesso!*` 
    : `${color} *Pipeline interrompido ou falhou.*`;

  const blocks = {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${text}\n*Squad:* \`squads/${squadName}\`\n*Status Final:* \`${status.toUpperCase()}\``
        }
      }
    ]
  };
  return sendSlackMessage(blocks);
}
