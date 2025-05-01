import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { LogOut, School, User, Book, BarChart, Plus, UserPlus, Calendar, Filter, Trash2, Check, Pencil } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Teacher, Class, Student, AttendanceRecord, MissionaryActivity } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';

const AdminHome = () => {
  const { teacher, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newTeacherData, setNewTeacherData] = useState({
    name: '',
    cpf: '',
    password: '',
  });
  const [teacherClassAssignment, setTeacherClassAssignment] = useState({
    teacherId: 0,
    classId: 0,
  });
  const [selectedClassForReports, setSelectedClassForReports] = useState<number | null>(null);
  const [teacherToToggle, setTeacherToToggle] = useState<Teacher | null>(null);
  const [isToggleTeacherOpen, setIsToggleTeacherOpen] = useState(false);
  
  // Fetch attendance records
  const {
    data: attendanceRecords = [],
    isLoading: attendanceLoading,
  } = useQuery<(AttendanceRecord & { studentName: string })[]>({
    queryKey: ['/api/attendance-records', selectedClassForReports],
    queryFn: async () => {
      const url = selectedClassForReports 
        ? `/api/attendance-records?classId=${selectedClassForReports}`
        : '/api/attendance-records';
      const res = await apiRequest('GET', url);
      return res.json();
    },
  });
  
  // Fetch missionary activities
  const {
    data: missionaryActivities = [],
    isLoading: activitiesLoading,
  } = useQuery<(MissionaryActivity & { className: string })[]>({
    queryKey: ['/api/missionary-activities', selectedClassForReports],
    queryFn: async () => {
      const url = selectedClassForReports 
        ? `/api/missionary-activities?classId=${selectedClassForReports}`
        : '/api/missionary-activities';
      const res = await apiRequest('GET', url);
      return res.json();
    },
  });

  // Fetch classes
  const { 
    data: classes = [],
    isLoading: classesLoading 
  } = useQuery<Class[]>({
    queryKey: ['/api/classes'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/classes');
      return res.json();
    },
  });

  // Fetch teachers
  const {
    data: teachers = [],
    isLoading: teachersLoading
  } = useQuery<Teacher[]>({
    queryKey: ['/api/teachers'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/teachers');
      return res.json();
    },
  });

  // Fetch students for a class
  const {
    data: students = [],
    isLoading: studentsLoading,
    refetch: refetchStudents
  } = useQuery<Student[]>({
    queryKey: ['/api/classes', selectedClassId, 'students'],
    queryFn: async () => {
      if (!selectedClassId) return [];
      const res = await apiRequest('GET', `/api/classes/${selectedClassId}/students`);
      return res.json();
    },
    enabled: !!selectedClassId,
  });

  // Fetch teachers for a class
  const {
    data: classTeachers = [],
    isLoading: classTeachersLoading,
    refetch: refetchClassTeachers
  } = useQuery<Teacher[]>({
    queryKey: ['/api/classes', selectedClassId, 'teachers'],
    queryFn: async () => {
      if (!selectedClassId) return [];
      const res = await apiRequest('GET', `/api/classes/${selectedClassId}/teachers`);
      return res.json();
    },
    enabled: !!selectedClassId,
  });

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: async (className: string) => {
      const res = await apiRequest('POST', '/api/classes', { name: className });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      toast({
        title: 'Sucesso',
        description: 'Classe criada com sucesso',
      });
      setNewClassName('');
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar classe',
        variant: 'destructive',
      });
    },
  });

  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: async ({ name, classId }: { name: string; classId: number }) => {
      const res = await apiRequest('POST', '/api/students', { name, classId });
      return res.json();
    },
    onSuccess: () => {
      refetchStudents();
      toast({
        title: 'Sucesso',
        description: 'Aluno adicionado com sucesso',
      });
      setNewStudentName('');
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao adicionar aluno',
        variant: 'destructive',
      });
    },
  });

  // Create teacher mutation
  const createTeacherMutation = useMutation({
    mutationFn: async (teacherData: typeof newTeacherData) => {
      const res = await apiRequest('POST', '/api/teachers', teacherData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
      toast({
        title: 'Sucesso',
        description: 'Professor criado com sucesso',
      });
      setNewTeacherData({ name: '', cpf: '', password: '' });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar professor',
        variant: 'destructive',
      });
    },
  });

  // Assign teacher to class mutation
  const assignTeacherMutation = useMutation({
    mutationFn: async (data: typeof teacherClassAssignment) => {
      const res = await apiRequest('POST', '/api/teacher-classes', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', selectedClassId, 'teachers'] });
      toast({
        title: 'Sucesso',
        description: 'Professor atribuído à classe com sucesso',
      });
      setTeacherClassAssignment({ teacherId: 0, classId: 0 });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atribuir professor à classe',
        variant: 'destructive',
      });
    },
  });

  // Toggle teacher status mutation
  const toggleTeacherStatusMutation = useMutation({
    mutationFn: async (teacherId: number) => {
      // Em vez de excluir, vamos atualizar o status para o oposto
      const newStatus = !teacherToToggle?.active;
      const res = await apiRequest('PUT', `/api/teachers/${teacherId}`, { 
        active: newStatus,
        name: teacherToToggle?.name || '',
        cpf: teacherToToggle?.cpf || ''
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Erro ao ${newStatus ? 'reativar' : 'desativar'} professor`);
      }
      return { success: true, active: newStatus };
    },
    onSuccess: (data) => {
      toast({
        title: data.active ? 'Professor reativado' : 'Professor desativado',
        description: data.active 
          ? 'O professor foi reativado com sucesso.' 
          : 'O professor foi desativado com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
      setIsToggleTeacherOpen(false);
      setTeacherToToggle(null);
    },
    onError: (error: Error) => {
      toast({
        title: teacherToToggle?.active ? 'Erro ao desativar professor' : 'Erro ao reativar professor',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Handle class selection
  const handleClassSelection = (classId: number) => {
    setSelectedClassId(classId);
  };
  
  // Handle class selection for reports
  const handleClassSelectionForReports = (classId: number | null) => {
    setSelectedClassForReports(classId);
  };

  // Handle create class
  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClassName.trim()) {
      createClassMutation.mutate(newClassName);
    }
  };

  // Handle create student
  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStudentName.trim() && selectedClassId) {
      createStudentMutation.mutate({
        name: newStudentName,
        classId: selectedClassId,
      });
    }
  };

  // Handle create teacher
  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTeacherData.name && newTeacherData.cpf && newTeacherData.password) {
      createTeacherMutation.mutate(newTeacherData);
    }
  };

  // Handle assign teacher to class
  const handleAssignTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (teacherClassAssignment.teacherId && teacherClassAssignment.classId) {
      assignTeacherMutation.mutate(teacherClassAssignment);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation('/auth');
      },
    });
  };

  // Redirect if not admin or not logged in
  useEffect(() => {
    if (!teacher) {
      setLocation('/auth');
    } else if (!teacher.isAdmin) {
      setLocation('/');
    }
  }, [teacher, setLocation]);

  if (!teacher || !teacher.isAdmin) {
    return null;
  }

  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-500 text-white py-3 px-4 flex justify-between items-center">
        <div>
          <h1 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold`}>Administração</h1>
          <p className="text-xs">Bem-vindo, {teacher.name}</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLogout} 
          className="flex items-center gap-1 text-gray-600 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          {!isMobile && "Sair"}
        </Button>
      </header>

      <main className="py-4 px-4 max-w-5xl mx-auto">
        <Tabs defaultValue="classes">
          <TabsList className={`mb-4 ${isMobile ? 'w-full' : ''}`}>
            <TabsTrigger value="classes" className={isMobile ? "text-xs" : ""}>
              {isMobile ? <School className="h-4 w-4 mr-1" /> : null}
              Classes
            </TabsTrigger>
            <TabsTrigger value="teachers" className={isMobile ? "text-xs" : ""}>
              {isMobile ? <User className="h-4 w-4 mr-1" /> : null}
              Professores
            </TabsTrigger>
            <TabsTrigger value="reports" className={isMobile ? "text-xs" : ""}>
              {isMobile ? <BarChart className="h-4 w-4 mr-1" /> : null}
              Registros
            </TabsTrigger>
          </TabsList>
          
          {/* Classes Tab */}
          <TabsContent value="classes" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Classes List */}
              <Card>
                <CardHeader>
                  <CardTitle>Classes</CardTitle>
                  <CardDescription>
                    Selecione uma classe para gerenciar alunos e professores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {classesLoading ? (
                    <div className="text-center py-4">Carregando classes...</div>
                  ) : classes.length === 0 ? (
                    <div className="text-center py-4">Nenhuma classe encontrada</div>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {classes.map((classObj) => (
                          <div
                            key={classObj.id}
                            className={`p-3 border rounded-md cursor-pointer hover:bg-gray-100 ${
                              selectedClassId === classObj.id ? 'bg-primary-100 border-primary-500' : ''
                            }`}
                            onClick={() => handleClassSelection(classObj.id)}
                          >
                            <h3 className="font-medium">{classObj.name}</h3>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
                <CardFooter>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>Adicionar Nova Classe</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adicionar Nova Classe</DialogTitle>
                        <DialogDescription>
                          Insira o nome para criar uma nova classe
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateClass}>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="className">Nome da Classe</Label>
                            <Input
                              id="className"
                              value={newClassName}
                              onChange={(e) => setNewClassName(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={createClassMutation.isPending}>
                            {createClassMutation.isPending ? 'Adicionando...' : 'Adicionar Classe'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>

              {/* Class Details */}
              {selectedClassId && (
                <div className="space-y-6">
                  {/* Students */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Alunos da Classe</CardTitle>
                      <CardDescription>
                        {classes.find(c => c.id === selectedClassId)?.name || ''}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {studentsLoading ? (
                        <div className="text-center py-4">Carregando alunos...</div>
                      ) : students.length === 0 ? (
                        <div className="text-center py-4">Nenhum aluno encontrado</div>
                      ) : (
                        <ScrollArea className="h-[200px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nome</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {students.map((student) => (
                                <TableRow key={student.id}>
                                  <TableCell>{student.name}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      )}
                    </CardContent>
                    <CardFooter>
                      <form onSubmit={handleCreateStudent} className="space-y-4 w-full">
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Nome do novo aluno"
                            value={newStudentName}
                            onChange={(e) => setNewStudentName(e.target.value)}
                            required
                          />
                          <Button type="submit" disabled={createStudentMutation.isPending}>
                            {createStudentMutation.isPending ? 'Adicionando...' : 'Adicionar'}
                          </Button>
                        </div>
                      </form>
                    </CardFooter>
                  </Card>

                  {/* Teachers */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Professores da Classe</CardTitle>
                      <CardDescription>Máximo de 2 professores por classe</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {classTeachersLoading ? (
                        <div className="text-center py-4">Carregando professores...</div>
                      ) : classTeachers.length === 0 ? (
                        <div className="text-center py-4">Nenhum professor atribuído</div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead>CPF</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {classTeachers.map((teacher) => (
                              <TableRow key={teacher.id}>
                                <TableCell>{teacher.name}</TableCell>
                                <TableCell>{teacher.cpf}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                    <CardFooter>
                      {classTeachers && classTeachers.length < 2 && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button>Atribuir Professor</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Atribuir Professor à Classe</DialogTitle>
                              <DialogDescription>
                                Selecione um professor para atribuir a esta classe
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAssignTeacher}>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="teacherId">Professor</Label>
                                  <select
                                    id="teacherId"
                                    className="w-full p-2 border rounded"
                                    value={teacherClassAssignment.teacherId || ''}
                                    onChange={(e) => setTeacherClassAssignment({
                                      ...teacherClassAssignment,
                                      teacherId: Number(e.target.value),
                                      classId: selectedClassId
                                    })}
                                    required
                                  >
                                    <option value="">Selecione um professor</option>
                                    {teachers.map((teacher) => (
                                      <option key={teacher.id} value={teacher.id}>
                                        {teacher.name} - {teacher.cpf}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button type="submit" disabled={assignTeacherMutation.isPending}>
                                  {assignTeacherMutation.isPending ? 'Atribuindo...' : 'Atribuir Professor'}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      )}
                    </CardFooter>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Teachers Tab */}
          <TabsContent value="teachers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Professores</CardTitle>
                <CardDescription>Lista de todos os professores cadastrados</CardDescription>
              </CardHeader>
              <CardContent>
                {teachersLoading ? (
                  <div className="text-center py-4">Carregando professores...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Administrador</TableHead>
                        <TableHead className="w-24 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teachers.map((teacher) => (
                        <TableRow key={teacher.id} className={teacher.active ? "" : "opacity-50"}>
                          <TableCell>{teacher.name}</TableCell>
                          <TableCell>{teacher.cpf}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              teacher.active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {teacher.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </TableCell>
                          <TableCell>{teacher.isAdmin ? 'Sim' : 'Não'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end items-center space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-blue-600"
                                onClick={() => {
                                  // Editar professor (a ser implementado)
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className={`h-8 w-8 ${teacher.active ? 'text-red-600' : 'text-green-600'}`}
                                onClick={() => {
                                  toggleTeacherStatus(teacher);
                                }}
                              >
                                {teacher.active ? (
                                  <Trash2 className="h-4 w-4" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
              <CardFooter>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Adicionar Novo Professor</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Novo Professor</DialogTitle>
                      <DialogDescription>
                        Preencha os dados para criar um novo professor
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateTeacher}>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="teacherName">Nome</Label>
                          <Input
                            id="teacherName"
                            value={newTeacherData.name}
                            onChange={(e) => setNewTeacherData({ ...newTeacherData, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="teacherCpf">CPF</Label>
                          <Input
                            id="teacherCpf"
                            value={newTeacherData.cpf}
                            onChange={(e) => setNewTeacherData({ ...newTeacherData, cpf: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="teacherPassword">Senha</Label>
                          <Input
                            id="teacherPassword"
                            type="password"
                            value={newTeacherData.password}
                            onChange={(e) => setNewTeacherData({ ...newTeacherData, password: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={createTeacherMutation.isPending}>
                          {createTeacherMutation.isPending ? 'Adicionando...' : 'Adicionar Professor'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            {/* Filter Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
                <CardDescription>Selecione uma classe para filtrar os registros</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="classFilter">Filtrar por Classe</Label>
                    <select
                      id="classFilter"
                      className="w-full p-2 border rounded mt-1"
                      value={selectedClassForReports || ''}
                      onChange={(e) => handleClassSelectionForReports(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">Todas as Classes</option>
                      {classes.map((classObj) => (
                        <option key={classObj.id} value={classObj.id}>
                          {classObj.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Attendance Records */}
            <Card>
              <CardHeader>
                <CardTitle>Registros de Frequência</CardTitle>
                <CardDescription>
                  {selectedClassForReports
                    ? `Classe: ${classes.find(c => c.id === selectedClassForReports)?.name || ''}`
                    : 'Todas as Classes'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {attendanceLoading ? (
                  <div className="text-center py-4">Carregando registros de frequência...</div>
                ) : attendanceRecords.length === 0 ? (
                  <div className="text-center py-4">Nenhum registro de frequência encontrado.</div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Aluno</TableHead>
                          <TableHead>Classe</TableHead>
                          <TableHead>Presença</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>{new Date(record.date).toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell>{record.studentName}</TableCell>
                            <TableCell>
                              {classes.find(c => c.id === record.studentId)?.name || ''}
                            </TableCell>
                            <TableCell>
                              {record.present ? (
                                <span className="text-green-600 font-medium">Presente</span>
                              ) : (
                                <span className="text-red-600 font-medium">Ausente</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
            
            {/* Missionary Activities */}
            <Card>
              <CardHeader>
                <CardTitle>Atividades Missionárias</CardTitle>
                <CardDescription>
                  {selectedClassForReports
                    ? `Classe: ${classes.find(c => c.id === selectedClassForReports)?.name || ''}`
                    : 'Todas as Classes'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activitiesLoading ? (
                  <div className="text-center py-4">Carregando registros de atividades...</div>
                ) : missionaryActivities.length === 0 ? (
                  <div className="text-center py-4">Nenhum registro de atividade missionária encontrado.</div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Classe</TableHead>
                          <TableHead>Atividade</TableHead>
                          <TableHead>Quantidade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {missionaryActivities.flatMap((activity) => {
                          const activityEntries = [];
                          
                          if (activity.qtdContatosMissionarios) {
                            activityEntries.push(
                              <TableRow key={`${activity.id}-contatos`}>
                                <TableCell>{new Date(activity.date).toLocaleDateString('pt-BR')}</TableCell>
                                <TableCell>{activity.className}</TableCell>
                                <TableCell>Contatos Missionários</TableCell>
                                <TableCell>{activity.qtdContatosMissionarios}</TableCell>
                              </TableRow>
                            );
                          }
                          
                          if (activity.literaturasDistribuidas) {
                            activityEntries.push(
                              <TableRow key={`${activity.id}-literaturas`}>
                                <TableCell>{new Date(activity.date).toLocaleDateString('pt-BR')}</TableCell>
                                <TableCell>{activity.className}</TableCell>
                                <TableCell>Literaturas Distribuídas</TableCell>
                                <TableCell>{activity.literaturasDistribuidas}</TableCell>
                              </TableRow>
                            );
                          }
                          
                          if (activity.visitasMissionarias) {
                            activityEntries.push(
                              <TableRow key={`${activity.id}-visitas`}>
                                <TableCell>{new Date(activity.date).toLocaleDateString('pt-BR')}</TableCell>
                                <TableCell>{activity.className}</TableCell>
                                <TableCell>Visitas Missionárias</TableCell>
                                <TableCell>{activity.visitasMissionarias}</TableCell>
                              </TableRow>
                            );
                          }
                          
                          if (activity.estudosBiblicos) {
                            activityEntries.push(
                              <TableRow key={`${activity.id}-estudos`}>
                                <TableCell>{new Date(activity.date).toLocaleDateString('pt-BR')}</TableCell>
                                <TableCell>{activity.className}</TableCell>
                                <TableCell>Estudos Bíblicos</TableCell>
                                <TableCell>{activity.estudosBiblicos}</TableCell>
                              </TableRow>
                            );
                          }
                          
                          if (activity.ministrados) {
                            activityEntries.push(
                              <TableRow key={`${activity.id}-ministrados`}>
                                <TableCell>{new Date(activity.date).toLocaleDateString('pt-BR')}</TableCell>
                                <TableCell>{activity.className}</TableCell>
                                <TableCell>Ministrados</TableCell>
                                <TableCell>{activity.ministrados}</TableCell>
                              </TableRow>
                            );
                          }
                          
                          if (activity.pessoasAuxiliadas) {
                            activityEntries.push(
                              <TableRow key={`${activity.id}-auxiliadas`}>
                                <TableCell>{new Date(activity.date).toLocaleDateString('pt-BR')}</TableCell>
                                <TableCell>{activity.className}</TableCell>
                                <TableCell>Pessoas Auxiliadas</TableCell>
                                <TableCell>{activity.pessoasAuxiliadas}</TableCell>
                              </TableRow>
                            );
                          }
                          
                          if (activity.pessoasTrazidasIgreja) {
                            activityEntries.push(
                              <TableRow key={`${activity.id}-trazidas`}>
                                <TableCell>{new Date(activity.date).toLocaleDateString('pt-BR')}</TableCell>
                                <TableCell>{activity.className}</TableCell>
                                <TableCell>Pessoas Trazidas à Igreja</TableCell>
                                <TableCell>{activity.pessoasTrazidasIgreja}</TableCell>
                              </TableRow>
                            );
                          }
                          
                          // Se não houver nenhuma atividade específica, mostre uma linha genérica
                          if (activityEntries.length === 0) {
                            activityEntries.push(
                              <TableRow key={activity.id}>
                                <TableCell>{new Date(activity.date).toLocaleDateString('pt-BR')}</TableCell>
                                <TableCell>{activity.className}</TableCell>
                                <TableCell>Sem atividades registradas</TableCell>
                                <TableCell>0</TableCell>
                              </TableRow>
                            );
                          }
                          
                          return activityEntries;
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminHome;