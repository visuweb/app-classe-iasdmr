import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { 
  Student, 
  AttendanceRecord, 
  MissionaryActivity, 
  MissionaryActivityType, 
  missionaryActivityDefinitions 
} from '@shared/schema';

type WizardContextType = {
  currentStep: number;
  totalSteps: number;
  currentClassId: number | null;
  currentClassName: string;
  students: Student[];
  currentStudentIndex: number;
  attendanceRecords: Record<number, boolean>;
  missionaryActivities: Partial<Record<MissionaryActivityType, number>>;
  currentActivityIndex: number;
  wizardDate: Date;
  isEditingExistingRecords: boolean;
  calculatorOpen: boolean;
  calculatorExpression: string;
  calculatorResult: string;
  calculatorTarget: MissionaryActivityType | null;
  
  // Navigation methods
  goToStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  resetWizard: () => void;
  
  // Class methods
  setCurrentClassId: (id: number, name: string) => void;
  
  // Attendance methods
  markStudentAttendance: (studentId: number, present: boolean) => void;
  goToPreviousStudent: () => void;
  
  // Activity methods
  setActivityValue: (activity: MissionaryActivityType, value: number) => void;
  advanceToNextActivity: () => void;
  setCurrentActivityIndex: (index: number) => void;
  
  // Calculator methods
  openCalculator: (target: MissionaryActivityType) => void;
  closeCalculator: () => void;
  applyCalculatorResult: () => void;
  handleCalculatorAction: (action: string, value?: string) => void;
  
  // Summary data
  getStudentsPresentCount: () => number;
  getStudentsAbsentCount: () => number;
  
  // Submission
  submitWizardData: () => Promise<boolean>;
};

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export const WizardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps] = useState(3);
  const [currentClassId, setClassId] = useState<number | null>(null);
  const [currentClassName, setClassName] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<number, boolean>>({});
  const [missionaryActivities, setMissionaryActivities] = useState<Partial<Record<MissionaryActivityType, number>>>({});
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [wizardDate] = useState<Date>(new Date());
  const [isEditingExistingRecords, setIsEditingExistingRecords] = useState(false);
  
  // Calculator state
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorExpression, setCalculatorExpression] = useState('');
  const [calculatorResult, setCalculatorResult] = useState('0');
  const [calculatorTarget, setCalculatorTarget] = useState<MissionaryActivityType | null>(null);
  
  // Verificar se há registros existentes quando a classe muda
  useEffect(() => {
    if (currentClassId) {
      const fetchStudentsAndRecords = async () => {
        try {
          // Buscar alunos
          const studentsResponse = await fetch(`/api/classes/${currentClassId}/students`);
          if (studentsResponse.ok) {
            const data = await studentsResponse.json();
            // Filtrar apenas alunos ativos para a chamada
            const activeStudents = data.filter((student: Student) => student.active === true);
            setStudents(activeStudents);
          }
          
          // Verificar se estamos editando ou criando novos registros
          // Obter a URL atual para verificar o parâmetro isEditing
          const url = new URL(window.location.href);
          const isEditing = url.searchParams.get('isEditing') === 'true';
          
          if (isEditing) {
            setIsEditingExistingRecords(true);
            console.log("Configurado para modo de edição - carregando registros existentes");
            
            // Primeiro, vamos verificar quais datas têm registros
            const recordsResponse = await fetch(`/api/class-has-recent-records/${currentClassId}`);
            const recordsData = await recordsResponse.json();
            console.log("Verificando datas com registros:", recordsData);
            
            let targetDate = '';
            if (recordsData.hasRecords && recordsData.datesFound && recordsData.datesFound.length > 0) {
              // Usar a primeira data encontrada para carregar os registros
              targetDate = recordsData.datesFound[0];
              console.log(`Encontrada data com registros existentes: ${targetDate}`);
              setWizardDate(new Date(targetDate));
            } else {
              // Se não encontrou registros, usar a data de hoje
              const today = new Date();
              targetDate = today.toISOString().split('T')[0]; // yyyy-mm-dd
            }
            
            if (!targetDate) {
              console.error("Não foi possível determinar uma data para carregar os registros");
              return;
            }
            
            console.log(`Carregando registros para a data: ${targetDate}`);
            
            // Buscar registros de presença
            const attendanceResponse = await fetch(`/api/attendance?classId=${currentClassId}&date=${targetDate}`);
            if (attendanceResponse.ok) {
              const attendanceData = await attendanceResponse.json();
              console.log("Registros de presença existentes:", attendanceData);
              
              // Criar mapa de presença a partir dos registros
              const presenceMap: Record<number, boolean> = {};
              attendanceData.forEach((record: AttendanceRecord) => {
                presenceMap[record.studentId] = record.present;
              });
              
              if (Object.keys(presenceMap).length > 0) {
                console.log("Definindo mapa de presença:", presenceMap);
                setAttendanceRecords(presenceMap);
              } else {
                console.log("Nenhum registro de presença encontrado para edição");
              }
            }
            
            // Buscar atividades missionárias
            const activitiesResponse = await fetch(`/api/missionary-activities?classId=${currentClassId}&date=${targetDate}`);
            if (activitiesResponse.ok) {
              const activitiesData = await activitiesResponse.json();
              
              if (activitiesData.length > 0) {
                console.log("Atividades missionárias existentes:", activitiesData[0]);
                
                // Criar mapa de atividades a partir do registro
                const activityRecord = activitiesData[0];
                const activitiesMap: Partial<Record<MissionaryActivityType, number>> = {};
                
                // Para cada tipo de atividade missionária, tentar obter o valor
                missionaryActivityDefinitions.forEach(def => {
                  const fieldName = def.id;
                  
                  if (activityRecord[fieldName] !== undefined && activityRecord[fieldName] !== null) {
                    activitiesMap[fieldName] = Number(activityRecord[fieldName]);
                  }
                });
                
                if (Object.keys(activitiesMap).length > 0) {
                  console.log("Definindo mapa de atividades:", activitiesMap);
                  setMissionaryActivities(activitiesMap);
                } else {
                  console.log("Nenhuma atividade missionária encontrada para edição");
                }
              }
            }
          } else {
            // Se não estamos editando, resetar os registros
            setIsEditingExistingRecords(false);
            setAttendanceRecords({});
            setMissionaryActivities({});
          }
        } catch (error) {
          console.error('Erro ao buscar alunos e registros:', error);
        }
      };
      
      fetchStudentsAndRecords();
    }
  }, [currentClassId]);
  
  // Verificar se já existe registro para o dia atual desta classe e carregar os dados
  useEffect(() => {
    if (currentClassId) {
      const checkAndLoadTodayRecords = async () => {
        try {
          // Obter a data atual formatada como yyyy-mm-dd
          const formattedDate = format(wizardDate, 'yyyy-MM-dd');
          
          // Verificar registros para o dia atual
          const response = await apiRequest('GET', `/api/check-today-records/${currentClassId}`);
          const data = await response.json();
          
          if (data.hasRecords) {
            console.log('Carregando dados existentes para o dia:', formattedDate);
            setIsEditingExistingRecords(true);
            
            // Carregar registros de presença
            if (data.attendanceRecords && data.attendanceRecords.length > 0) {
              const recordsMap: Record<number, boolean> = {};
              
              // Mapear registros de presença por ID do aluno
              data.attendanceRecords.forEach((record: AttendanceRecord) => {
                recordsMap[record.studentId] = record.present;
              });
              
              // Definir registros de presença
              setAttendanceRecords(recordsMap);
            }
            
            // Carregar atividades missionárias
            if (data.missionaryActivities) {
              console.log("Dados de atividades missionárias recebidos:", data.missionaryActivities);
              
              // Determinar o formato da resposta e extrair corretamente
              let activities: any = data.missionaryActivities;
              
              // Verificar se os dados estão aninhados em um campo missionary_activities
              if (activities.missionary_activities && typeof activities.missionary_activities === 'object') {
                console.log("Formato aninhado detectado, extraindo do campo missionary_activities");
                activities = activities.missionary_activities;
              } else if (Array.isArray(activities) && activities.length > 0) {
                console.log("Formato de array detectado, usando o primeiro elemento");
                activities = activities[0];
              }
              
              console.log("Atividades missionárias preparadas para processamento:", activities);
              
              const activitiesMap: Partial<Record<MissionaryActivityType, number>> = {};
              
              // Extrair todas as chaves disponíveis para debug
              console.log("Chaves disponíveis no objeto de atividades:", Object.keys(activities));
              
              // Mapear cada tipo de atividade
              missionaryActivityDefinitions.forEach(def => {
                const fieldName = def.id;
                console.log(`Processando campo: ${fieldName}`);
                
                // Primeiro verificar se o valor existe diretamente no objeto
                if (activities[fieldName] !== undefined) {
                  const value = parseInt(activities[fieldName], 10);
                  if (!isNaN(value)) {
                    activitiesMap[def.id] = value;
                    console.log(`Valor encontrado diretamente para ${fieldName}: ${value}`);
                  }
                } else {
                  // Tentar várias formatações alternativas da chave
                  const possibleKeys = [
                    fieldName.toLowerCase(),       // qtdcontatosmissionarios
                    fieldName.toUpperCase(),       // QTDCONTATOSMISSIONARIOS
                    fieldName.replace(/([A-Z])/g, '_$1').toLowerCase() // qtd_contatos_missionarios
                  ];
                  
                  // Verificar cada possível formato da chave
                  for (const key of possibleKeys) {
                    if (activities[key] !== undefined) {
                      const value = parseInt(activities[key], 10);
                      if (!isNaN(value)) {
                        activitiesMap[def.id] = value;
                        console.log(`Valor encontrado para ${fieldName}: ${value} (usando chave ${key})`);
                        break;
                      }
                    }
                  }
                }
                
                // Se ainda não encontrou, tentar no escopo superior dos dados
                if (activitiesMap[def.id] === undefined && data.missionaryActivities[fieldName] !== undefined) {
                  const value = parseInt(data.missionaryActivities[fieldName], 10);
                  if (!isNaN(value)) {
                    activitiesMap[def.id] = value;
                    console.log(`Valor encontrado no nível superior para ${fieldName}: ${value}`);
                  }
                }
                
                // Log quando não encontra nenhum valor
                if (activitiesMap[def.id] === undefined) {
                  console.log(`Nenhum valor encontrado para ${fieldName}`);
                }
              });
              
              console.log("Mapa de atividades final:", activitiesMap);
              
              // Definir atividades missionárias se houver valores encontrados
              if (Object.keys(activitiesMap).length > 0) {
                setMissionaryActivities(activitiesMap);
              } else {
                console.error("Nenhum valor de atividade missionária foi extraído corretamente");
                console.log("Tentando extrair do objeto completo como último recurso");
                
                // Tentar procurar em todas as chaves e subchaves recursivamente
                const extractValues = (obj: any, prefix = "") => {
                  for (const key in obj) {
                    if (typeof obj[key] === "object" && obj[key] !== null) {
                      extractValues(obj[key], prefix + key + ".");
                    } else if (typeof obj[key] === "number" || 
                              (typeof obj[key] === "string" && !isNaN(parseInt(obj[key], 10)))) {
                      console.log(`${prefix}${key}: ${obj[key]}`);
                      
                      // Verificar se esta chave corresponde a alguma atividade
                      missionaryActivityDefinitions.forEach(def => {
                        if (key.toLowerCase().includes(def.id.toLowerCase())) {
                          const value = parseInt(obj[key], 10);
                          if (!isNaN(value)) {
                            activitiesMap[def.id] = value;
                            console.log(`Correspondência encontrada para ${def.id}: ${value}`);
                          }
                        }
                      });
                    }
                  }
                };
                
                extractValues(data.missionaryActivities);
                
                if (Object.keys(activitiesMap).length > 0) {
                  console.log("Valores extraídos com sucesso após busca profunda:", activitiesMap);
                  setMissionaryActivities(activitiesMap);
                }
              }
            } else {
              console.log("Nenhum dado de atividade missionária disponível");
            }
          }
        } catch (error) {
          console.error('Erro ao verificar/carregar registros do dia:', error);
        }
      };
      
      checkAndLoadTodayRecords();
    }
  }, [currentClassId, wizardDate]);
  
  // Navigation methods
  const goToStep = (step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
    }
  };
  
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const resetWizard = () => {
    setCurrentStep(1);
    setCurrentStudentIndex(0);
    setAttendanceRecords({});
    setMissionaryActivities({});
    setCurrentActivityIndex(0);
    setIsEditingExistingRecords(false);
  };
  
  // Class methods
  const setCurrentClassId = (id: number, name: string) => {
    setClassId(id);
    setClassName(name);
    resetWizard();
  };
  
  // Attendance methods
  const markStudentAttendance = (studentId: number, present: boolean) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: present
    }));
    
    if (currentStudentIndex < students.length - 1) {
      setCurrentStudentIndex(currentStudentIndex + 1);
    } else {
      // When all students are processed, move to next step
      nextStep();
    }
  };
  
  // Voltar para o aluno anterior
  const goToPreviousStudent = () => {
    if (currentStudentIndex > 0) {
      setCurrentStudentIndex(currentStudentIndex - 1);
    }
  };
  
  // Activity methods
  const setActivityValue = (activity: MissionaryActivityType, value: number) => {
    // Apenas atualiza o valor sem avançar automaticamente
    setMissionaryActivities(prev => ({
      ...prev,
      [activity]: value
    }));
  };
  
  // Método para avançar para a próxima atividade manualmente
  const advanceToNextActivity = () => {
    if (currentActivityIndex < missionaryActivityDefinitions.length - 1) {
      setCurrentActivityIndex(currentActivityIndex + 1);
    } else {
      // When all activities are processed, move to next step
      nextStep();
    }
  };
  
  // Calculator methods
  const openCalculator = (target: MissionaryActivityType) => {
    setCalculatorTarget(target);
    setCalculatorOpen(true);
    // Initialize with current value if exists
    const currentValue = missionaryActivities[target];
    if (currentValue) {
      setCalculatorResult(currentValue.toString());
    } else {
      setCalculatorResult('0');
      setCalculatorExpression('');
    }
  };
  
  const closeCalculator = () => {
    setCalculatorOpen(false);
    setCalculatorTarget(null);
  };
  
  const applyCalculatorResult = () => {
    if (calculatorTarget && calculatorResult) {
      try {
        // Se há uma expressão de adição que não foi calculada, calcular primeiro
        if (calculatorExpression.includes('+') && !calculatorExpression.includes('=')) {
          // Executar o cálculo como se tivesse pressionado "="
          const parts = calculatorExpression.split('+').filter(part => part.trim() !== '');
          
          // Adicionar o número atual se não estiver na expressão
          if (calculatorResult && calculatorResult !== '0') {
            const lastPartIndex = calculatorExpression.lastIndexOf('+');
            if (lastPartIndex >= 0) {
              const lastPart = calculatorExpression.substring(lastPartIndex + 1).trim();
              
              if (lastPart !== calculatorResult) {
                parts.push(calculatorResult);
              }
            } else {
              // Se não encontrou '+', apenas adicione o resultado atual
              parts.push(calculatorResult);
            }
          }
          
          // Somar todas as partes
          const result = parts.reduce((sum, num) => {
            const parsed = parseInt(num.trim(), 10);
            return isNaN(parsed) ? sum : sum + parsed;
          }, 0);
          
          // Usar o resultado calculado
          setActivityValue(calculatorTarget, result);
        } else if (calculatorExpression.includes('=')) {
          // Se já tem um resultado calculado (após '='), usar esse resultado
          const parts = calculatorExpression.split('=');
          const finalResult = parseInt(parts[parts.length - 1].trim(), 10) || 0;
          setActivityValue(calculatorTarget, finalResult);
        } else {
          // Caso contrário, usar o valor atual
          const value = parseInt(calculatorResult, 10) || 0;
          setActivityValue(calculatorTarget, value);
        }
      } catch (error) {
        console.error('Erro ao aplicar resultado da calculadora:', error);
        // Em caso de erro, usar o valor atual como está
        const value = parseInt(calculatorResult, 10) || 0;
        setActivityValue(calculatorTarget, value);
      }
    }
    closeCalculator();
  };
  
  const handleCalculatorAction = (action: string, value?: string) => {
    switch (action) {
      case 'number':
        // Iniciar com o número digitado ou substituir o "0" inicial
        if (calculatorResult === '0' || calculatorResult === '') {
          setCalculatorResult(value || '0');
          setCalculatorExpression(value || '0');
        } else {
          // Se a expressão contém um resultado (após '='), começar nova expressão
          if (calculatorExpression.includes('=')) {
            setCalculatorResult(value || '0');
            setCalculatorExpression(value || '0');
          } else if (calculatorExpression.includes('+')) {
            // Se estamos adicionando o segundo número após o operador +
            setCalculatorResult(value || '0');
            setCalculatorExpression(prev => {
              // Manter a parte antes do operador + e substituir o que vem depois
              const parts = prev.split('+');
              return parts[0] + '+ ' + (value || '0');
            });
          } else {
            // Concatenar dígitos para formar um número maior
            setCalculatorResult(prev => prev + (value || ''));
            setCalculatorExpression(prev => prev + (value || ''));
          }
        }
        break;
        
      case 'add':
        // Se a expressão já tem um resultado (contém '='), usar esse resultado como primeiro número
        if (calculatorExpression.includes('=')) {
          const parts = calculatorExpression.split('=');
          const result = parts[parts.length - 1].trim();
          setCalculatorExpression(`${result} + `);
          break;
        }
        
        // Iniciar a operação de adição ou continuar a somar
        if (calculatorExpression.includes('+')) {
          try {
            // Se já houver uma operação de adição, calcular o resultado primeiro
            const parts = calculatorExpression.split('+').filter(part => part.trim() !== '');
            
            // Adicionar o número atual à lista de partes se não estiver vazio
            if (calculatorResult && calculatorResult !== '0') {
              // Não adicionar se já for parte da expressão
              const lastPartIndex = calculatorExpression.lastIndexOf('+');
              if (lastPartIndex >= 0) {
                const lastPart = calculatorExpression.substring(lastPartIndex + 1).trim();
                
                if (lastPart !== calculatorResult) {
                  parts.push(calculatorResult);
                }
              } else {
                // Se não encontrou '+', apenas adicione o resultado atual
                parts.push(calculatorResult);
              }
            }
            
            // Somar todas as partes como números inteiros
            const result = parts.reduce((sum, num) => {
              const trimmed = num.trim();
              const parsed = parseInt(trimmed, 10);
              return isNaN(parsed) ? sum : sum + parsed;
            }, 0);
            
            setCalculatorResult(result.toString());
            setCalculatorExpression(`${result} + `);
          } catch (error) {
            console.error('Erro na operação de adição:', error);
            // Em caso de erro, simplesmente inicie uma nova operação de adição
            setCalculatorExpression(`${calculatorResult} + `);
          }
        } else {
          // Iniciar nova operação de adição
          setCalculatorExpression(`${calculatorResult} + `);
        }
        break;
        
      case 'equals':
        // Calcular o resultado da operação
        try {
          if (calculatorExpression.includes('+')) {
            // Filtrar apenas partes não vazias após split
            const parts = calculatorExpression.split('+').filter(part => part.trim() !== '');
            
            // Verificar se há valores válidos após o último '+'
            const lastPartIndex = calculatorExpression.lastIndexOf('+');
            if (lastPartIndex >= 0 && lastPartIndex < calculatorExpression.length - 1) {
              const lastPart = calculatorExpression.substring(lastPartIndex + 1).trim();
              if (lastPart !== calculatorResult && calculatorResult !== '0' && calculatorResult !== '') {
                parts.push(calculatorResult);
              }
            }
            
            // Converter cada parte para número e somar
            const result = parts.reduce((sum, num) => {
              // Remover espaços e converter para número inteiro
              const parsed = parseInt(num.trim(), 10);
              // Adicionar apenas se for um número válido
              return isNaN(parsed) ? sum : sum + parsed;
            }, 0);
            
            // Atualizar resultado e expressão
            setCalculatorResult(result.toString());
            setCalculatorExpression(`${calculatorExpression} = ${result}`);
          } else {
            // Se não há operação de adição, apenas manter o valor atual
            setCalculatorExpression(`${calculatorExpression} = ${calculatorResult}`);
          }
        } catch (error) {
          console.error('Erro na operação de igual:', error);
          // Em caso de erro, apenas mostrar o resultado atual
          setCalculatorExpression(`${calculatorResult} = ${calculatorResult}`);
        }
        break;
        
      case 'clear':
        // Limpar tudo
        setCalculatorResult('0');
        setCalculatorExpression('');
        break;
        
      case 'backspace':
        // Apagar último caractere
        if (calculatorResult.length > 1) {
          setCalculatorResult(prev => prev.slice(0, -1));
        } else {
          setCalculatorResult('0');
        }
        
        // Apenas atualize a expressão se não estiver mostrando um resultado
        if (!calculatorExpression.includes('=')) {
          if (calculatorExpression.length > 1) {
            setCalculatorExpression(prev => {
              // Se o último caractere for um operador com espaço, remova 3 caracteres
              const lastThree = prev.slice(-3);
              if (lastThree === ' + ' || lastThree === ' = ') {
                return prev.slice(0, -3);
              }
              return prev.slice(0, -1);
            });
          } else {
            setCalculatorExpression('');
          }
        }
        break;
    }
  };
  
  // Summary data
  const getStudentsPresentCount = (): number => {
    return Object.values(attendanceRecords).filter(present => present).length;
  };
  
  const getStudentsAbsentCount = (): number => {
    return Object.values(attendanceRecords).filter(present => !present).length;
  };
  
  // Submission
  const submitWizardData = async (): Promise<boolean> => {
    if (!currentClassId) return false;
    
    try {
      // Format data for submission
      const formattedDate = format(wizardDate, 'yyyy-MM-dd');
      
      // Log dos valores das atividades missionárias antes da submissão
      console.log('Valores das atividades missionárias antes da submissão:', missionaryActivities);
      
      // Verificar se já existem registros para o dia atual da classe
      const checkResponse = await apiRequest('GET', `/api/check-today-records/${currentClassId}`);
      const checkData = await checkResponse.json();
      const hasExistingRecords = checkData.hasRecords;
      
      // Log para depuração
      console.log('Verificando registros existentes:', hasExistingRecords);
      
      if (hasExistingRecords) {
        console.log('Atualizando registros existentes para o dia:', formattedDate);
        
        // Neste momento, a API não suporta atualizações diretamente (PUT/PATCH)
        // Então vamos excluir os registros antigos e inserir os novos
        // Idealmente, no futuro, isso seria substituído por um endpoint de atualização real
      }
      
      // Se há registros existentes, excluímos antes de criar novos
      if (hasExistingRecords) {
        console.log('Excluindo registros existentes para a data', formattedDate);
        try {
          // O endpoint da API já está configurado para excluir registros antigos no backend
          // quando um novo registro é criado para a mesma classe e data
        } catch (error) {
          console.error('Erro ao excluir registros antigos:', error);
          return false;
        }
      }
      
      // Submit attendance records
      for (const [studentId, present] of Object.entries(attendanceRecords)) {
        await apiRequest('POST', '/api/attendance', {
          studentId: parseInt(studentId, 10),
          present,
          date: formattedDate
        });
      }
      
      // Montar um objeto para as atividades missionárias com todos os campos, mesmo que zerados
      const completeActivities: Record<string, any> = {
        classId: currentClassId,
        date: formattedDate,
      };
      
      // Garantir que todos os campos estejam presentes, preenchendo com 0 se não existirem
      missionaryActivityDefinitions.forEach(def => {
        const fieldName = def.id;
        completeActivities[fieldName] = missionaryActivities[fieldName as MissionaryActivityType] || 0;
      });
      
      console.log('Submetendo atividades missionárias completas:', completeActivities);
      
      // Submit missionary activities
      // A API já está configurada para excluir atividades existentes e criar novas
      const missionaryResponse = await apiRequest('POST', '/api/missionary-activities', completeActivities);
      const missionaryData = await missionaryResponse.json();
      
      console.log('Resposta da submissão de atividades missionárias:', missionaryData);
      
      // Atualizar o estado local com os dados mais recentes do servidor
      if (missionaryData) {
        // Extrair valores das atividades missionárias do servidor para atualizar o estado local
        const serverActivities: Partial<Record<MissionaryActivityType, number>> = {};
        
        missionaryActivityDefinitions.forEach(def => {
          const fieldName = def.id as MissionaryActivityType;
          if (missionaryData[fieldName] !== undefined) {
            const value = parseInt(missionaryData[fieldName], 10);
            if (!isNaN(value)) {
              serverActivities[fieldName] = value;
            }
          }
        });
        
        console.log('Atualizando estado local com valores do servidor:', serverActivities);
        if (Object.keys(serverActivities).length > 0) {
          setMissionaryActivities(prev => ({
            ...prev,
            ...serverActivities
          }));
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error submitting wizard data:', error);
      return false;
    }
  };
  
  const value: WizardContextType = {
    currentStep,
    totalSteps,
    currentClassId,
    currentClassName,
    students,
    currentStudentIndex,
    attendanceRecords,
    missionaryActivities,
    currentActivityIndex,
    wizardDate,
    isEditingExistingRecords,
    calculatorOpen,
    calculatorExpression,
    calculatorResult,
    calculatorTarget,
    
    goToStep,
    nextStep,
    previousStep,
    resetWizard,
    
    setCurrentClassId,
    
    markStudentAttendance,
    goToPreviousStudent,
    
    setActivityValue,
    advanceToNextActivity,
    setCurrentActivityIndex,
    
    openCalculator,
    closeCalculator,
    applyCalculatorResult,
    handleCalculatorAction,
    
    getStudentsPresentCount,
    getStudentsAbsentCount,
    
    submitWizardData
  };
  
  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
};

export const useWizard = () => {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
};
