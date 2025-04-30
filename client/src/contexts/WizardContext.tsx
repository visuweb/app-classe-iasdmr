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
  
  // Activity methods
  setActivityValue: (activity: MissionaryActivityType, value: number) => void;
  
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
            setStudents(data);
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
  
  // Activity methods
  const setActivityValue = (activity: MissionaryActivityType, value: number) => {
    setMissionaryActivities(prev => ({
      ...prev,
      [activity]: value
    }));
    
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
      const value = parseInt(calculatorResult, 10) || 0;
      setActivityValue(calculatorTarget, value);
    }
    closeCalculator();
  };
  
  const handleCalculatorAction = (action: string, value?: string) => {
    switch (action) {
      case 'number':
        if (calculatorResult === '0' || !calculatorExpression) {
          setCalculatorResult(value || '0');
          setCalculatorExpression(value || '0');
        } else {
          setCalculatorResult(prev => prev + (value || ''));
          setCalculatorExpression(prev => prev + (value || ''));
        }
        break;
        
      case 'add':
        if (calculatorExpression.includes('+')) {
          // If there's already a + operation, calculate the result first
          const parts = calculatorExpression.split('+');
          const result = parts.reduce((sum, num) => sum + parseInt(num.trim(), 10), 0);
          setCalculatorResult(result.toString());
          setCalculatorExpression(`${result} + `);
        } else {
          setCalculatorExpression(`${calculatorResult} + `);
        }
        break;
        
      case 'equals':
        if (calculatorExpression.includes('+')) {
          const parts = calculatorExpression.split('+');
          const result = parts.reduce((sum, num) => {
            const parsed = parseInt(num.trim(), 10);
            return isNaN(parsed) ? sum : sum + parsed;
          }, 0);
          setCalculatorResult(result.toString());
          setCalculatorExpression(`${calculatorExpression} = ${result}`);
        }
        break;
        
      case 'clear':
        setCalculatorResult('0');
        setCalculatorExpression('');
        break;
        
      case 'clearEntry':
        setCalculatorResult('0');
        break;
        
      case 'backspace':
        if (calculatorResult.length > 1) {
          setCalculatorResult(prev => prev.slice(0, -1));
        } else {
          setCalculatorResult('0');
        }
        
        if (calculatorExpression.length > 1) {
          setCalculatorExpression(prev => prev.slice(0, -1));
        } else {
          setCalculatorExpression('');
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
    
    setActivityValue,
    
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
