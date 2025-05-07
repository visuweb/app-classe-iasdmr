import React, { useEffect } from 'react';
import { useLocation, useRoute, useLocation as useNavigate } from 'wouter';
import { WizardProvider, useWizard } from '@/contexts/WizardContext';
import AttendanceStep from '@/components/wizard/AttendanceStep';
import MissionaryActivitiesStep from '@/components/wizard/MissionaryActivitiesStep';
import CompletionStep from '@/components/wizard/CompletionStep';
import Calculator from '@/components/Calculator';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeftIcon,
  ArrowRightIcon
} from 'lucide-react';

// Inner component that uses the context
const WizardContent: React.FC = () => {
  const [, params] = useRoute('/wizard');
  const [, setLocation] = useNavigate();
  const { 
    currentStep, 
    totalSteps, 
    goToStep, 
    previousStep, 
    nextStep,
    currentClassId,
    currentClassName,
    setCurrentClassId
  } = useWizard();
  
  // Parse URL parameters
  useEffect(() => {
    const url = new URL(window.location.href);
    const classId = url.searchParams.get('classId');
    const className = url.searchParams.get('className');
    const isEditing = url.searchParams.get('isEditing') === 'true';
    
    if (classId && className) {
      // Configure o modo de edição com base no parâmetro URL
      if (isEditing) {
        // Se estamos editando, indicar isso no contexto
        console.log("Iniciando wizard em modo de edição para registros existentes");
      }
      
      setCurrentClassId(parseInt(classId, 10), decodeURIComponent(className));
    } else {
      // Redirect to class selection if no class is specified
      setLocation('/classes');
    }
  }, []);
  
  // Calculate progress percentage
  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
  
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Step indicator progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-medium text-gray-900">Registro da Classe</h2>
          <span className="text-sm text-gray-500">
            Passo <span>{currentStep}</span> de <span>{totalSteps}</span>
          </span>
        </div>
        <div className="bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-primary-500 h-2.5 rounded-full transition-all duration-500 ease-in-out" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>
      
      {/* Wizard Content Container */}
      <div className="min-h-[calc(100vh-180px)] relative">
        {/* Step components */}
        <AttendanceStep isActive={currentStep === 1} />
        <MissionaryActivitiesStep isActive={currentStep === 2} />
        <CompletionStep isActive={currentStep === 3} />
        
        {/* Calculator modal */}
        <Calculator />
      </div>
      
      {/* Navigation buttons */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={previousStep}
          className={`${currentStep === 1 ? 'invisible' : ''}`}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          VOLTAR
        </Button>
        
        <Button
          onClick={nextStep}
          className={`${currentStep === totalSteps ? 'invisible' : ''}`}
        >
          PULAR
          <ArrowRightIcon className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

// Wrapper component that provides the context
const Wizard: React.FC = () => {
  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  );
};

export default Wizard;
