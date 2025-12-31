
import React, { useMemo, useState } from 'react';
import { RepairTask, RepairStage, Role, STAGE_PERMISSIONS } from '../types';
import { 
  CheckCircle2, Clock, Package, Truck, AlertCircle, 
  Coins, User, ShieldAlert, ChevronRight, Hammer, Paintbrush, 
  SearchCheck, Send, CalendarClock, ShieldCheck, MessageSquare, Edit3
} from 'lucide-react';

interface Props {
  tasks: RepairTask[];
  role: Role;
  onComplete: (taskId: string) => void;
  onToggleParts: (taskId: string) => void;
  onUpdateRemarks: (taskId: string, newRemarks: string) => void;
}

const STAGE_ACTION_LABELS: Record<RepairStage, string> = {
  [RepairStage.ASSESSMENT]: '完成定损',
  [RepairStage.METALWORK]: '钣金完工',
  [RepairStage.PAINTING]: '喷漆完工',
  [RepairStage.DELIVERY]: '确认交车',
  [RepairStage.FINISHED]: '归档',
};

interface TaskCardProps {
  task: RepairTask;
  role: Role;
  onComplete: (taskId: string) => void;
  onToggleParts: (taskId: string) => void;
  onUpdateRemarks: (taskId: string, newRemarks: string) => void;
  compact?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, role, onComplete, onToggleParts, onUpdateRemarks, compact = false }) => {
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const isAllowedToAdvance = STAGE_PERMISSIONS[task.currentStage].includes(role);
  const isAllowedToToggleParts = role === 'SPARE_PARTS' || role === 'MANAGER' || role === 'CONSULTANT';
  const isOverdue = Date.now() > task.expectedDeliveryTime;
  const isSmallRepair = task.assessmentAmount < 2000;
  
  return (
    <div className={`bg-white border rounded-[32px] p-5 flex flex-col md:flex-row gap-5 md:items-center transition-all shadow-sm ${compact ? 'border-slate-100 opacity-80' : 'border-blue-100 ring-1 ring-blue-50/50'} ${isOverdue && !compact ? 'border-rose-200 ring-rose-50' : ''}`}>
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`font-black tracking-tight ${compact ? 'text-slate-700 text-base' : 'text-slate-900 text-3xl'}`}>
              {task.licensePlate}
            </span>
            <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${task.isSparePartsReady ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
              {task.isSparePartsReady ? '备件齐' : '缺件中'}
            </div>
            {isSmallRepair && (
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-600 border border-purple-100 uppercase">
                小额快修
              </div>
            )}
          </div>
          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
            task.currentStage === RepairStage.ASSESSMENT ? 'bg-purple-100 text-purple-700' :
            task.currentStage === RepairStage.DELIVERY ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
          }`}>
            当前：{task.currentStage}
          </span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 py-1">
          <div className="space-y-0.5">
            <p className="text-[9px] font-black text-slate-400 uppercase">进厂时间</p>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <Clock size={12} className="text-slate-300" />
              {new Date(task.createdAt).toLocaleString([], {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
            </div>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-black text-slate-400 uppercase">交付时限</p>
            <div className={`flex items-center gap-1.5 text-xs font-black ${isOverdue ? 'text-rose-600' : 'text-emerald-600'}`}>
              <CalendarClock size={12} />
              {new Date(task.expectedDeliveryTime).toLocaleDateString()}
            </div>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-black text-slate-400 uppercase">定损金额</p>
            <div className="flex items-center gap-1.5 text-xs font-black text-blue-600">￥{task.assessmentAmount}</div>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-black text-slate-400 uppercase">联系人</p>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 truncate"><User size={12} className="text-slate-300"/>{task.contactPerson}</div>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-black text-slate-400 uppercase">保险公司</p>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 truncate"><ShieldCheck size={12} className="text-slate-300"/>{task.insuranceCompany}</div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 group">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase">
              <MessageSquare size={12} /> 备注信息
            </div>
            {!isEditingRemarks && (
              <button onClick={() => setIsEditingRemarks(true)} className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-bold text-blue-600">
                <Edit3 size={10} /> 编辑
              </button>
            )}
          </div>
          {isEditingRemarks ? (
            <textarea
              autoFocus
              className="w-full bg-white border-2 border-blue-100 rounded-lg p-2 text-xs font-medium text-slate-700 outline-none"
              rows={2}
              defaultValue={task.remarks}
              onBlur={(e) => {
                onUpdateRemarks(task.id, e.target.value);
                setIsEditingRemarks(false);
              }}
            />
          ) : (
            <p className="text-xs font-medium text-slate-600 leading-relaxed cursor-text" onClick={() => setIsEditingRemarks(true)}>
              {task.remarks || '暂无备注...'}
            </p>
          )}
        </div>

        {!compact && isAllowedToToggleParts && (
          <button onClick={() => onToggleParts(task.id)} className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all flex items-center justify-center gap-2 ${task.isSparePartsReady ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            <Package size={14} /> {task.isSparePartsReady ? '登记缺件' : '标记配件已齐'}
          </button>
        )}
      </div>

      <div className={compact ? 'min-w-[120px]' : 'min-w-[180px] md:border-l md:pl-8 border-slate-100'}>
        {isAllowedToAdvance ? (
          <button onClick={() => onComplete(task.id)} className="w-full py-5 rounded-2xl font-black text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-100 flex flex-col items-center gap-1">
            <CheckCircle2 size={24}/>
            {STAGE_ACTION_LABELS[task.currentStage]}
          </button>
        ) : (
          <div className="text-center py-5 px-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center gap-2 opacity-60">
            <Clock size={18} className="text-slate-300" />
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">等待施工</div>
          </div>
        )}
      </div>
    </div>
  );
};

const WorkerDashboard: React.FC<Props> = ({ tasks, role, onComplete, onToggleParts, onUpdateRemarks }) => {
  const isManagement = role === 'MANAGER' || role === 'CONSULTANT';
  
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.currentStage === RepairStage.FINISHED) return false;
      if (isManagement || role === 'SPARE_PARTS') return true;
      if (role === 'METALWORKER') return t.currentStage === RepairStage.METALWORK;
      if (role === 'PAINTER') return t.currentStage === RepairStage.PAINTING;
      return false;
    });
  }, [tasks, role]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24">
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-slate-900 rounded-[22px] flex items-center justify-center text-white shadow-2xl">
            {role === 'METALWORKER' ? <Hammer size={28}/> : role === 'PAINTER' ? <Paintbrush size={28}/> : <ShieldAlert size={28}/>}
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              {role === 'METALWORKER' ? '钣金车间工作台' : role === 'PAINTER' ? '喷漆车间工作台' : role === 'SPARE_PARTS' ? '备件清单' : '理赔业务台'}
            </h2>
            <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">
              当前有 {filteredTasks.length} 台待处理车辆
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {filteredTasks.length > 0 ? (
          filteredTasks.map(task => (
            <TaskCard key={task.id} task={task} role={role} onComplete={onComplete} onToggleParts={onToggleParts} onUpdateRemarks={onUpdateRemarks} />
          ))
        ) : (
          <div className="py-24 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
            <CheckCircle2 size={64} className="mx-auto text-emerald-100 mb-6" />
            <p className="text-slate-400 font-black text-xl">目前没有待处理任务</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerDashboard;
