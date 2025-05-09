import { addDays, format, parse, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Verifica se uma data está dentro de um trimestre específico
 * 
 * @param dateStr String de data no formato ISO ou 'yyyy-MM-dd'
 * @param trimester Número do trimestre (1, 2, 3 ou 4)
 * @returns Boolean indicando se a data está no trimestre especificado
 */
export function isDateInTrimester(dateStr: string | null | undefined, trimester: string): boolean {
  if (!dateStr) return false;
  
  try {
    // Primeiro ajusta para o fuso horário correto
    const correctedDateStr = adjustDateToBRT(dateStr);
    const date = parseISO(correctedDateStr);
    const month = date.getMonth() + 1; // Os meses em JS são 0-indexed
    
    switch (trimester) {
      case "1": // 1º Trimestre (Janeiro-Março)
        return month >= 1 && month <= 3;
      case "2": // 2º Trimestre (Abril-Junho)
        return month >= 4 && month <= 6;
      case "3": // 3º Trimestre (Julho-Setembro)
        return month >= 7 && month <= 9;
      case "4": // 4º Trimestre (Outubro-Dezembro)
        return month >= 10 && month <= 12;
      default:
        return false;
    }
  } catch (error) {
    console.error('Erro ao verificar trimestre:', error);
    return false;
  }
}

/**
 * Função utilitária para processar corretamente datas vindas do banco de dados.
 * Ajusta a data para garantir que ela seja exibida corretamente no fuso horário de Brasília (UTC-3).
 * 
 * @param dateStr String de data no formato ISO ou 'yyyy-MM-dd'
 * @returns String de data no formato 'yyyy-MM-dd'
 */
export function adjustDateToBRT(dateStr: string | null | undefined): string {
  // Se for nulo ou indefinido, retorna string vazia
  if (!dateStr) {
    return '';
  }
  
  // Se a data já estiver no formato yyyy-MM-dd sem parte de hora, ela já está correta
  if (typeof dateStr === 'string' && dateStr.length === 10 && dateStr.includes('-')) {
    return dateStr;
  }
  
  // Para datas com timestamp (formato ISO), extraímos apenas a parte da data
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  
  // Para outros formatos, interpretamos a data e retornamos apenas yyyy-MM-dd
  try {
    const date = new Date(dateStr);
    return format(date, 'yyyy-MM-dd');
  } catch (e) {
    console.error('Erro ao processar data:', e);
    return dateStr; // Em caso de erro, retorna a string original
  }
}

/**
 * Função para formatar a data no padrão brasileiro
 * 
 * @param dateStr String de data a ser formatada
 * @param formatStr Formato desejado (ex: 'dd/MM/yyyy')
 * @returns String com a data formatada
 */
export function formatBrazilianDate(dateStr: string | null | undefined, formatStr: string = 'dd/MM/yyyy'): string {
  // Verificar se a data é válida
  if (!dateStr) {
    return '';
  }
  
  try {
    // Primeiro ajusta para o fuso horário correto
    const correctedDateStr = adjustDateToBRT(dateStr);
    // Depois formata
    const date = parseISO(correctedDateStr);
    return format(date, formatStr, { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return dateStr; // Em caso de erro, retorna a string original
  }
}

/**
 * Função para formatar a data no padrão brasileiro por extenso
 * 
 * @param dateStr String de data a ser formatada
 * @returns String com a data formatada por extenso (ex: "07 de maio de 2025")
 */
export function formatBrazilianDateExtended(dateStr: string | null | undefined): string {
  // Verificar se a data é válida
  if (!dateStr) {
    return '';
  }
  
  try {
    // Primeiro ajusta para o fuso horário correto
    const correctedDateStr = adjustDateToBRT(dateStr);
    // Depois formata
    const date = parseISO(correctedDateStr);
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data estendida:', error);
    return dateStr; // Em caso de erro, retorna a string original
  }
}

/**
 * Obter a data atual no formato 'yyyy-MM-dd' no fuso horário de Brasília (UTC-3)
 * Garante que a data esteja correta para o horário de Brasília, independentemente do fuso do servidor
 * 
 * @returns String de data no formato 'yyyy-MM-dd'
 */
export function getCurrentDateBRT(): string {
  // Abordagem mais robusta usando bibliotecas de fuso horário
  // Obter a data atual em UTC
  const now = new Date();
  
  // Criar uma string de data com o timezone explícito de Brasília (UTC-3)
  // Primeiro, pegamos ano, mês e dia
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  
  // Construir uma nova data usando componentes UTC, mas interpretando-os como hora local
  // (que é o que o banco de dados espera)
  const brazilDate = new Date(Date.UTC(year, month, day));
  
  // Devido ao comportamento do banco de dados PostgreSQL com timezones,
  // precisamos usar a data UTC diretamente, pois o servidor já vai aplicar
  // a conversão ao armazenar. Isso evita o problema de dupla conversão.
  return format(brazilDate, 'yyyy-MM-dd');
}

/**
 * Função auxiliar para extrair a parte da data (yyyy-MM-dd) de um campo recordDate 
 * que pode vir em diferentes formatos
 * 
 * @param recordDate Um valor que pode ser string ISO, objeto Date, ou outro formato
 * @param fallbackDate Data de fallback se não for possível extrair a data
 * @returns String de data no formato 'yyyy-MM-dd'
 */
export function extractDateFromRecord(recordDate: any, fallbackDate?: string): string {
  // Se for uma string com formato ISO (com 'T')
  if (typeof recordDate === 'string' && recordDate.includes('T')) {
    return recordDate.split('T')[0];
  }
  
  // Se for uma string de data normal
  if (typeof recordDate === 'string' && !recordDate.includes('T')) {
    try {
      const parsedDate = parseISO(recordDate);
      return format(parsedDate, 'yyyy-MM-dd');
    } catch (e) {
      return fallbackDate || recordDate;
    }
  }
  
  // Se for um objeto Date
  if (recordDate instanceof Date) {
    return format(recordDate, 'yyyy-MM-dd');
  }
  
  // Fallback para o valor atual no formato correto
  return fallbackDate || getCurrentDateBRT();
}