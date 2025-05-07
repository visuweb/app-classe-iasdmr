import { addDays, format, parse, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Função utilitária para corrigir o problema do fuso horário em todas as datas vindas do banco de dados.
 * Adiciona 1 dia à data para compensar a diferença de fuso horário entre UTC e Brasília (UTC-3)
 * 
 * @param dateStr String de data no formato ISO ou 'yyyy-MM-dd'
 * @returns String de data no formato 'yyyy-MM-dd'
 */
export function adjustDateToBRT(dateStr: string): string {
  // Cria uma data a partir da string
  const date = new Date(dateStr);
  // Adiciona um dia para compensar a diferença de fuso horário
  const correctedDate = addDays(date, 1);
  return format(correctedDate, 'yyyy-MM-dd');
}

/**
 * Função para formatar a data no padrão brasileiro
 * 
 * @param dateStr String de data a ser formatada
 * @param formatStr Formato desejado (ex: 'dd/MM/yyyy')
 * @returns String com a data formatada
 */
export function formatBrazilianDate(dateStr: string, formatStr: string = 'dd/MM/yyyy'): string {
  // Primeiro ajusta para o fuso horário correto
  const correctedDateStr = adjustDateToBRT(dateStr);
  // Depois formata
  const date = parseISO(correctedDateStr);
  return format(date, formatStr, { locale: ptBR });
}

/**
 * Função para formatar a data no padrão brasileiro por extenso
 * 
 * @param dateStr String de data a ser formatada
 * @returns String com a data formatada por extenso (ex: "07 de maio de 2025")
 */
export function formatBrazilianDateExtended(dateStr: string): string {
  // Primeiro ajusta para o fuso horário correto
  const correctedDateStr = adjustDateToBRT(dateStr);
  // Depois formata
  const date = parseISO(correctedDateStr);
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

/**
 * Obter a data atual no formato 'yyyy-MM-dd' no fuso horário de Brasília
 * 
 * @returns String de data no formato 'yyyy-MM-dd'
 */
export function getCurrentDateBRT(): string {
  const now = new Date();
  // Já ajusta automaticamente para o fuso horário de Brasília
  return format(now, 'yyyy-MM-dd');
}