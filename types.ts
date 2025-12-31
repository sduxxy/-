
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
  licensePlate: string;
  contactPerson: string;
  insuranceCompany: string;
  assessmentAmount: number;
  expectedDeliveryTime: number;
  currentStage: RepairStage;
  isSparePartsReady: boolean;
  remarks: string; // 新增备注字段
  createdAt: number;
  history: StageHistory[];
}

export type Role = 'CONSULTANT' | 'METALWORKER' | 'PAINTER' | 'MANAGER' | 'SPARE_PARTS';

export interface Staff {
  id: string;
  name: string;
  role: Role;
}

export interface InsuranceCompany {
  id: string;
  name: string;
}

export interface Vehicle {
  id: string;
  licensePlate: string;
  ownerName: string;
  lastVisit?: number;
}

export const STAGE_PERMISSIONS: Record<RepairStage, Role[]> = {
  [RepairStage.ASSESSMENT]: ['CONSULTANT', 'MANAGER'],
  [RepairStage.METALWORK]: ['METALWORKER', 'CONSULTANT', 'MANAGER'],
  [RepairStage.PAINTING]: ['PAINTER', 'CONSULTANT', 'MANAGER'],
  [RepairStage.DELIVERY]: ['CONSULTANT', 'MANAGER'],
  [RepairStage.FINISHED]: []
};
