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
  
  // Calculator state
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorExpression, setCalculatorExpression] = useState('');
  const [calculatorResult, setCalculatorResult] = useState('0');
  const [calculatorTarget, setCalculatorTarget] = useState<MissionaryActivityType | null>(null);
  
  // Fetch students when class ID changes
  useEffect(() => {
    if (currentClassId) {
      const fetchStudents = async () => {
        try {
          const response = await fetch(`/api/classes/${currentClassId}/students`);
          if (response.ok) {
            const data = await response.json();
            // Filtrar apenas alunos ativos para a chamada
            const activeStudents = data.filter((student: Student) => student.active === true);
            setStudents(activeStudents);
          }
        } catch (error) {
          console.error('Error fetching students:', error);
        }
      };
      
      fetchStudents();
    }
  }, [currentClassId]);
  
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
      // Se há uma expressão de adição que não foi calculada, calcular primeiro
      if (calculatorExpression.includes('+') && !calculatorExpression.includes('=')) {
        // Executar o cálculo como se tivesse pressionado "="
        const parts = calculatorExpression.split('+').filter(part => part.trim() !== '');
        
        // Adicionar o número atual se não estiver na expressão
        if (calculatorResult && calculatorResult !== '0') {
          const lastPartIndex = calculatorExpression.lastIndexOf('+');
          const lastPart = calculatorExpression.substring(lastPartIndex + 1).trim();
          
          if (lastPart !== calculatorResult) {
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
          // Se já houver uma operação de adição, calcular o resultado primeiro
          const parts = calculatorExpression.split('+').filter(part => part.trim() !== '');
          
          // Adicionar o número atual à lista de partes se não estiver vazio
          if (calculatorResult && calculatorResult !== '0') {
            // Não adicionar se já for parte da expressão
            const lastPartIndex = calculatorExpression.lastIndexOf('+');
            const lastPart = calculatorExpression.substring(lastPartIndex + 1).trim();
            
            if (lastPart !== calculatorResult) {
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
        } else {
          // Iniciar nova operação de adição
          setCalculatorExpression(`${calculatorResult} + `);
        }
        break;
        
      case 'equals':
        // Calcular o resultado da operação
        if (calculatorExpression.includes('+')) {
          // Filtrar apenas partes não vazias após split
          const parts = calculatorExpression.split('+').filter(part => part.trim() !== '');
          
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
      
      // Submit attendance records
      for (const [studentId, present] of Object.entries(attendanceRecords)) {
        await apiRequest('POST', '/api/attendance', {
          studentId: parseInt(studentId, 10),
          present,
          date: formattedDate
        });
      }
      
      // Submit missionary activities
      await apiRequest('POST', '/api/missionary-activities', {
        classId: currentClassId,
        date: formattedDate,
        ...missionaryActivities
      });
      
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
