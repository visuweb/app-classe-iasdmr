import React from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

interface VisitorsStepProps {
  isActive: boolean;
}

const VisitorsStep: React.FC<VisitorsStepProps> = ({ isActive }) => {
  const { 
    missionaryActivities,
    setActivityValue,
    previousStep,
    nextStep
  } = useWizard();
  
  if (!isActive) return null;
  
  // Obter o valor atual de visitantes
  const visitorsCount = missionaryActivities.visitantes || 0;
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10) || 0;
    console.log('Atualizando valor de visitantes para:', value);
    setActivityValue('visitantes', value);
  };
  
  const handleBackToAttendance = () => {
    previousStep();
  };
  
  const handleContinueToActivities = () => {
    // Garantir que o valor atual esteja salvo antes de avançar
    const visitorInput = document.getElementById('visitors') as HTMLInputElement;
    const currentValue = visitorInput ? parseInt(visitorInput.value || '0', 10) : 0;
    
    if (currentValue !== visitorsCount) {
      console.log('Atualizando valor final de visitantes para:', currentValue);
      setActivityValue('visitantes', currentValue);
    }
    
    // Log para debug
    console.log('Valor de visitantes salvo no contexto:', missionaryActivities.visitantes);
    
    // Avançar para o próximo passo
    nextStep();
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
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-xl font-medium text-gray-900">
            Registre os Visitantes
          </h3>
          <p className="text-sm text-gray-500 mt-1">Informe a quantidade de visitantes desta semana</p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="mb-4">
            <label htmlFor="visitors" className="block text-sm font-medium text-gray-700 mb-2">
              Quantidade de Visitantes
            </label>
            <Input 
              id="visitors"
              type="number" 
              placeholder="0"
              min="0"
              value={visitorsCount}
              onChange={handleInputChange}
              onFocus={(e) => {
                if (e.target.value === "0") {
                  e.target.value = "";
                }
              }}
              onBlur={(e) => {
                if (e.target.value === "") {
                  e.target.value = "0";
                  setActivityValue('visitantes', 0);
                }
              }}
              className="w-full"
            />
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleBackToAttendance}
            >
              VOLTAR PARA CHAMADA
            </Button>
            <Button 
              variant="default" 
              className="flex-1"
              onClick={handleContinueToActivities}
            >
              PRÓXIMO
            </Button>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Registre a quantidade total de visitantes da semana</p>
        </div>
      </div>
    </motion.div>
  );
};

export default VisitorsStep; 