import React from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface AttendanceStepProps {
  isActive: boolean;
}

const AttendanceStep: React.FC<AttendanceStepProps> = ({ isActive }) => {
  const { 
    students, 
    currentStudentIndex, 
    markStudentAttendance, 
    goToPreviousStudent,
    wizardDate,
    attendanceRecords
  } = useWizard();
  
  if (!isActive) return null;
  
  const currentStudent = students[currentStudentIndex];
  const formattedDate = format(wizardDate, "dd 'de' MMMM, yyyy", { locale: ptBR });
  
  const handleMarkPresent = () => {
    if (currentStudent) {
      markStudentAttendance(currentStudent.id, true);
    }
  };
  
  const handleMarkAbsent = () => {
    if (currentStudent) {
      markStudentAttendance(currentStudent.id, false);
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
          <span className="material-icons text-4xl text-primary-500 mb-2">fact_check</span>
          <h3 className="text-xl font-medium text-gray-900">
            Lista de Chamada
            {Object.keys(attendanceRecords).length > 0 && 
              <span className="text-orange-500 ml-1 text-sm">(editando...)</span>
            }
          </h3>
          <p className="text-sm text-gray-500 mt-1">Registre a presença dos alunos</p>
        </div>

        {/* Student card for attendance */}
        <AnimatePresence mode="wait">
          {currentStudent ? (
            <motion.div
              key={currentStudent.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 animate-slide-in"
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="font-medium text-gray-800">{currentStudent.name}</h4>
                  <p className="text-xs text-gray-500">{formattedDate}</p>
                </div>
                <span className="text-xs font-medium rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5">
                  {currentStudentIndex + 1}/{students.length}
                </span>
              </div>
              
              <div className="flex space-x-3 mb-3">
                <Button 
                  variant="default" 
                  className={`flex-1 bg-green-600 hover:bg-green-700 ${
                    currentStudent && attendanceRecords[currentStudent.id] === true 
                      ? 'ring-4 ring-green-300' 
                      : ''
                  }`}
                  onClick={handleMarkPresent}
                >
                  <Check className="h-4 w-4 mr-2" />
                  PRESENTE
                </Button>
                <Button 
                  variant="default" 
                  className={`flex-1 bg-red-600 hover:bg-red-700 ${
                    currentStudent && attendanceRecords[currentStudent.id] === false 
                      ? 'ring-4 ring-red-300' 
                      : ''
                  }`}
                  onClick={handleMarkAbsent}
                >
                  <X className="h-4 w-4 mr-2" />
                  AUSENTE
                </Button>
              </div>
              
              {currentStudentIndex > 0 && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={goToPreviousStudent}
                  >
                    VOLTAR
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="text-center p-8">
              <p className="text-gray-500">Não há alunos cadastrados nesta classe.</p>
            </div>
          )}
        </AnimatePresence>

        <div className="text-center text-sm text-gray-500">
          <p>Registre a presença para todos os alunos</p>
        </div>
      </div>
    </motion.div>
  );
};

export default AttendanceStep;
