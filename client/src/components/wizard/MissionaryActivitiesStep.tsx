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
    setActivityValue, 
    missionaryActivities,
    openCalculator 
  } = useWizard();
  
  if (!isActive) return null;
  
  const currentActivity = missionaryActivityDefinitions[currentActivityIndex];
  
  const handleContinue = () => {
    if (currentActivity) {
      const activityId = currentActivity.id as MissionaryActivityType;
      const value = missionaryActivities[activityId] || 0;
      setActivityValue(activityId, value);
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
          <h3 className="text-xl font-medium text-gray-900">Atividades Missionárias</h3>
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
              
              <div className="flex space-x-2 mb-4">
                <div className="flex-1">
                  <Input 
                    type="number" 
                    placeholder="Quantidade"
                    min="0"
                    value={missionaryActivities[currentActivity.id as MissionaryActivityType] || 0}
                    onChange={handleInputChange}
                  />
                </div>
                <Button 
                  variant="default" 
                  size="icon"
                  className="bg-yellow-500 hover:bg-yellow-600"
                  onClick={handleOpenCalculator}
                >
                  <Calculator className="h-5 w-5" />
                </Button>
              </div>
              
              <Button 
                variant="default" 
                className="w-full"
                onClick={handleContinue}
              >
                CONTINUAR
              </Button>
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
