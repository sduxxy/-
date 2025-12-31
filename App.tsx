
import React, { useState, useEffect, useMemo } from 'react';
import { RepairTask, RepairStage, Role, STAGE_ORDER, STAGE_PERMISSIONS, Staff } from './types';
import { INITIAL_TASKS, MOCK_USERS } from './constants';
import ManagerDashboard from './components/ManagerDashboard';
import WorkerDashboard from './components/WorkerDashboard';
import MaintenanceView from './components/MaintenanceView';
import { 
  Search, Plus, LayoutDashboard, ShieldAlert, Truck, 
  Hammer, Paintbrush, Menu, X, Settings, LogOut, User, Lock, ChevronRight
} from 'lucide-react';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<RepairTask[]>(INITIAL_TASKS);
  const [loggedInUser, setLoggedInUser] = useState<Staff | null>(null);
  const [view, setView] = useState<'DASHBOARD' | 'WORKER' | 'MAINTENANCE'>('DASHBOARD');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 初始化检查登录状态
  useEffect(() => {
    const savedUser = localStorage.getItem('repair_auth');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setLoggedInUser(user);
      // 非管理角色默认进入工作台
      if (user.role !== 'MANAGER' && user.role !== 'CONSULTANT') {
        setView('WORKER');
      }
    }
  }, []);

  // 任务持久化
  useEffect(() => {
    localStorage.setItem('repair_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleLogin = (user: Staff) => {
    setLoggedInUser(user);
    localStorage.setItem('repair_auth', JSON.stringify(user));
    if (user.role !== 'MANAGER' && user.role !== 'CONSULTANT') {
      setView('WORKER');
    } else {
      setView('DASHBOARD');
    }
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    localStorage.removeItem('repair_auth');
    setView('DASHBOARD');
  };

  const addTask = (taskData: any) => {
    const now = Date.now();
    const newTask: RepairTask = {
      ...taskData,
      id: Math.random().toString(36).substr(2, 9),
      currentStage: RepairStage.ASSESSMENT,
      isSparePartsReady: false,
      createdAt: now,
      history: [{ stage: RepairStage.ASSESSMENT, startTime: now, handler: loggedInUser?.name || '系统登记' }]
    };
    setTasks(prev => [newTask, ...prev]);
    setIsModalOpen(false);
  };

  const updateTaskRemarks = (taskId: string, newRemarks: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, remarks: newRemarks } : t));
  };

  const advanceTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !loggedInUser) return;
    if (!STAGE_PERMISSIONS[task.currentStage].includes(loggedInUser.role)) return;
    
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const idx = STAGE_ORDER.indexOf(t.currentStage);
        if (idx < STAGE_ORDER.length - 1) {
          const next = STAGE_ORDER[idx + 1];
          const history = [...t.history];
          history[history.length - 1].endTime = Date.now();
          if (next !== RepairStage.FINISHED) {
            history.push({ stage: next, startTime: Date.now(), handler: loggedInUser.name });
          }
          return { ...t, currentStage: next, history };
        }
      }
      return t;
    }));
  };

  const toggleSpareParts = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isSparePartsReady: !t.isSparePartsReady } : t));
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => 
      t.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tasks, searchTerm]);

  // 权限检查辅助函数
  const hasFullAccess = loggedInUser?.role === 'MANAGER' || loggedInUser?.role === 'CONSULTANT';

  // 登录界面
  if (!loggedInUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-500">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black mx-auto mb-4 shadow-xl shadow-blue-100">精</div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">精诚智管 · 业务系统</h1>
            <p className="text-slate-400 text-sm mt-1 font-bold">请选择您的账号登录以进入系统</p>
          </div>
          
          <div className="space-y-3">
            {MOCK_USERS.map(user => (
              <button 
                key={user.id}
                onClick={() => handleLogin(user)}
                className="w-full flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-blue-500 hover:bg-white hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-600 border border-slate-100">
                      {user.role === 'MANAGER' ? <Settings size={18}/> : user.role === 'CONSULTANT' ? <ShieldAlert size={18}/> : <User size={18}/>}
                   </div>
                   <div className="text-left">
                      <p className="font-black text-slate-800">{user.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user.role}</p>
                   </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
          
          <div className="mt-10 flex items-center justify-center gap-2 text-slate-300">
            <Lock size={12} />
            <span className="text-[10px] font-bold uppercase tracking-widest">企业级安全加密协议</span>
          </div>
        </div>
      </div>
    );
  }

  // 主界面组件内导航
  const NavItems = () => (
    <>
      {hasFullAccess && (
        <>
          <div className="pt-2 pb-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">管理面板</div>
          <button 
            onClick={() => { setView('DASHBOARD'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'DASHBOARD' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <LayoutDashboard size={18} /> <span className="text-sm">全局看板</span>
          </button>
          <button 
            onClick={() => { setView('MAINTENANCE'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'MAINTENANCE' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Settings size={18} /> <span className="text-sm">基础数据</span>
          </button>
        </>
      )}
      
      <div className="pt-4 pb-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">我的业务</div>
      <button 
        onClick={() => { setView('WORKER'); setIsMobileMenuOpen(false); }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'WORKER' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
      >
        <ShieldAlert size={18} /> <span className="text-sm">工单执行台</span>
      </button>

      <div className="mt-auto pt-8">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all"
        >
          <LogOut size={18} /> <span className="text-sm font-bold">退出登录</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* 侧边栏 */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">精</div>
          <span className="font-black text-lg tracking-tight text-slate-900">精诚智管</span>
        </div>
        <div className="p-4 border-b border-slate-50 bg-slate-50/50">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-black">
                {loggedInUser.name[0]}
              </div>
              <div className="overflow-hidden">
                <p className="font-black text-slate-800 text-sm truncate">{loggedInUser.name}</p>
                <p className="text-[10px] text-blue-600 font-bold uppercase">{loggedInUser.role}</p>
              </div>
           </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 flex flex-col"><NavItems /></nav>
      </aside>

      {/* 移动端菜单 */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white p-6 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="mb-8 flex items-center gap-3">
               <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl">精</div>
               <span className="font-black text-xl text-slate-900">精诚智管</span>
            </div>
            <NavItems />
          </div>
        </div>
      )}

      {/* 主体内容 */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between z-30">
          <div className="flex items-center gap-3 md:hidden">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">精</div>
             <span className="font-bold text-slate-900 text-sm">精诚智管</span>
          </div>
          
          <div className="hidden md:relative md:block md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="快速搜索车牌、联系人..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-10 pr-4 py-1.5 bg-slate-100 border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20" 
            />
          </div>

          <div className="flex items-center gap-2">
            {loggedInUser.role === 'CONSULTANT' || loggedInUser.role === 'MANAGER' ? (
              <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 md:px-5 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-bold shadow-sm active:scale-95">
                <Plus size={16} /> <span>接车登记</span>
              </button>
            ) : null}
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-slate-100 rounded-lg md:hidden text-slate-600"><Menu size={20} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
          {view === 'DASHBOARD' && hasFullAccess && (
            <ManagerDashboard tasks={filteredTasks} onToggleParts={toggleSpareParts} onUpdateRemarks={updateTaskRemarks} />
          )}
          {view === 'WORKER' && (
            <WorkerDashboard 
              tasks={filteredTasks} 
              role={loggedInUser.role} 
              onComplete={advanceTask} 
              onToggleParts={toggleSpareParts} 
              onUpdateRemarks={updateTaskRemarks} 
            />
          )}
          {view === 'MAINTENANCE' && hasFullAccess && (
            <MaintenanceView staff={MOCK_USERS} insurers={[]} vehicles={[]} tasks={tasks} onUpdateStaff={()=>{}} onUpdateInsurers={()=>{}} onUpdateVehicles={()=>{}} />
          )}
          
          {/* 无权访问提示 */}
          {!hasFullAccess && view !== 'WORKER' && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <Lock size={48} className="text-slate-200 mb-4" />
              <h3 className="text-xl font-black text-slate-800">访问受限</h3>
              <p className="text-slate-400 mt-2">您的账号角色权限不足以查看此管理模块</p>
              <button onClick={() => setView('WORKER')} className="mt-6 bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">返回工作台</button>
            </div>
          )}
        </div>

        {/* 底部导航 (移动端) */}
        <nav className="md:hidden bg-white border-t border-slate-200 px-6 py-2 flex justify-around items-center z-40">
           {hasFullAccess && (
             <button onClick={() => setView('DASHBOARD')} className={`flex flex-col items-center gap-1 ${view === 'DASHBOARD' ? 'text-blue-600' : 'text-slate-400'}`}>
               <LayoutDashboard size={20} /> <span className="text-[10px] font-bold">看板</span>
             </button>
           )}
           <button onClick={() => setView('WORKER')} className={`flex flex-col items-center gap-1 ${view === 'WORKER' ? 'text-blue-600' : 'text-slate-400'}`}>
             <ShieldAlert size={20} /> <span className="text-[10px] font-bold">工作台</span>
           </button>
           <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-rose-400">
             <LogOut size={20} /> <span className="text-[10px] font-bold">退出</span>
           </button>
        </nav>
      </main>

      {/* 登记弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-black text-slate-800">新到事故车登记</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2"><X size={20} className="text-slate-400" /></button>
            </div>
            <form className="p-6 sm:p-8 space-y-4" onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              addTask({
                licensePlate: fd.get('plate') as string,
                contactPerson: fd.get('contact') as string,
                insuranceCompany: fd.get('insurance') as string,
                assessmentAmount: Number(fd.get('amount')),
                expectedDeliveryTime: new Date(fd.get('expected') as string).getTime(),
                remarks: fd.get('remarks') as string
              });
            }}>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">车牌号码</label>
                <input required name="plate" placeholder="粤A·88888" className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 font-bold text-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">联系人</label>
                  <input required name="contact" placeholder="姓名" className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">预计交车时间</label>
                  <input required type="datetime-local" name="expected" className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">保险公司与定损</label>
                <div className="grid grid-cols-2 gap-3">
                   <input required name="insurance" placeholder="承保公司" className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none" />
                   <input required type="number" name="amount" placeholder="预估金额" className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">事故简述/备注</label>
                <textarea name="remarks" rows={2} placeholder="车损位置、代位赔偿等关键信息..." className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 text-sm"></textarea>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-xl mt-4 shadow-lg shadow-blue-100 active:scale-[0.98] transition-all">创建维修单并分派定损</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
