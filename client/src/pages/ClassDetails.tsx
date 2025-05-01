import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation, useRoute } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Class, Student } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  ArrowLeft, 
  Plus, 
  Users, 
  UserPlus, 
  Pencil, 
  Trash2, 
  School
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Schemas para validação
const studentFormSchema = z.object({
  name: z.string().min(1, 'Nome do aluno é obrigatório'),
  classId: z.number(),
  active: z.boolean().default(true),
});

const ClassDetails: React.FC = () => {
  const [, params] = useRoute('/classes/:id');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { teacher } = useAuth();
  const isMobile = useIsMobile();
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isDeleteStudentOpen, setIsDeleteStudentOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [currentStudentId, setCurrentStudentId] = useState<number | null>(null);
  
  // Estado da classe
  const classId = params?.id ? parseInt(params.id, 10) : undefined;
  
  // Formulário para adicionar aluno
  const studentForm = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: '',
      classId: classId || 0,
      active: true,
    },
  });
  
  // Buscar dados da classe
  const {
    data: classData,
    isLoading: isClassLoading,
    error: classError
  } = useQuery<Class>({
    queryKey: ['/api/classes', classId],
    queryFn: async () => {
      if (!classId) throw new Error('ID da classe não especificado');
      const res = await apiRequest('GET', `/api/classes/${classId}`);
      return res.json();
    },
    enabled: !!classId,
  });
  
  // Buscar alunos da classe
  const {
    data: students = [],
    isLoading: isStudentsLoading,
    refetch: refetchStudents
  } = useQuery<Student[]>({
    queryKey: ['/api/classes', classId, 'students'],
    queryFn: async () => {
      if (!classId) return [];
      const res = await apiRequest('GET', `/api/classes/${classId}/students`);
      return res.json();
    },
    enabled: !!classId,
  });

  // Mutation para criar/editar aluno
  const createStudentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof studentFormSchema> & { id?: number }) => {
      if (data.id) {
        // Editar aluno existente
        const res = await apiRequest('PUT', `/api/students/${data.id}`, { 
          name: data.name, 
          classId: data.classId,
          active: data.active 
        });
        return res.json();
      } else {
        // Criar novo aluno
        const res = await apiRequest('POST', '/api/students', data);
        return res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: currentStudentId ? 'Aluno atualizado!' : 'Aluno adicionado!',
        description: currentStudentId 
          ? 'O aluno foi atualizado com sucesso.' 
          : 'O aluno foi adicionado com sucesso.'
      });
      refetchStudents();
      setIsAddStudentOpen(false);
      setCurrentStudentId(null);
      studentForm.reset({ name: '', classId: classId || 0 });
    },
    onError: (error: Error) => {
      toast({
        title: currentStudentId ? 'Erro ao atualizar aluno' : 'Erro ao adicionar aluno',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Mutation para desativar/reativar aluno
  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      // Em vez de excluir, vamos atualizar o status para o oposto
      const newStatus = !studentToDelete?.active;
      const res = await apiRequest('PUT', `/api/students/${studentId}`, { 
        active: newStatus,
        name: studentToDelete?.name || '',
        classId: classId || 0
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Erro ao ${newStatus ? 'reativar' : 'desativar'} aluno`);
      }
      return { success: true, active: newStatus };
    },
    onSuccess: (data) => {
      toast({
        title: data.active ? 'Aluno reativado' : 'Aluno desativado',
        description: data.active 
          ? 'O aluno foi reativado com sucesso.' 
          : 'O aluno foi desativado com sucesso.',
      });
      refetchStudents();
      setIsDeleteStudentOpen(false);
      setStudentToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: studentToDelete?.active ? 'Erro ao desativar aluno' : 'Erro ao reativar aluno',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Voltar para a lista de classes
  const handleGoBack = () => {
    navigate('/classes');
  };

  // Adicionar ou atualizar aluno
  const onSubmitStudent = (data: z.infer<typeof studentFormSchema>) => {
    createStudentMutation.mutate({
      ...data,
      id: currentStudentId || undefined,
      classId: classId || 0,
    });
  };

  // Manipular erro de carregamento de classe
  useEffect(() => {
    if (classError) {
      toast({
        title: 'Erro ao carregar classe',
        description: 'A classe solicitada não foi encontrada',
        variant: 'destructive'
      });
      navigate('/classes');
    }
  }, [classError, navigate, toast]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 p-4">
        {/* Cabeçalho */}
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="mr-2 p-2" 
            onClick={handleGoBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>
              {isClassLoading ? (
                <Skeleton className="h-7 w-48" />
              ) : (
                classData?.name || 'Detalhes da Classe'
              )}
            </h1>
            <div className="text-sm text-gray-500">
              {isStudentsLoading ? (
                <Skeleton className="h-4 w-32 mt-1" />
              ) : (
                <span>{students.length} aluno{students.length !== 1 ? 's' : ''} cadastrado{students.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Conteúdo principal */}
        <div className="max-w-4xl mx-auto">
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center">
                  <Users className="h-5 w-5 mr-2 text-primary-500" />
                  Alunos da Classe
                </CardTitle>
                <CardDescription>
                  Gerencie os alunos inscritos nesta classe
                </CardDescription>
              </div>
              <Button 
                onClick={() => setIsAddStudentOpen(true)}
                className="flex items-center"
                size={isMobile ? "sm" : "default"}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Aluno
              </Button>
            </CardHeader>
            
            <CardContent className="pt-4">
              {isStudentsLoading ? (
                // Estado de loading
                Array(3).fill(0).map((_, index) => (
                  <div key={index} className="flex items-center py-3 border-b last:border-0">
                    <Skeleton className="h-6 w-6 rounded-full mr-3" />
                    <Skeleton className="h-5 w-48" />
                  </div>
                ))
              ) : students.length === 0 ? (
                // Nenhum aluno encontrado
                <div className="text-center py-8 text-gray-500">
                  <div className="mb-3 flex justify-center">
                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <Users className="h-6 w-6 text-gray-400" />
                    </div>
                  </div>
                  <h3 className="font-medium mb-1">Nenhum aluno cadastrado</h3>
                  <p className="text-sm">Adicione alunos para começar a registrar presenças</p>
                </div>
              ) : (
                // Lista de alunos
                <div className="rounded border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-24 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id} className={student.active ? "" : "opacity-50"}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              student.active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {student.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end items-center space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-blue-600"
                                onClick={() => {
                                  studentForm.reset({ 
                                    name: student.name, 
                                    classId: classId || 0,
                                    active: student.active
                                  });
                                  setCurrentStudentId(student.id);
                                  setIsAddStudentOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 text-red-600"
                                onClick={() => {
                                  setStudentToDelete(student);
                                  setIsDeleteStudentOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Modal para adicionar/editar aluno */}
        <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
          <DialogContent className={isMobile ? "w-[90vw] max-w-md" : ""}>
            <DialogHeader>
              <DialogTitle>
                {currentStudentId ? 'Editar Aluno' : 'Adicionar Novo Aluno'}
              </DialogTitle>
              <DialogDescription>
                {currentStudentId ? 'Atualizar' : 'Adicionar'} aluno à classe: {classData?.name}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...studentForm}>
              <form onSubmit={studentForm.handleSubmit(onSubmitStudent)} className="space-y-4">
                <FormField
                  control={studentForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Aluno</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome completo do aluno" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {currentStudentId && (
                  <FormField
                    control={studentForm.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Status do Aluno</FormLabel>
                          <FormDescription>
                            {field.value ? 'Aluno ativo' : 'Aluno inativo'}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsAddStudentOpen(false);
                      setCurrentStudentId(null);
                      studentForm.reset({ name: '', classId: classId || 0 });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createStudentMutation.isPending}>
                    {createStudentMutation.isPending 
                      ? (currentStudentId ? 'Atualizando...' : 'Adicionando...') 
                      : (currentStudentId ? 'Atualizar Aluno' : 'Adicionar Aluno')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Modal de confirmação para desativar aluno */}
        <AlertDialog open={isDeleteStudentOpen} onOpenChange={setIsDeleteStudentOpen}>
          <AlertDialogContent className={isMobile ? "w-[90vw] max-w-md" : ""}>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar desativação</AlertDialogTitle>
              <AlertDialogDescription>
                {studentToDelete?.active 
                  ? `Tem certeza que deseja desativar o aluno "${studentToDelete?.name}"? Alunos desativados não aparecerão nas listas de chamada.`
                  : `Tem certeza que deseja reativar o aluno "${studentToDelete?.name}"?`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (studentToDelete?.id) {
                    deleteStudentMutation.mutate(studentToDelete.id);
                  }
                }}
                className={studentToDelete?.active ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                disabled={deleteStudentMutation.isPending}
              >
                {deleteStudentMutation.isPending 
                  ? (studentToDelete?.active ? 'Desativando...' : 'Reativando...') 
                  : (studentToDelete?.active ? 'Desativar' : 'Reativar')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default ClassDetails;