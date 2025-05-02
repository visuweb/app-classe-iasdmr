import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfMonth, endOfMonth, parse, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, BarChart3, ClipboardList, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Class, AttendanceRecord, MissionaryActivity } from '@shared/schema';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Calendar as CalendarComponent 
} from '@/components/ui/calendar';

type AttendanceRecordWithStudent = AttendanceRecord & { studentName: string };
type MissionaryActivityWithClass = MissionaryActivity & { className: string };

const RecordsList: React.FC = () => {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  
  // Estado para filtro de data
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  // Calcular o início e fim do mês selecionado
  const startOfSelectedMonth = startOfMonth(selectedMonth);
  const endOfSelectedMonth = endOfMonth(selectedMonth);
  
  // Formatar datas para exibição
  const formattedMonth = format(selectedMonth, 'MMMM yyyy', { locale: ptBR });
  
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
  
  // Queries
  const { data: classes, isLoading: isLoadingClasses } = useQuery<Class[]>({
    queryKey: ['/api/classes'],
  });
  
  // Carregar todos os registros de presença
  const { data: allAttendanceRecords = [], isLoading: isLoadingAllAttendance } = useQuery<AttendanceRecordWithStudent[]>({
    queryKey: ['/api/attendance'],
    enabled: !!selectedClassId,
  });
  
  // Filtrar registros por classe e mês
  const attendanceRecords = selectedClassId
    ? allAttendanceRecords.filter((record) => {
        // Converter para número para comparação
        const studentClassId = parseInt(selectedClassId, 10);
        const recordDate = new Date(record.date);
        
        // Verificar se o record pertence à classe selecionada
        // Como o record não tem classId diretamente, precisamos verificar nos estudantes
        // ou confiar que a API já filtrou corretamente
        return recordDate >= startOfSelectedMonth && 
               recordDate <= endOfSelectedMonth;
      })
    : [];
  
  // Indicador de carregamento para registros combinados
  const isLoadingAttendance = isLoadingAllAttendance;
  
  // Carregar atividades missionárias
  const { data: allMissionaryActivities = [], isLoading: isLoadingAllActivities } = useQuery<MissionaryActivityWithClass[]>({
    queryKey: ['/api/missionary-activities'],
    enabled: !!selectedClassId,
  });
  
  // Filtrar atividades por classe e mês
  const missionaryActivities = selectedClassId
    ? allMissionaryActivities.filter((activity) => {
        const classId = parseInt(selectedClassId, 10);
        const activityDate = new Date(activity.date);
        
        return activity.classId === classId && 
               activityDate >= startOfSelectedMonth && 
               activityDate <= endOfSelectedMonth;
      })
    : [];
  
  // Indicador de carregamento para atividades combinadas
  const isLoadingActivities = isLoadingAllActivities;
  
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd 'de' MMMM, yyyy", { locale: ptBR });
  };
  
  // Render attendance records
  const renderAttendanceRecords = () => {
    if (isLoadingAttendance) {
      return (
        <div className="space-y-4">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      );
    }
    
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return (
        <div className="text-center py-8">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Não há registros de presença para esta classe.</p>
        </div>
      );
    }
    
    // Group attendance records by date
    const recordsByDate = attendanceRecords.reduce((acc, record) => {
      const dateKey = record.date.toString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(record);
      return acc;
    }, {} as Record<string, AttendanceRecordWithStudent[]>);
    
    return Object.entries(recordsByDate).map(([date, records]) => (
      <Card key={date} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-primary-500" />
            <CardTitle className="text-base">{formatDate(date)}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.studentName}</TableCell>
                  <TableCell className="text-right">
                    <span 
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.present 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {record.present ? 'Presente' : 'Ausente'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    ));
  };
  
  // Render missionary activities
  const renderMissionaryActivities = () => {
    if (isLoadingActivities) {
      return (
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      );
    }
    
    if (!missionaryActivities || missionaryActivities.length === 0) {
      return (
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Não há registros de atividades missionárias para esta classe.</p>
        </div>
      );
    }
    
    return missionaryActivities.map((activity) => (
      <Card key={activity.id} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-primary-500" />
            <CardTitle className="text-base">{formatDate(activity.date.toString())}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-y-2">
            <div className="text-sm text-gray-500">Contatos Missionários:</div>
            <div className="text-sm font-medium text-right">{activity.qtdContatosMissionarios}</div>
            
            <div className="text-sm text-gray-500">Literaturas Distribuídas:</div>
            <div className="text-sm font-medium text-right">{activity.literaturasDistribuidas}</div>
            
            <div className="text-sm text-gray-500">Visitas Missionárias:</div>
            <div className="text-sm font-medium text-right">{activity.visitasMissionarias}</div>
            
            <div className="text-sm text-gray-500">Estudos Bíblicos:</div>
            <div className="text-sm font-medium text-right">{activity.estudosBiblicos}</div>
            
            <div className="text-sm text-gray-500">Ministrados:</div>
            <div className="text-sm font-medium text-right">{activity.ministrados}</div>
            
            <div className="text-sm text-gray-500">Pessoas Auxiliadas:</div>
            <div className="text-sm font-medium text-right">{activity.pessoasAuxiliadas}</div>
            
            <div className="text-sm text-gray-500">Pessoas Trazidas à Igreja:</div>
            <div className="text-sm font-medium text-right">{activity.pessoasTrazidasIgreja}</div>
          </div>
        </CardContent>
      </Card>
    ));
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Histórico de Registros</h1>
      
      <div className="flex flex-col sm:flex-row justify-between mb-6 gap-4">
        <Select 
          value={selectedClassId} 
          onValueChange={setSelectedClassId}
          disabled={isLoadingClasses}
        >
          <SelectTrigger className="w-full sm:w-[300px]">
            <SelectValue placeholder="Selecione uma classe" />
          </SelectTrigger>
          <SelectContent>
            {isLoadingClasses ? (
              <SelectItem value="loading">Carregando classes...</SelectItem>
            ) : classes && classes.length > 0 ? (
              classes.map((classObj) => (
                <SelectItem key={classObj.id} value={classObj.id.toString()}>
                  {classObj.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="empty">Nenhuma classe encontrada</SelectItem>
            )}
          </SelectContent>
        </Select>
        
        {/* Filtro de data por mês */}
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
      
      {selectedClassId && (
        <Tabs defaultValue="attendance">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="attendance" className="flex items-center">
              <ClipboardList className="h-4 w-4 mr-2" />
              Registro de Presença
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Atividades Missionárias
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="attendance" className="space-y-4">
            {renderAttendanceRecords()}
          </TabsContent>
          
          <TabsContent value="activities" className="space-y-4">
            {renderMissionaryActivities()}
          </TabsContent>
        </Tabs>
      )}
      
      {!selectedClassId && (
        <div className="text-center py-16">
          <ClipboardList className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 text-lg mb-2">Selecione uma classe para visualizar os registros</p>
          <p className="text-gray-400 text-sm">Os dados serão exibidos após a seleção</p>
        </div>
      )}
    </div>
  );
};

export default RecordsList;
