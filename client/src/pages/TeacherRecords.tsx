import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { format, parse, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiRequest } from '@/lib/queryClient';
import { AttendanceRecord, MissionaryActivity } from '@shared/schema';
import { 
  Calendar, 
  ArrowLeft, 
  FileText, 
  Users, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Filter 
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Calendar as CalendarComponent 
} from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AttendanceRecordWithStudent = AttendanceRecord & { studentName: string };
type MissionaryActivityWithClass = MissionaryActivity & { className: string };

const TeacherRecords: React.FC = () => {
  const [, navigate] = useLocation();
  const { teacher } = useAuth();
  const isMobile = useIsMobile();
  
  // Estado para filtro de data
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  // Calcular o início e fim do mês selecionado
  const startOfSelectedMonth = startOfMonth(selectedMonth);
  const endOfSelectedMonth = endOfMonth(selectedMonth);
  
  // Formatar datas para exibição
  const formattedMonth = format(selectedMonth, 'MMMM yyyy', { locale: ptBR });
  
  // Carregar registros de presença
  const {
    data: attendanceRecords = [],
    isLoading: attendanceLoading
  } = useQuery<AttendanceRecordWithStudent[]>({
    queryKey: ['/api/attendance', selectedMonth],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/attendance', {
        // Se tivermos acesso a classes do professor, poderíamos filtrar por classId
      });
      const data = await res.json();
      
      // Filtrar registros pelo mês selecionado
      return data.filter((record: AttendanceRecordWithStudent) => {
        const recordDate = new Date(record.date);
        return recordDate >= startOfSelectedMonth && recordDate <= endOfSelectedMonth;
      });
    },
  });
  
  // Carregar atividades missionárias
  const {
    data: missionaryActivities = [],
    isLoading: activitiesLoading
  } = useQuery<MissionaryActivityWithClass[]>({
    queryKey: ['/api/missionary-activities', selectedMonth],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/missionary-activities', {
        // Se tivermos acesso a classes do professor, poderíamos filtrar por classId
      });
      const data = await res.json();
      
      // Filtrar atividades pelo mês selecionado
      return data.filter((activity: MissionaryActivityWithClass) => {
        const activityDate = new Date(activity.date);
        return activityDate >= startOfSelectedMonth && activityDate <= endOfSelectedMonth;
      });
    },
  });
  
  // Funções para navegação entre meses
  const goToPreviousMonth = () => {
    setSelectedMonth(prev => subMonths(prev, 1));
  };
  
  const goToNextMonth = () => {
    setSelectedMonth(prev => {
      const nextMonth = new Date(prev);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth;
    });
  };
  
  // Função para formatar data
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'dd/MM/yyyy');
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 p-4">
        {/* Cabeçalho */}
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="mr-2 p-2" 
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold flex items-center`}>
              <FileText className="h-6 w-6 mr-2 text-primary-500" />
              Registros
            </h1>
            <div className="text-sm text-gray-500">
              Visualize os registros de presença e atividades
            </div>
          </div>
        </div>
        
        {/* Filtros */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="mx-2 min-w-[150px]"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {formattedMonth}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedMonth}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedMonth(date);
                      setDatePickerOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Conteúdo principal */}
        <div className="max-w-5xl mx-auto">
          <Tabs defaultValue="attendance">
            <TabsList className="mb-4">
              <TabsTrigger value="attendance" className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Frequência
              </TabsTrigger>
              <TabsTrigger value="activities" className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Atividades Missionárias
              </TabsTrigger>
            </TabsList>
            
            {/* Aba de Frequência */}
            <TabsContent value="attendance">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Registros de Frequência</CardTitle>
                  <CardDescription>
                    Presença dos alunos nas aulas - {formattedMonth}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {attendanceLoading ? (
                    // Estado de loading
                    <div className="space-y-3">
                      {Array(5).fill(0).map((_, i) => (
                        <div key={i} className="flex justify-between items-center py-2">
                          <Skeleton className="h-5 w-1/3" />
                          <Skeleton className="h-5 w-1/5" />
                          <Skeleton className="h-5 w-1/6" />
                        </div>
                      ))}
                    </div>
                  ) : attendanceRecords.length === 0 ? (
                    // Sem registros
                    <div className="text-center py-10 text-gray-500">
                      <div className="mb-3 flex justify-center">
                        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-gray-400" />
                        </div>
                      </div>
                      <h3 className="font-medium mb-1">Nenhum registro encontrado</h3>
                      <p className="text-sm">Não há registros de frequência para este mês</p>
                    </div>
                  ) : (
                    // Tabela de registros
                    <div className="rounded border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Aluno</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Presença</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium">{record.studentName}</TableCell>
                              <TableCell>{formatDate(record.date)}</TableCell>
                              <TableCell>
                                {record.present ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <Check className="h-3 w-3 mr-1" />
                                    Presente
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <X className="h-3 w-3 mr-1" />
                                    Ausente
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Aba de Atividades Missionárias */}
            <TabsContent value="activities">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Atividades Missionárias</CardTitle>
                  <CardDescription>
                    Registros de atividades realizadas - {formattedMonth}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activitiesLoading ? (
                    // Estado de loading
                    <div className="space-y-3">
                      {Array(3).fill(0).map((_, i) => (
                        <div key={i} className="flex justify-between items-center py-2">
                          <Skeleton className="h-5 w-1/4" />
                          <Skeleton className="h-5 w-1/5" />
                          <Skeleton className="h-5 w-1/6" />
                        </div>
                      ))}
                    </div>
                  ) : missionaryActivities.length === 0 ? (
                    // Sem atividades
                    <div className="text-center py-10 text-gray-500">
                      <div className="mb-3 flex justify-center">
                        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-gray-400" />
                        </div>
                      </div>
                      <h3 className="font-medium mb-1">Nenhum registro encontrado</h3>
                      <p className="text-sm">Não há registros de atividades missionárias para este mês</p>
                    </div>
                  ) : (
                    // Tabela de atividades
                    <div className="rounded border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Classe</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Literaturas</TableHead>
                            <TableHead>Contatos</TableHead>
                            <TableHead>Estudos</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {missionaryActivities.map((activity) => (
                            <TableRow key={activity.id}>
                              <TableCell className="font-medium">{activity.className}</TableCell>
                              <TableCell>{formatDate(activity.date)}</TableCell>
                              <TableCell>{activity.literaturasDistribuidas}</TableCell>
                              <TableCell>{activity.qtdContatosMissionarios}</TableCell>
                              <TableCell>{activity.estudosBiblicos}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default TeacherRecords;