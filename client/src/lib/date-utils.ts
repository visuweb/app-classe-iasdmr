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
 * Obter a data atual no formato 'yyyy-MM-dd' no fuso horário de Brasília (UTC-3)
 * Garante que a data esteja correta para o horário de Brasília, independentemente do fuso do servidor
 * 
 * @returns String de data no formato 'yyyy-MM-dd'
 */
export function getCurrentDateBRT(): string {
  // Criar data atual
  const now = new Date();
  
  // Obter o offset atual do servidor em minutos
  const serverOffset = now.getTimezoneOffset();
  
  // Offset de Brasília é UTC-3, ou seja, -180 minutos
  const brazilOffset = -180;
  
  // Calcular a diferença de offset em milissegundos
  const offsetDiff = (serverOffset - brazilOffset) * 60 * 1000;
  
  // Ajustar a data para o fuso de Brasília
  const brazilTime = new Date(now.getTime() + offsetDiff);
  
  // Formatar no padrão ISO (yyyy-MM-dd)
  return format(brazilTime, 'yyyy-MM-dd');
}