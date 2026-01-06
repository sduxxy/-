
export enum RepairStage {
  ASSESSMENT = '定损',
  METALWORK = '钣金',
  PAINTING = '喷漆',
  DELIVERY = '交车',
  FINISHED = '已完工'
}

export const STAGE_ORDER: RepairStage[] = [
  RepairStage.ASSESSMENT,
  RepairStage.METALWORK,
  RepairStage.PAINTING,
  RepairStage.DELIVERY,
  RepairStage.FINISHED
];

export interface StageHistory {
  stage: RepairStage;
  startTime: number;
  endTime?: number;
  handler: string;
}

export interface RepairTask {
  id: string;
  shopId: string;
  licensePlate: string;
  contactPerson: string;
  insuranceCompany: string;
  assessmentAmount: number;
  expectedDeliveryTime: number;
  currentStage: RepairStage;
  isSparePartsReady: boolean;
  remarks: string; 
  entryTime: number;
  history: StageHistory[];
}

export type Role = 'CONSULTANT' | 'METALWORKER' | 'PAINTER' | 'MANAGER' | 'SPARE_PARTS' | 'HQ_OPERATOR';

// 角色中文映射
export const ROLE_LABELS: Record<Role, string> = {
  'CONSULTANT': '理赔顾问',
  'METALWORKER': '钣金技师',
  'PAINTER': '喷漆技师',
  'MANAGER': '门店经理',
  'SPARE_PARTS': '备件主管',
  'HQ_OPERATOR': '总部管理员'
};

export interface Staff {
  id: string;
  shopId: string;
  username: string;
  name: string;
  role: Role;
}

export const STAGE_PERMISSIONS: Record<RepairStage, Role[]> = {
  [RepairStage.ASSESSMENT]: ['CONSULTANT', 'MANAGER'],
  [RepairStage.METALWORK]: ['METALWORKER', 'CONSULTANT', 'MANAGER'],
  [RepairStage.PAINTING]: ['PAINTER', 'CONSULTANT', 'MANAGER'],
  [RepairStage.DELIVERY]: ['CONSULTANT', 'MANAGER'],
  [RepairStage.FINISHED]: []
};
