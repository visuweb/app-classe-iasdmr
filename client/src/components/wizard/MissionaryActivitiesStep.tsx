import React from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  missionaryActivityDefinitions, 
  MissionaryActivityType 
} from '@shared/schema';
import { motion, AnimatePresence } from 'framer-motion';

interface MissionaryActivitiesStepProps {
  isActive: boolean;
}

const MissionaryActivitiesStep: React.FC<MissionaryActivitiesStepProps> = ({ isActive }) => {
  const { 
    currentActivityIndex,
    setCurrentActivityIndex,
    setActivityValue, 
    advanceToNextActivity,
    missionaryActivities,
    openCalculator,
    isEditingExistingRecords,
    previousStep
  } = useWizard();
  
  if (!isActive) return null;
  
  const currentActivity = missionaryActivityDefinitions[currentActivityIndex];
  
  const handleContinue = () => {
    if (currentActivity) {
      // Atualiza o valor atual se necessário
      const activityId = currentActivity.id as MissionaryActivityType;
      const value = missionaryActivities[activityId] || 0;
      setActivityValue(activityId, value);
      
      console.log(`Salvando atividade ${activityId} com valor ${value}`);
      
      // Avança para a próxima atividade manualmente
      advanceToNextActivity();
      
      // Para debug: mostrar valores atuais
      console.log('Valores atuais das atividades:', missionaryActivities);
    }
  };
  
  const handleOpenCalculator = () => {
    if (currentActivity) {
      openCalculator(currentActivity.id as MissionaryActivityType);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentActivity) {
      const value = parseInt(e.target.value, 10) || 0;
      setActivityValue(currentActivity.id as MissionaryActivityType, value);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="animate-fade-in"
    >
      <div className="bg-white shadow rounded-lg p-6 max-w-md mx-auto">
        <div className="text-center mb-6">
          <span className="material-icons text-4xl text-primary-500 mb-2">assignment</span>
          <h3 className="text-xl font-medium text-gray-900">
            Atividades Missionárias
            {isEditingExistingRecords && 
              <span className="text-orange-500 ml-1 text-sm">(editando...)</span>
            }
          </h3>
          <p className="text-sm text-gray-500 mt-1">Registre as atividades da semana</p>
        </div>

        <AnimatePresence mode="wait">
          {currentActivity && (
            <motion.div
              key={currentActivity.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 animate-slide-in"
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="font-medium text-gray-800">{currentActivity.label}</h4>
                  <p className="text-xs text-gray-500">Total da semana</p>
                </div>
                <span className="text-xs font-medium rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5">
                  {currentActivityIndex + 1}/{missionaryActivityDefinitions.length}
                </span>
              </div>
              
              <div className="flex flex-col space-y-3 mb-4">
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <Input 
                      type="number" 
                      placeholder="Quantidade"
                      min="0"
                      value={missionaryActivities[currentActivity.id as MissionaryActivityType] ?? "0"}
                      onChange={handleInputChange}
                      className={`w-full ${
                        isEditingExistingRecords && 
                        missionaryActivities[currentActivity.id as MissionaryActivityType] !== undefined
                          ? 'border-2 border-blue-500 bg-blue-50' 
                          : ''
                      }`}
                    />
                    {isEditingExistingRecords && 
                     missionaryActivities[currentActivity.id as MissionaryActivityType] !== undefined && (
                      <div className="absolute right-3 top-2 text-xs text-blue-600 bg-blue-100 px-1 rounded">
                        Valor salvo
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="default" 
                    size="icon"
                    className="bg-yellow-500 hover:bg-yellow-600"
                    onClick={handleOpenCalculator}
                    title="Abrir calculadora"
                  >
                    <Calculator className="h-5 w-5" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 italic">
                  Dica: Digite diretamente ou use a calculadora para somar valores parciais.
                </p>
              </div>
              
              <div className="flex gap-2">
                {/* Botão VOLTAR - deve voltar para a tela de presença se for a primeira atividade missionária */}
                {currentActivityIndex === 0 ? (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      // Voltar para a última tela de chamada (passo anterior do wizard)
                      previousStep();
                    }}
                  >
                    VOLTAR PARA CHAMADA
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setCurrentActivityIndex(currentActivityIndex - 1)}
                  >
                    VOLTAR
                  </Button>
                )}
                <Button 
                  variant="default" 
                  className="flex-1"
                  onClick={handleContinue}
                >
                  {currentActivityIndex < missionaryActivityDefinitions.length - 1 ? 'PRÓXIMO' : 'FINALIZAR'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center text-sm text-gray-500">
          <p>Use a calculadora para somar valores individuais</p>
        </div>
      </div>
    </motion.div>
  );
};

export default MissionaryActivitiesStep;
