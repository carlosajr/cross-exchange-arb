import fs from 'fs';
import path from 'path';
import { pct } from './util';

interface OpportunityData {
  timestamp: number;
  date: string;
  symbol: string;
  sellVenue: string;
  buyVenue: string;
  sellPrice: number;
  buyPrice: number;
  spread: number;
  spreadPct: string;
  profitable: boolean;
}

interface MaxSpreadData {
  timestamp: number;
  symbol: string;
  sellVenue: string;
  buyVenue: string;
  sellPrice: number;
  buyPrice: number;
  spread: number;
  spreadPct: string;
  date: string;
}

export class OpportunityLogger {
  private opportunitiesFile: string;
  private maxSpreadFile: string;
  private currentMaxSpread: number = 0;

  constructor() {
    // Criar diretório logs se não existir
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    this.opportunitiesFile = path.join(logsDir, 'opportunities.log');
    this.maxSpreadFile = path.join(logsDir, 'max-spread.log');

    // Carregar o maior spread atual se existir
    this.loadCurrentMaxSpread();
  }

  private loadCurrentMaxSpread() {
    try {
      if (fs.existsSync(this.maxSpreadFile)) {
        const content = fs.readFileSync(this.maxSpreadFile, 'utf8');
        const trimmedContent = content.trim();
        
        // Verificar se o arquivo não está vazio
        if (trimmedContent.length === 0) {
          this.currentMaxSpread = 0;
          return;
        }
        
        const lines = trimmedContent.split('\n');
        if (lines.length > 0) {
          const lastLine = lines[lines.length - 1].trim();
          
          // Verificar se a última linha não está vazia
          if (lastLine.length > 0) {
            const data = JSON.parse(lastLine) as MaxSpreadData;
            this.currentMaxSpread = data.spread;
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar maior spread atual:', e);
      this.currentMaxSpread = 0;
    }
  }

  logOpportunity(
    symbol: string,
    sellVenue: string,
    buyVenue: string,
    sellPrice: number,
    buyPrice: number,
    spread: number,
    profitable: boolean
  ) {
    const timestamp = Date.now();
    const spreadPct = pct(spread);

    const opportunityData: OpportunityData = {
      timestamp,
      date: new Date(timestamp).toISOString(),
      symbol,
      sellVenue,
      buyVenue,
      sellPrice,
      buyPrice,
      spread,
      spreadPct,
      profitable
    };

    // Log da oportunidade
    const logLine = JSON.stringify(opportunityData) + '\n';
    fs.appendFileSync(this.opportunitiesFile, logLine);

    if (profitable) {
      console.log(`💰 OPORTUNIDADE LUCRATIVA: ${spreadPct} (${sellVenue} → ${buyVenue})`);
    }
  }

  // Método para registrar apenas o maior spread (independente de ser lucrativo)
  checkAndLogMaxSpread(
    symbol: string,
    sellVenue: string,
    buyVenue: string,
    sellPrice: number,
    buyPrice: number,
    spread: number
  ) {
    // Verificar se é o maior spread
    if (spread > this.currentMaxSpread) {
      const timestamp = Date.now();
      const spreadPct = pct(spread);
      
      this.currentMaxSpread = spread;
      const maxSpreadData: MaxSpreadData = {
        timestamp,
        symbol,
        sellVenue,
        buyVenue,
        sellPrice,
        buyPrice,
        spread,
        spreadPct,
        date: new Date(timestamp).toISOString()
      };

      const maxLogLine = JSON.stringify(maxSpreadData) + '\n';
      fs.appendFileSync(this.maxSpreadFile, maxLogLine);

      console.log(`🚀 NOVO RECORDE DE SPREAD: ${spreadPct} (${sellVenue} → ${buyVenue})`);
    }
  }

  getCurrentMaxSpread(): number {
    return this.currentMaxSpread;
  }

  getOpportunitiesFilePath(): string {
    return this.opportunitiesFile;
  }

  getMaxSpreadFilePath(): string {
    return this.maxSpreadFile;
  }
}