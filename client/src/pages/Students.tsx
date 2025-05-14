import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Class, Student } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, School, Pencil, User, Check, MinusCircle } from 'lucide-react';

const Students: React.FC = () => {
  const [, setLocation] = useLocation();
  const { teacher } = useAuth();
  const { toast } = useToast();
  const [searchName, setSearchName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  
  // Estado para edição de aluno
  const [isEditStudentOpen, setIsEditStudentOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [editStudentName, setEditStudentName] = useState('');
  
  // Estado para alteração de status de aluno
  const [isToggleStudentOpen, setIsToggleStudentOpen] = useState(false);
  const [studentToToggle, setStudentToToggle] = useState<Student | null>(null);
  
  // Extrair classId da URL se estiver presente
  const urlParams = new URLSearchParams(window.location.search);
  const classIdFromUrl = urlParams.get('classId');
  
  // Se houver classId na URL, utilizá-lo como filtro inicial
  useEffect(() => {
    if (classIdFromUrl) {
      setSelectedClassId(classIdFromUrl);
    }
  }, [classIdFromUrl]);

  // Buscar todas as classes
  const { data: classes = [], isLoading: classesLoading } = useQuery<Class[]>({
    queryKey: ['/api/classes'],
    enabled: teacher !== null,
  });

  // Buscar alunos usando o novo endpoint
  const { 
    data: students = [], 
    isLoading: studentsLoading,
    refetch: refetchStudents
  } = useQuery<(Student & { className?: string })[]>({
    queryKey: ['/api/students'],
    enabled: teacher !== null,
  });

  // Filtrar alunos
  const filteredStudents = students.filter(student => {
    const nameMatches = student.name.toLowerCase().includes(searchName.toLowerCase());
    const classMatches = selectedClassId === 'all' || student.classId.toString() === selectedClassId;
    return nameMatches && classMatches;
  });

  // Navegar para a página de detalhes da classe
  const goToClass = (classId: number) => {
    setLocation(`/classes/${classId}`);
  };
  
  // Edit student mutation
  const editStudentMutation = useMutation({
    mutationFn: async (data: { id: number, name: string }) => {
      const res = await apiRequest('PUT', `/api/students/${data.id}`, { name: data.name });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Aluno atualizado com sucesso",
        description: "O nome do aluno foi atualizado",
      });
      setIsEditStudentOpen(false);
      setStudentToEdit(null);
      refetchStudents();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar aluno",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Toggle student status mutation
  const toggleStudentStatusMutation = useMutation({
    mutationFn: async (data: { id: number, active: boolean }) => {
      const res = await apiRequest('DELETE', `/api/students/${data.id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Status do aluno alterado",
        description: "O status do aluno foi atualizado com sucesso",
      });
      setIsToggleStudentOpen(false);
      setStudentToToggle(null);
      refetchStudents();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar status do aluno",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Manipuladores para edição de aluno
  const handleEditStudent = (student: Student) => {
    setStudentToEdit(student);
    setEditStudentName(student.name);
    setIsEditStudentOpen(true);
  };
  
  // Manipuladores para alteração de status de aluno
  const toggleStudentStatus = (student: Student) => {
    setStudentToToggle(student);
    setIsToggleStudentOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 p-4">
        <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
          <h1 className="text-2xl font-bold">Alunos</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="w-full md:w-64">
                <Select
                  value={selectedClassId}
                  onValueChange={setSelectedClassId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por classe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as classes</SelectItem>
                    {classes.map((classObj) => (
                      <SelectItem key={classObj.id} value={classObj.id.toString()}>
                        {classObj.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Lista de Alunos</CardTitle>
            <CardDescription>
              {selectedClassId !== 'all' 
                ? `Alunos da classe: ${classes.find(c => c.id.toString() === selectedClassId)?.name}`
                : 'Todos os alunos cadastrados'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {studentsLoading ? (
              <div className="p-4">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 py-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredStudents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    // Encontrar a classe do aluno para exibir o nome
                    const studentClass = classes.find(c => c.id === student.classId);
                    
                    return (
                      <TableRow key={student.id} className={!student.active ? "opacity-60" : ""}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>
                          {studentClass?.name || student.className || 'Classe não encontrada'}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            student.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {student.active ? "Ativo" : "Inativo"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditStudent(student)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStudentStatus(student)}
                          >
                            {student.active ? (
                              <MinusCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <Check className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => goToClass(student.classId)}
                          >
                            <School className="h-4 w-4 text-blue-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-1">Nenhum aluno encontrado</h3>
                <p className="text-sm text-muted-foreground">
                  {searchName || selectedClassId !== 'all' 
                    ? 'Tente ajustar os filtros para ver mais resultados' 
                    : 'Nenhum aluno foi cadastrado no sistema ainda'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Modal de Edição de Aluno */}
        <Dialog open={isEditStudentOpen} onOpenChange={setIsEditStudentOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Aluno</DialogTitle>
              <DialogDescription>
                Atualize o nome do aluno abaixo.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editStudentName" className="text-right">
                  Nome
                </Label>
                <Input
                  id="editStudentName"
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                onClick={() => {
                  if (studentToEdit) {
                    editStudentMutation.mutate({
                      id: studentToEdit.id,
                      name: editStudentName
                    });
                  }
                }}
                disabled={editStudentMutation.isPending || !editStudentName.trim()}
              >
                {editStudentMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Modal de Alteração de Status de Aluno */}
        <AlertDialog open={isToggleStudentOpen} onOpenChange={setIsToggleStudentOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {studentToToggle?.active ? "Desativar Aluno" : "Ativar Aluno"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {studentToToggle?.active 
                  ? `Tem certeza que deseja desativar o aluno "${studentToToggle?.name}"? Alunos desativados não aparecerão nas listas de chamada.`
                  : `Tem certeza que deseja ativar o aluno "${studentToToggle?.name}"? Alunos ativos aparecerão nas listas de chamada.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (studentToToggle) {
                    toggleStudentStatusMutation.mutate({
                      id: studentToToggle.id,
                      active: !studentToToggle.active
                    });
                  }
                }}
              >
                {studentToToggle?.active ? "Desativar" : "Ativar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default Students; 