import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useWizard } from '@/contexts/WizardContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatBrazilianDate, formatBrazilianDateExtended } from '@/lib/date-utils';
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
    resetWizard,
    attendanceRecords,
    isEditingExistingRecords
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
  
  // Formatar data com o utilitário que ajusta para o fuso horário do Brasil
  const formattedDate = formatBrazilianDate(wizardDate.toISOString());
  const studentsPresent = getStudentsPresentCount();
  const studentsAbsent = getStudentsAbsentCount();
  
  // Mapeamento das atividades missionárias
  const activityLabels: Record<string, string> = {
    qtdContatosMissionarios: 'Contatos Missionários',
    literaturasDistribuidas: 'Literaturas Distribuídas',
    visitasMissionarias: 'Visitas Missionárias',
    estudosBiblicos: 'Estudos Bíblicos Ministrados',
    pessoasAuxiliadas: 'Pessoas Auxiliadas',
    pessoasTrazidasIgreja: 'Pessoas Trazidas à Igreja',
    visitantes: 'Visitantes'
  };
  
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
          <h4 className="font-medium text-gray-800 mb-3">Resumo do Registro</h4>
          
          {/* Presença de alunos */}
          <div className="mb-3">
            <h5 className="text-sm font-medium text-gray-700 mb-1 text-left">Presença de Alunos</h5>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-left text-gray-500">Alunos presentes:</div>
              <div className="text-right font-medium text-gray-800">{studentsPresent}</div>
              
              <div className="text-left text-gray-500">Alunos ausentes:</div>
              <div className="text-right font-medium text-gray-800">{studentsAbsent}</div>
              
              <div className="text-left text-gray-500">Visitantes:</div>
              <div className="text-right font-medium text-gray-800">{missionaryActivities.visitantes || 0}</div>
            </div>
          </div>
          
          {/* Atividades missionárias */}
          <div className="mb-3">
            <h5 className="text-sm font-medium text-gray-700 mb-1 text-left">Atividades Missionárias</h5>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(activityLabels)
                .filter(([key]) => key !== 'visitantes')
                .map(([key, label]) => {
                // Obter o valor da atividade, tratando nulos como zero
                const value = missionaryActivities[key as keyof typeof missionaryActivities] || 0;
                
                return (
                  <React.Fragment key={key}>
                    <div className="text-left text-gray-500">{label}:</div>
                    <div className="text-right font-medium text-gray-800">{value}</div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          
          {/* Data do registro */}
          <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-gray-200">
            <div className="text-left text-gray-500">Data do registro:</div>
            <div className="text-right font-medium text-gray-800">{formattedDate}</div>
          </div>
        </div>
        
        <div className="flex justify-center">
          <Button 
            variant="default" 
            className="px-8"
            onClick={() => setLocation('/classes')}
          >
            VOLTAR
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default CompletionStep;
