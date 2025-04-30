import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useWizard } from '@/contexts/WizardContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface CompletionStepProps {
  isActive: boolean;
}

const CompletionStep: React.FC<CompletionStepProps> = ({ isActive }) => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { 
    wizardDate,
    getStudentsPresentCount,
    getStudentsAbsentCount,
    missionaryActivities,
    submitWizardData,
    resetWizard
  } = useWizard();
  
  useEffect(() => {
    if (isActive) {
      const saveData = async () => {
        setIsSubmitting(true);
        try {
          await submitWizardData();
        } catch (error) {
          toast({
            title: 'Erro ao salvar dados',
            description: 'Não foi possível salvar os dados do registro.',
            variant: 'destructive',
          });
        } finally {
          setIsSubmitting(false);
        }
      };
      
      saveData();
    }
  }, [isActive]);
  
  if (!isActive) return null;
  
  const formattedDate = format(wizardDate, "dd/MM/yyyy", { locale: ptBR });
  const studentsPresent = getStudentsPresentCount();
  const studentsAbsent = getStudentsAbsentCount();
  const missionaryContacts = missionaryActivities.qtdContatosMissionarios || 0;
  
  const handleViewRecords = () => {
    setLocation('/records');
  };
  
  const handleStartNew = () => {
    resetWizard();
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="animate-fade-in"
    >
      <div className="bg-white shadow rounded-lg p-6 max-w-md mx-auto text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-medium text-gray-900">Registro Concluído!</h3>
          <p className="text-sm text-gray-500 mt-2">Todos os dados foram salvos com sucesso.</p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-800 mb-2">Resumo do Registro</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-left text-gray-500">Alunos presentes:</div>
            <div className="text-right font-medium text-gray-800">{studentsPresent}</div>
            
            <div className="text-left text-gray-500">Alunos ausentes:</div>
            <div className="text-right font-medium text-gray-800">{studentsAbsent}</div>
            
            <div className="text-left text-gray-500">Contatos missionários:</div>
            <div className="text-right font-medium text-gray-800">{missionaryContacts}</div>
            
            <div className="text-left text-gray-500">Data do registro:</div>
            <div className="text-right font-medium text-gray-800">{formattedDate}</div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Button 
            variant="default" 
            className="flex-1"
            onClick={handleViewRecords}
          >
            VER REGISTROS
          </Button>
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleStartNew}
          >
            NOVO REGISTRO
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default CompletionStep;
