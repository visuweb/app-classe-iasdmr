import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

// Definir tipos para ActivityClass e ActivityType para facilitar a tipagem
type ActivityClass = {
  id: number;
  name: string;
  literaturasDistribuidas: number;
  qtdContatosMissionarios: number;
  estudosBiblicosTotal: number;
  visitasMissionarias: number;
  pessoasAuxiliadas: number;
  pessoasTrazidasIgreja: number;
  [key: string]: any;
};

type ActivityType = {
  id: string;
  name: string;
};

// Interface para dados completos
interface ActivityGridDataComplete {
  empty: false;
  activityTypes: ActivityType[];
  classes: ActivityClass[];
  totals: Record<string, number>;
}

// Interface para dados vazios
interface ActivityGridDataEmpty {
  empty: true;
}

// Union type para ambos os casos
type ActivityGridData = ActivityGridDataComplete | ActivityGridDataEmpty;

interface MissionaryTableProps {
  data: ActivityGridData | null;
}

const MissionaryTable: React.FC<MissionaryTableProps> = ({ data }) => {
  if (!data || data.empty === true) {
    return (
      <div className="text-center py-8 px-4">
        <div className="text-gray-500 text-lg">
          Nenhum registro de atividade missionária encontrado para o trimestre selecionado.
        </div>
      </div>
    );
  }

  // Asserção para ajudar o TypeScript
  const completeData = data as ActivityGridDataComplete;
  
  return (
    <div className="overflow-auto" style={{ maxHeight: '400px' }}>
      <div className="min-w-max border border-gray-200 rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="sticky left-0 bg-muted/30 z-10 font-bold border-r">Atividade Missionária</TableHead>
              {completeData.classes.map((classData: ActivityClass) => (
                <TableHead key={`class-header-${classData.id}`} className="text-center font-bold">
                  {classData.name}
                </TableHead>
              ))}
              <TableHead className="text-center bg-blue-100 font-bold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {completeData.activityTypes.map((activityType: ActivityType) => (
              <TableRow key={`activity-${activityType.id}`} className="hover:bg-gray-50">
                <TableCell className="font-medium sticky left-0 bg-white z-10 border-r">
                  {activityType.name}
                </TableCell>
                {completeData.classes.map((classData: ActivityClass) => (
                  <TableCell 
                    key={`value-${classData.id}-${activityType.id}`} 
                    className="text-center"
                  >
                    {classData[activityType.id] || 0}
                  </TableCell>
                ))}
                <TableCell className="text-center bg-blue-100 font-bold">
                  {completeData.totals[activityType.id] || 0}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MissionaryTable;