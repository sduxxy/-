
import { RepairStage, RepairTask, StageHistory, Staff } from './types';

export const MOCK_USERS: Staff[] = [
  { id: 'S001', name: '王总监', role: 'MANAGER' },
  { id: 'S002', name: '李理赔', role: 'CONSULTANT' },
  { id: 'S003', name: '张钣金', role: 'METALWORKER' },
  { id: 'S004', name: '赵喷漆', role: 'PAINTER' },
  { id: 'S005', name: '钱备件', role: 'SPARE_PARTS' },
];

export const STAGE_COLORS: Record<RepairStage, string> = {
  [RepairStage.ASSESSMENT]: 'bg-purple-600 text-white border-purple-700 shadow-sm shadow-purple-100',
  [RepairStage.METALWORK]: 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-100',
  [RepairStage.PAINTING]: 'bg-emerald-600 text-white border-emerald-700 shadow-sm shadow-emerald-100',
  [RepairStage.DELIVERY]: 'bg-indigo-600 text-white border-indigo-700 shadow-sm shadow-indigo-100',
  [RepairStage.FINISHED]: 'bg-slate-400 text-white border-slate-500',
};

const generateMockTasks = (): RepairTask[] => {
  const surnames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴'];
  const prefixes = ['粤A', '京B', '沪C', '苏E', '浙F'];
  const insurers = ['中国平安', '中国人保', '太平洋保险'];
  const stages = [RepairStage.ASSESSMENT, RepairStage.METALWORK, RepairStage.PAINTING, RepairStage.DELIVERY, RepairStage.FINISHED];
  
  const tasks: RepairTask[] = [];
  const now = Date.now();

  for (let i = 0; i < 10; i++) {
    const id = `task-${i + 1}`;
    const plate = `${prefixes[Math.floor(Math.random() * prefixes.length)]}·${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const contact = `${surnames[Math.floor(Math.random() * surnames.length)]}先生`;
    const insurer = insurers[Math.floor(Math.random() * insurers.length)];
    
    let amount = Math.floor(Math.random() * 15000) + 500;
    const createdAt = now - Math.floor(Math.random() * 5 * 24 * 3600000);
    const expectedDeliveryTime = createdAt + (Math.floor(Math.random() * 4) + 2) * 24 * 3600000;
    const stageIdx = Math.floor(Math.random() * stages.length);
    
    const history: StageHistory[] = [];
    let currentTime = createdAt;
    for (let j = 0; j <= stageIdx; j++) {
      const startTime = currentTime;
      const endTime = (j < stageIdx) ? startTime + 3600000 * 4 : undefined;
      history.push({ stage: stages[j], startTime, endTime, handler: '系统模拟' });
      if (endTime) currentTime = endTime + 3600000;
    }

    tasks.push({
      id, licensePlate: plate, contactPerson: contact, insuranceCompany: insurer,
      assessmentAmount: amount, expectedDeliveryTime, currentStage: stages[stageIdx],
      isSparePartsReady: Math.random() > 0.4, remarks: '演示数据备注', createdAt, history
    });
  }
  return tasks;
};

export const INITIAL_TASKS: RepairTask[] = generateMockTasks();

export const KPI_TREND_DATA = [
  { name: '第1周', assessment: 85, delivery: 78 },
  { name: '第2周', assessment: 88, delivery: 82 },
  { name: '第3周', assessment: 92, delivery: 80 },
  { name: '第4周', assessment: 89, delivery: 85 },
  { name: '第5周', assessment: 94, delivery: 89 },
];
