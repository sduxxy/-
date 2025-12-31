
import React, { useMemo, useState } from 'react';
import { RepairTask, RepairStage, STAGE_ORDER } from '../types';
import { STAGE_COLORS, KPI_TREND_DATA } from '../constants';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, AreaChart, Area, LabelList
} from 'recharts';
import { 
  Clock, Activity, Package, CheckCircle2, ListFilter, 
  ShieldCheck, AlertCircle, Calendar, Coins, Timer, TrendingUp, CalendarDays, ChevronRight, X, MessageSquare, Zap
} from 'lucide-react';

interface Props {
  tasks: RepairTask[];
  onToggleParts: (taskId: string) => void;
  onUpdateRemarks: (taskId: string, newRemarks: string) => void;
}

// 工作时间计算逻辑 (9:00 - 18:00)
const getWorkingHoursDeadline = (startTime: number, hoursNeeded: number): number => {
  const WORK_START = 9;
  const WORK_END = 18;
  let current = new Date(startTime);
  let remainingMs = hoursNeeded * 3600000;

  // 如果进厂时间早于9点，从当日9点开始算
  if (current.getHours() < WORK_START) {
    current.setHours(WORK_START, 0, 0, 0);
  }
  // 如果进厂时间晚于18点，从次日9点开始算
  if (current.getHours() >= WORK_END) {
    current.setDate(current.getDate() + 1);
    current.setHours(WORK_START, 0, 0, 0);
  }

  while (remainingMs > 0) {
    let todayEnd = new Date(current);
    todayEnd.setHours(WORK_END, 0, 0, 0);
    
    // 计算当前时间到当日下班还剩多少毫秒
    let timeLeftToday = todayEnd.getTime() - current.getTime();
    
    if (timeLeftToday >= remainingMs) {
      // 可以在当日完成
      return current.getTime() + remainingMs;
    } else {
      // 扣除当日剩余工作时间，跳到次日9点
      remainingMs -= timeLeftToday;
      current.setDate(current.getDate() + 1);
      current.setHours(WORK_START, 0, 0, 0);
    }
  }
  return current.getTime();
};

const ManagerDashboard: React.FC<Props> = ({ tasks, onUpdateRemarks }) => {
  const [activeTrend, setActiveTrend] = useState<'ASSESSMENT' | 'DELIVERY' | 'FAST_REPAIR' | null>(null);
  const [editingRemarksId, setEditingRemarksId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const active = tasks.filter(t => t.currentStage !== RepairStage.FINISHED);
    let overdueCount = 0;
    
    let assessmentEligible = 0;
    let assessmentPassed = 0;
    let deliveryEligible = 0;
    let deliveryPassed = 0;
    
    // 小额快修指标统计
    let smallRepairEligible = 0;
    let smallRepairPassed = 0;

    tasks.forEach(task => {
      const isSmallRepair = task.assessmentAmount < 2000;
      const isFinished = task.currentStage === RepairStage.FINISHED;
      const finalHistory = task.history[task.history.length - 1];
      const actualFinishTime = isFinished ? (finalHistory?.endTime || Date.now()) : Date.now();

      // 定损时效 SLA
      const assessmentDone = task.history.find(h => h.stage === RepairStage.ASSESSMENT && h.endTime);
      const targetTime = task.assessmentAmount < 2000 ? 4 : (task.assessmentAmount <= 10000 ? 48 : null);
      if (targetTime) {
        assessmentEligible++;
        const deadline = task.assessmentAmount < 2000 
          ? getWorkingHoursDeadline(task.createdAt, 4) 
          : task.createdAt + 48 * 3600000;
        const finishTime = assessmentDone?.endTime || Date.now();
        if (finishTime <= deadline) assessmentPassed++;
      }

      // 预计交车达成率
      if (isFinished || Date.now() > task.expectedDeliveryTime) {
        deliveryEligible++;
        if (actualFinishTime <= task.expectedDeliveryTime) deliveryPassed++;
      }

      // 小额快修达成率 (2000元以下，8个工作小时内交付)
      if (isSmallRepair) {
        smallRepairEligible++;
        const fastRepairDeadline = getWorkingHoursDeadline(task.createdAt, 8);
        if (actualFinishTime <= fastRepairDeadline) {
          smallRepairPassed++;
        }
      }

      // 超期预警统计
      let isAssOver = false;
      let isDelOver = Date.now() > task.expectedDeliveryTime;
      if (task.currentStage === RepairStage.ASSESSMENT && targetTime) {
        const deadline = task.assessmentAmount < 2000 
          ? getWorkingHoursDeadline(task.createdAt, 4) 
          : task.createdAt + 48 * 3600000;
        isAssOver = Date.now() > deadline;
      }
      if (isAssOver || isDelOver) overdueCount++;
    });

    const totalAmount = tasks.reduce((sum, t) => sum + t.assessmentAmount, 0);

    return { 
      active: active.length, 
      overdue: overdueCount,
      totalAmount: totalAmount.toLocaleString(),
      partsLack: active.filter(t => !t.isSparePartsReady).length,
      assessmentSLARate: assessmentEligible > 0 ? Math.round((assessmentPassed / assessmentEligible) * 100) : 100,
      onTimeDeliveryRate: deliveryEligible > 0 ? Math.round((deliveryPassed / deliveryEligible) * 100) : 100,
      fastRepairRate: smallRepairEligible > 0 ? Math.round((smallRepairPassed / smallRepairEligible) * 100) : 100
    };
  }, [tasks]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* 核心指标看板 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:border-blue-400 transition-all">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">站场总负荷</p>
          <div className="flex items-end justify-between mt-2">
             <h4 className="text-2xl font-black text-slate-900">{stats.active}<span className="text-xs ml-1 font-bold text-slate-400">台</span></h4>
             <Activity size={20} className="text-blue-500 mb-1" />
          </div>
        </div>
        
        <button 
          onClick={() => setActiveTrend('ASSESSMENT')}
          className="bg-blue-600 p-4 rounded-2xl shadow-lg flex flex-col justify-between hover:scale-[1.02] active:scale-95 transition-all text-left group"
        >
          <div className="flex justify-between items-start">
            <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest">定损时效达标率</p>
            <ChevronRight size={14} className="text-blue-200 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
          </div>
          <div className="flex items-end justify-between mt-2">
             <h4 className="text-2xl font-black text-white">{stats.assessmentSLARate}%</h4>
             <TrendingUp size={20} className="text-blue-200 mb-1" />
          </div>
        </button>

        <button 
          onClick={() => setActiveTrend('FAST_REPAIR')}
          className="bg-purple-600 p-4 rounded-2xl shadow-lg flex flex-col justify-between hover:scale-[1.02] active:scale-95 transition-all text-left group"
        >
          <div className="flex justify-between items-start">
            <p className="text-purple-100 text-[10px] font-black uppercase tracking-widest">小额快修达成率</p>
            <ChevronRight size={14} className="text-purple-200 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
          </div>
          <div className="flex items-end justify-between mt-2">
             <h4 className="text-2xl font-black text-white">{stats.fastRepairRate}%</h4>
             <Zap size={20} className="text-purple-200 mb-1" />
          </div>
        </button>

        <button 
          onClick={() => setActiveTrend('DELIVERY')}
          className="bg-slate-900 p-4 rounded-2xl shadow-lg flex flex-col justify-between hover:scale-[1.02] active:scale-95 transition-all text-left group"
        >
          <div className="flex justify-between items-start">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">预计交车达成率</p>
            <ChevronRight size={14} className="text-slate-500 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
          </div>
          <div className="flex items-end justify-between mt-2">
             <h4 className="text-2xl font-black text-white">{stats.onTimeDeliveryRate}%</h4>
             <CheckCircle2 size={20} className="text-emerald-400 mb-1" />
          </div>
        </button>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:border-rose-400 transition-all">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">超期预警</p>
          <div className="flex items-end justify-between mt-2">
             <h4 className="text-2xl font-black text-rose-600">{stats.overdue}<span className="text-xs ml-1 font-bold text-slate-400">单</span></h4>
             <AlertCircle size={20} className="text-rose-500 mb-1" />
          </div>
        </div>
      </div>

      {/* 趋势图 overlay */}
      {activeTrend && (
        <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-xl shadow-blue-50/50 animate-in slide-in-from-top-4 duration-500">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTrend === 'ASSESSMENT' ? 'bg-blue-100 text-blue-600' : activeTrend === 'FAST_REPAIR' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-800'}`}>
                {activeTrend === 'ASSESSMENT' ? <TrendingUp size={20}/> : activeTrend === 'FAST_REPAIR' ? <Zap size={20}/> : <CheckCircle2 size={20}/>}
              </div>
              <div>
                <h4 className="font-black text-slate-800 tracking-tight">
                  {activeTrend === 'ASSESSMENT' ? '定损时效达标率' : activeTrend === 'FAST_REPAIR' ? '小额快修达成率' : '预计交车达成率'} - 周趋势
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase">数据自动更新 · 近5周统计</p>
              </div>
            </div>
            <button onClick={() => setActiveTrend(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={KPI_TREND_DATA} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={activeTrend === 'ASSESSMENT' ? '#3b82f6' : activeTrend === 'FAST_REPAIR' ? '#8b5cf6' : '#10b981'} stopOpacity={0.1}/>
                    <stop offset="95%" stopColor={activeTrend === 'ASSESSMENT' ? '#3b82f6' : activeTrend === 'FAST_REPAIR' ? '#8b5cf6' : '#10b981'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} tickFormatter={(val) => `${val}%`} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}}
                  cursor={{stroke: '#e2e8f0'}}
                  formatter={(val: number) => [`${val}%`, activeTrend === 'ASSESSMENT' ? '定损时效' : activeTrend === 'FAST_REPAIR' ? '小额快修' : '预计达成']}
                />
                <Area 
                  type="monotone" 
                  dataKey={activeTrend === 'ASSESSMENT' ? 'assessment' : (activeTrend === 'FAST_REPAIR' ? 'assessment' : 'delivery')}
                  stroke={activeTrend === 'ASSESSMENT' ? '#3b82f6' : activeTrend === 'FAST_REPAIR' ? '#8b5cf6' : '#10b981'} 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                >
                  <LabelList 
                    dataKey={activeTrend === 'ASSESSMENT' ? 'assessment' : (activeTrend === 'FAST_REPAIR' ? 'assessment' : 'delivery')} 
                    position="top" 
                    offset={12}
                    formatter={(val: number) => `${val}%`}
                    style={{ fontSize: '11px', fontWeight: '800', fill: activeTrend === 'ASSESSMENT' ? '#2563eb' : activeTrend === 'FAST_REPAIR' ? '#7c3aed' : '#059669' }}
                  />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 车间流转状态 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base md:text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ListFilter size={20} className="text-blue-500" />
            车间实时动态
          </h3>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
          {STAGE_ORDER.filter(s => s !== RepairStage.FINISHED).map(stage => {
            const stageTasks = tasks.filter(t => t.currentStage === stage);
            return (
              <div key={stage} className="flex-shrink-0 w-[240px] md:w-80 space-y-3">
                <div className={`p-3 rounded-xl flex items-center justify-between ${STAGE_COLORS[stage]} shadow-sm`}>
                   <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-black text-xs">{stageTasks.length}</div>
                      <h4 className="font-bold text-sm tracking-widest">{stage}</h4>
                   </div>
                </div>
                <div className="space-y-2 max-h-[600px] overflow-y-auto px-0.5 custom-scrollbar">
                  {stageTasks.length > 0 ? stageTasks.map(task => {
                    const isDelOver = Date.now() > task.expectedDeliveryTime;
                    const isSmallRepair = task.assessmentAmount < 2000;
                    let isAssOver = false;
                    if (task.currentStage === RepairStage.ASSESSMENT) {
                       const hoursLimit = task.assessmentAmount < 2000 ? 4 : (task.assessmentAmount <= 10000 ? 48 : null);
                       if (hoursLimit === 4) isAssOver = Date.now() > getWorkingHoursDeadline(task.createdAt, 4);
                       else if (hoursLimit === 48) isAssOver = Date.now() > task.createdAt + 48 * 3600000;
                    }
                    
                    const remainingHours = Math.round((task.expectedDeliveryTime - Date.now()) / 3600000);

                    return (
                      <div key={task.id} className={`bg-white p-3.5 rounded-2xl shadow-sm border transition-all ${isAssOver || isDelOver ? 'border-rose-400 ring-1 ring-rose-50' : 'border-slate-100 hover:border-blue-200'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-slate-900 text-base tracking-tight">{task.licensePlate}</span>
                          <div className="flex flex-col items-end gap-1">
                            {isAssOver && <span className="text-[8px] font-black text-rose-500 bg-rose-50 px-1 py-0.5 rounded border border-rose-100">定损超时</span>}
                            {isDelOver && <span className="text-[8px] font-black text-rose-600 bg-rose-100 px-1 py-0.5 rounded animate-pulse">交付超期</span>}
                            {isSmallRepair && <span className="text-[8px] font-black text-purple-600 bg-purple-50 px-1 py-0.5 rounded border border-purple-100">小额快修</span>}
                            {!isDelOver && !isSmallRepair && remainingHours <= 24 && remainingHours > 0 && <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-100">24h内交付</span>}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-2">
                           <div className="bg-slate-50 p-1.5 rounded-lg">
                              <p className="text-[8px] text-slate-400 font-bold uppercase">定损金额</p>
                              <p className="text-xs font-black text-slate-700">￥{task.assessmentAmount}</p>
                           </div>
                           <div className="bg-slate-50 p-1.5 rounded-lg">
                              <p className="text-[8px] text-slate-400 font-bold uppercase">联系人</p>
                              <p className="text-xs font-bold text-slate-700 truncate">{task.contactPerson}</p>
                           </div>
                        </div>

                        {/* 备注区域 */}
                        <div className="mb-3 px-1.5 py-1 bg-amber-50/30 rounded-lg border border-amber-100/30">
                          {editingRemarksId === task.id ? (
                            <textarea 
                              autoFocus
                              className="w-full bg-transparent text-[10px] text-slate-600 outline-none border-none resize-none p-0 leading-tight font-medium"
                              defaultValue={task.remarks}
                              onBlur={(e) => {
                                onUpdateRemarks(task.id, e.target.value);
                                setEditingRemarksId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  onUpdateRemarks(task.id, (e.target as HTMLTextAreaElement).value);
                                  setEditingRemarksId(null);
                                }
                              }}
                            />
                          ) : (
                            <div 
                              onClick={() => setEditingRemarksId(task.id)}
                              className="flex items-start gap-1 cursor-pointer group"
                            >
                              <MessageSquare size={10} className="text-amber-500 mt-0.5 shrink-0" />
                              <p className="text-[10px] text-slate-500 leading-tight font-medium line-clamp-2">
                                {task.remarks || '点击添加备注...'}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-slate-50">
                           <div className="flex items-center gap-1.5 text-[10px]">
                              <Clock size={12} className="text-slate-300" />
                              <span className="text-slate-400 font-bold">进厂: {new Date(task.createdAt).toLocaleString([], {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                           </div>
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-[10px]">
                                 <CalendarDays size={12} className="text-slate-300" />
                                 <span className={`font-bold ${isDelOver ? 'text-rose-500' : 'text-slate-500'}`}>
                                   交付: {new Date(task.expectedDeliveryTime).toLocaleDateString()} {new Date(task.expectedDeliveryTime).getHours()}:00
                                 </span>
                              </div>
                              <div className={`w-2 h-2 rounded-full ${task.isSparePartsReady ? 'bg-emerald-400' : 'bg-amber-400'}`} title={task.isSparePartsReady ? '备件齐' : '缺件'}></div>
                           </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="py-10 flex flex-col items-center justify-center text-slate-200 border-2 border-dashed border-slate-100 rounded-2xl text-[10px] font-black uppercase">空置中</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 产值分布与统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
           <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
            <Coins size={18} className="text-amber-500" /> 产值结构分析
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={[
                    { name: '小额 (<2k)', value: tasks.filter(t=>t.assessmentAmount < 2000).length },
                    { name: '中额 (2k-10k)', value: tasks.filter(t=>t.assessmentAmount >= 2000 && t.assessmentAmount <= 10000).length },
                    { name: '大额 (>10k)', value: tasks.filter(t=>t.assessmentAmount > 10000).length }
                  ]}
                  innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                >
                  <Cell fill="#3b82f6" /><Cell fill="#8b5cf6" /><Cell fill="#f59e0b" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col">
           <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
            <TrendingUp size={18} className="text-emerald-500" /> 业务趋势概览
          </h4>
          <div className="flex-1 flex flex-col justify-center space-y-4">
             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <span className="text-xs font-bold text-slate-500">在场总价值</span>
                <span className="text-xl font-black text-slate-900">￥{stats.totalAmount}</span>
             </div>
             <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                   <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">已完工数</p>
                   <p className="text-lg font-black text-emerald-700">{tasks.filter(t=>t.currentStage === RepairStage.FINISHED).length}</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                   <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">正在维修</p>
                   <p className="text-lg font-black text-blue-700">{stats.active}</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
