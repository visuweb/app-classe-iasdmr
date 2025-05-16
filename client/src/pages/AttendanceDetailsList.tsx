import React, { useState } from 'react';
import { formatBrazilianDate } from '@/lib/date-utils';
import { Check, X, Users, ChevronDown, ChevronRight, UserRound } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AttendanceRecord, MissionaryActivity, Class } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface AttendanceDetailsListProps {
  attendanceRecords: (AttendanceRecord & { studentName: string, className: string })[];
  missionaryActivities: MissionaryActivity[];
  classes: Class[];
  selectedClassForReports: number | null;
  selectedDateForReports: string | null;
}

interface StudentDetailsModalProps {
  open: boolean;
  onClose: () => void;
  className: string;
  date: string;
  students: {
    id: string;
    name: string;
    present: boolean;
  }[];
  visitantes: number;
}

const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({ 
  open, 
  onClose, 
  className, 
  date, 
  students,
  visitantes
}) => {
  // Separar alunos presentes e ausentes
  const presentStudents = students.filter(s => s.present);
  const absentStudents = students.filter(s => !s.present);
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{className} - {formatBrazilianDate(date)}</DialogTitle>
          <DialogDescription>
            Detalhes de presença e visitantes
          </DialogDescription>
        </DialogHeader>
        
        {visitantes > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-md flex items-center">
            <Users className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-blue-700 font-medium">
              {visitantes} {visitantes === 1 ? 'visitante' : 'visitantes'} nesta data
            </span>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-green-700 flex items-center">
              <Check className="h-4 w-4 mr-1" />
              Presentes ({presentStudents.length})
            </h3>
            <ScrollArea className="h-[200px] border rounded-md p-2">
              <div className="space-y-2">
                {presentStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum aluno presente</p>
                ) : (
                  presentStudents.map(student => (
                    <div key={student.id} className="flex items-center text-sm p-1 border-b">
                      <Check className="h-3.5 w-3.5 mr-2 text-green-600" />
                      {student.name}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold mb-2 text-red-700 flex items-center">
              <X className="h-4 w-4 mr-1" />
              Ausentes ({absentStudents.length})
            </h3>
            <ScrollArea className="h-[200px] border rounded-md p-2">
              <div className="space-y-2">
                {absentStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum aluno ausente</p>
                ) : (
                  absentStudents.map(student => (
                    <div key={student.id} className="flex items-center text-sm p-1 border-b">
                      <X className="h-3.5 w-3.5 mr-2 text-red-600" />
                      {student.name}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AttendanceDetailsList: React.FC<AttendanceDetailsListProps> = ({
  attendanceRecords,
  missionaryActivities,
  classes,
  selectedClassForReports,
  selectedDateForReports,
}) => {
  // Estado para controlar quais datas estão expandidas
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  // Estado para controlar o modal de detalhes
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<{
    date: string;
    className: string;
    students: { id: string; name: string; present: boolean }[];
    visitantes: number;
  } | null>(null);
  
  // Toggle para expandir/colapsar uma data
  const toggleDate = (date: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };
  
  // Abrir modal de detalhes
  const openDetailsModal = (date: string, className: string, students: { id: string; name: string; present: boolean }[], visitantes: number) => {
    setSelectedDetails({ date, className, students, visitantes });
    setModalOpen(true);
  };
  
  // Fechar modal de detalhes
  const closeDetailsModal = () => {
    setModalOpen(false);
  };
  
  // Agrupar e processar os dados
  const groupedData = React.useMemo(() => {
    // Filtrar os registros de acordo com os filtros selecionados
    const filteredRecords = attendanceRecords.filter(record => {
      let matchesFilters = true;
      
      // Verificar se a classe existe e está ativa
      const classObj = classes.find(c => c.name === record.className);
      const isClassActive = classObj && classObj.active;
      
      if (!isClassActive) return false;
      
      if (selectedClassForReports) {
        // Precisamos comparar pelo nome da classe, já que não temos o classId diretamente
        const selectedClassName = classes.find(c => c.id === selectedClassForReports)?.name;
        matchesFilters = matchesFilters && record.className === selectedClassName;
      }
      if (selectedDateForReports) {
        matchesFilters = matchesFilters && record.date === selectedDateForReports;
      }
      
      return matchesFilters;
    });

    // Organizar dados por data e classe para sumários
    const summaries: Record<string, Record<string, {
      presentCount: number;
      absentCount: number;
      visitorCount: number;
      students: { id: string; name: string; present: boolean }[];
    }>> = {};
    
    // Inicializar estrutura de dados
    filteredRecords.forEach(record => {
      const { date, className } = record;
      
      if (!summaries[date]) {
        summaries[date] = {};
      }
      
      if (!summaries[date][className]) {
        summaries[date][className] = {
          presentCount: 0,
          absentCount: 0,
          visitorCount: 0,
          students: []
        };
      }
      
      // Adicionar contagem e aluno
      if (record.present) {
        summaries[date][className].presentCount++;
      } else {
        summaries[date][className].absentCount++;
      }
      
      summaries[date][className].students.push({
        id: record.id.toString(),
        name: record.studentName,
        present: record.present
      });
    });
    
    // Adicionar contagem de visitantes
    missionaryActivities.forEach(activity => {
      const { date, classId, visitantes = 0 } = activity;
      if (!visitantes) return;
      
      // Encontrar o nome da classe
      const classObj = classes.find(c => c.id === classId);
      if (!classObj || !classObj.active) return;
      
      const className = classObj.name;
      
      // Verificar se temos esta data e classe nos sumários
      if (summaries[date] && summaries[date][className]) {
        summaries[date][className].visitorCount += visitantes;
      }
    });
    
    // Converter estrutura de dados para formato mais adequado para renderização
    const result = Object.entries(summaries).map(([date, classData]) => {
      const classes = Object.entries(classData).map(([className, data]) => ({
        className,
        ...data
      }));
      
      // Calcular totais por data
      const totals = classes.reduce((acc, curr) => ({
        presentCount: acc.presentCount + curr.presentCount,
        absentCount: acc.absentCount + curr.absentCount,
        visitorCount: acc.visitorCount + curr.visitorCount,
        students: []
      }), { presentCount: 0, absentCount: 0, visitorCount: 0, students: [] });
      
      return {
        date,
        classes,
        totals
      };
    });
    
    // Ordenar por data (mais recentes primeiro)
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendanceRecords, missionaryActivities, classes, selectedClassForReports, selectedDateForReports]);
  
  // Se não houver dados, mostrar mensagem
  if (groupedData.length === 0) {
    return (
      <div className="text-center py-4">
        Nenhum registro encontrado com os filtros selecionados.
      </div>
    );
  }
  
  return (
    <>
      <ScrollArea className="h-[400px]">
        <div className="space-y-4 p-1">
          {groupedData.map(({ date, classes: classesData, totals }) => (
            <Card key={date} className="overflow-hidden">
              <CardHeader 
                className="py-3 cursor-pointer hover:bg-muted/30 transition-colors" 
                onClick={() => toggleDate(date)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center">
                    {expandedDates[date] ? (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    )}
                    {formatBrazilianDate(date)}
                  </CardTitle>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-50">
                      <Check className="h-3 w-3" />
                      {totals.presentCount}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1 bg-red-50 text-red-700 hover:bg-red-50">
                      <X className="h-3 w-3" />
                      {totals.absentCount}
                    </Badge>
                    {totals.visitorCount > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-50">
                        <Users className="h-3 w-3" />
                        {totals.visitorCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {expandedDates[date] && (
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[50%]">Classe</TableHead>
                        <TableHead className="text-center">Presentes</TableHead>
                        <TableHead className="text-center">Ausentes</TableHead>
                        <TableHead className="text-center">Visitantes</TableHead>
                        <TableHead className="text-right w-[100px]">Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classesData.map((classInfo) => (
                        <TableRow key={`${date}-${classInfo.className}`}>
                          <TableCell className="font-medium">{classInfo.className}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                {classInfo.presentCount}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Badge variant="outline" className="bg-red-50 text-red-700">
                                {classInfo.absentCount}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Badge variant="outline" className={cn(
                                classInfo.visitorCount > 0 
                                  ? "bg-blue-50 text-blue-700" 
                                  : "bg-gray-50 text-gray-500"
                              )}>
                                {classInfo.visitorCount}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openDetailsModal(
                                date, 
                                classInfo.className, 
                                classInfo.students,
                                classInfo.visitorCount
                              )}
                            >
                              <UserRound className="h-4 w-4" />
                              <span className="sr-only">Ver detalhes</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </ScrollArea>
      
      {selectedDetails && (
        <StudentDetailsModal 
          open={modalOpen}
          onClose={closeDetailsModal}
          className={selectedDetails.className}
          date={selectedDetails.date}
          students={selectedDetails.students}
          visitantes={selectedDetails.visitantes}
        />
      )}
    </>
  );
};

export default AttendanceDetailsList; 