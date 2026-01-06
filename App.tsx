
import React, { useState, useEffect, useMemo } from 'react';
import { RepairTask, RepairStage, Role, STAGE_ORDER, STAGE_PERMISSIONS, Staff, ROLE_LABELS } from './types';
import ManagerDashboard from './components/ManagerDashboard';
import WorkerDashboard from './components/WorkerDashboard';
import MaintenanceView from './components/MaintenanceView';
import { 
  Search, Plus, LayoutDashboard, ShieldAlert, Truck, 
  Hammer, Paintbrush, Menu, X, Settings, LogOut, User as UserIcon, Lock, ChevronRight, Loader2,
  AlertCircle, Building2, Globe, Filter, FileText, Coins, ShieldCheck
} from 'lucide-react';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<RepairTask[]>([]);
  const [loggedInUser, setLoggedInUser] = useState<Staff | null>(null);
  const [view, setView] = useState<'DASHBOARD' | 'WORKER' | 'MAINTENANCE'>('DASHBOARD');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShopFilter, setSelectedShopFilter] = useState<string>('ALL'); // 总部人员专用过滤器
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAV = () => (window as any).AV;

  const isHQ = loggedInUser?.role === 'HQ_OPERATOR';

  const getTomorrowDefaultTime = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(17, 0, 0, 0);
    return date.toISOString().slice(0, 16);
  };

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 50;

    const performInit = async (AV: any) => {
      try {
        if (!AV.applicationId) {
          AV.init({
            appId: "7gNAZ1e3dGH3L8EcunAUH1ud-gzGzoHsz",
            appKey: "CGvlUiDgQdgYO04uek5fXR3C",
            serverURL: "https://7gnaz1e3.lc-cn-n1-shared.com"
          });
        }

        const currentUser = AV.User.current();
        if (currentUser) {
          const staff: Staff = {
            id: currentUser.id,
            shopId: currentUser.get('shopId') || '精诚总店', 
            username: currentUser.get('username'),
            name: currentUser.get('name'),
            role: currentUser.get('role')
          };
          setLoggedInUser(staff);
          if (staff.role !== 'MANAGER' && staff.role !== 'CONSULTANT' && staff.role !== 'HQ_OPERATOR') {
            setView('WORKER');
          }
          await fetchTasks(staff);
        } else {
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error("初始化失败:", err);
        setError("连接数据库失败: " + (err.message || "未知网络错误"));
        setIsLoading(false);
      }
    };

    const interval = setInterval(() => {
      const AV = getAV();
      if (AV) {
        clearInterval(interval);
        performInit(AV);
      } else {
        retryCount++;
        if (retryCount >= maxRetries) {
          clearInterval(interval);
          setError("数据库驱动加载超时，请检查网络。");
          setIsLoading(false);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async (user?: Staff) => {
    const AV = getAV();
    if (!AV) return;
    
    const activeUser = user || loggedInUser;
    if (!activeUser) return;

    setIsLoading(true);
    try {
      const query = new AV.Query('RepairTask');
      if (activeUser.role !== 'HQ_OPERATOR') {
        query.equalTo('shopId', activeUser.shopId);
      } else if (selectedShopFilter !== 'ALL') {
        query.equalTo('shopId', selectedShopFilter);
      }
      
      query.descending('createdAt');
      query.limit(500); 
      const results = await query.find();
      const mappedTasks: RepairTask[] = results.map((item: any) => ({
        id: item.id,
        shopId: item.get('shopId'), 
        licensePlate: item.get('licensePlate'),
        contactPerson: item.get('contactPerson'),
        insuranceCompany: item.get('insuranceCompany'),
        assessmentAmount: item.get('assessmentAmount'),
        expectedDeliveryTime: item.get('expectedDeliveryTime'),
        currentStage: item.get('currentStage'),
        isSparePartsReady: item.get('isSparePartsReady'),
        remarks: item.get('remarks'),
        entryTime: item.get('entryTime'),
        history: item.get('history') || []
      }));
      setTasks(mappedTasks);
    } catch (error: any) {
      if (error.code === 101) setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (loggedInUser) fetchTasks();
  }, [selectedShopFilter]);

  const allShops = useMemo(() => {
    const shops = new Set<string>();
    tasks.forEach(t => shops.add(t.shopId));
    if (loggedInUser) shops.add(loggedInUser.shopId);
    return Array.from(shops);
  }, [tasks, loggedInUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const AV = getAV();
    if (!AV) return;

    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const username = fd.get('username') as string;
    const password = fd.get('password') as string;

    try {
      const user = await AV.User.logIn(username, password);
      const staff: Staff = {
        id: user.id,
        shopId: user.get('shopId') || '精诚总店',
        username: user.get('username'),
        name: user.get('name'),
        role: user.get('role')
      };
      setLoggedInUser(staff);
      if (staff.role !== 'MANAGER' && staff.role !== 'CONSULTANT' && staff.role !== 'HQ_OPERATOR') {
        setView('WORKER');
      } else {
        setView('DASHBOARD');
      }
      fetchTasks(staff);
    } catch (error: any) {
      alert('登录失败: ' + (error.message || '账号或密码错误'));
    }
  };

  const handleLogout = () => {
    const AV = getAV();
    if (AV) AV.User.logOut();
    setLoggedInUser(null);
    setView('DASHBOARD');
  };

  const addTask = async (taskData: any) => {
    const AV = getAV();
    if (!AV || !loggedInUser) return;

    setIsSubmitting(true);
    try {
      const RepairTaskObj = AV.Object.extend('RepairTask');
      const task = new RepairTaskObj();
      
      const now = Date.now();
      const history = [{ stage: RepairStage.ASSESSMENT, startTime: now, handler: loggedInUser?.name || '系统登记' }];
      
      task.set('shopId', taskData.shopId || loggedInUser.shopId);
      task.set('licensePlate', taskData.licensePlate);
      task.set('contactPerson', taskData.contactPerson);
      task.set('insuranceCompany', taskData.insuranceCompany);
      task.set('assessmentAmount', taskData.assessmentAmount);
      task.set('expectedDeliveryTime', taskData.expectedDeliveryTime);
      task.set('remarks', taskData.remarks);
      task.set('currentStage', RepairStage.ASSESSMENT);
      task.set('isSparePartsReady', false);
      task.set('entryTime', now);
      task.set('history', history);

      await task.save();
      await fetchTasks(); 
      setIsModalOpen(false);
      alert('✅ 登记成功');
    } catch (error: any) {
      alert('保存失败: ' + (error.message || '请检查网络连接'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTaskOnCloud = async (taskId: string, updateData: Partial<RepairTask>) => {
    const AV = getAV();
    if (!AV) return;
    try {
      const task = AV.Object.createWithoutData('RepairTask', taskId);
      for (const key in updateData) {
        task.set(key, (updateData as any)[key]);
      }
      await task.save();
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updateData } : t));
    } catch (error) {
      console.error('更新失败:', error);
    }
  };

  const advanceTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !loggedInUser) return;
    
    const idx = STAGE_ORDER.indexOf(task.currentStage);
    if (idx < STAGE_ORDER.length - 1) {
      const next = STAGE_ORDER[idx + 1];
      const history = [...task.history];
      history[history.length - 1].endTime = Date.now();
      if (next !== RepairStage.FINISHED) {
        history.push({ stage: next, startTime: Date.now(), handler: loggedInUser.name });
      }
      await updateTaskOnCloud(taskId, { currentStage: next, history });
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => 
      t.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tasks, searchTerm]);

  const hasFullAccess = loggedInUser?.role === 'MANAGER' || loggedInUser?.role === 'CONSULTANT' || isHQ;

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6">
        <AlertCircle size={48} className="text-rose-500 mb-4" />
        <h2 className="text-xl font-black mb-2">系统连接异常</h2>
        <p className="text-slate-400 text-center max-w-md mb-6">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-white text-slate-900 px-8 py-3 rounded-2xl font-black shadow-xl">刷新页面重试</button>
      </div>
    );
  }

  if (isLoading && !loggedInUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-bold tracking-widest animate-pulse">正在安全连接主机厂数据中心...</p>
      </div>
    );
  }

  if (!loggedInUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black mx-auto mb-4 shadow-xl">精</div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">精诚智管 · 生产登录</h1>
            <p className="text-slate-400 text-sm mt-1 font-bold">后台运营/车间技师身份验证</p>
          </div>
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">工号/用户名</label>
              <input required name="username" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-bold" placeholder="例如: HQ_ADMIN" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">登录密码</label>
              <input required name="password" type="password" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-bold" placeholder="••••••••" />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 active:scale-95 transition-all mt-4">进入系统</button>
          </form>
        </div>
      </div>
    );
  }

  const NavItems = () => (
    <>
      {hasFullAccess && (
        <>
          <div className="pt-2 pb-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">管理面板</div>
          <button onClick={() => { setView('DASHBOARD'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'DASHBOARD' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutDashboard size={18} /> <span className="text-sm">效能看板</span></button>
          <button onClick={() => { setView('MAINTENANCE'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'MAINTENANCE' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}><Settings size={18} /> <span className="text-sm">组织与账号</span></button>
        </>
      )}
      <div className="pt-4 pb-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">业务执行</div>
      <button onClick={() => { setView('WORKER'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'WORKER' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}><ShieldAlert size={18} /> <span className="text-sm">工单工作台</span></button>
      <div className="mt-auto pt-8">
        {!isHQ && (
          <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl mb-2 flex items-center gap-2">
              <Building2 size={14} className="text-blue-600" />
              <span className="text-[10px] font-black text-blue-700 uppercase truncate">
                门店：{loggedInUser.shopId}
              </span>
          </div>
        )}
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all font-bold"><LogOut size={18} /> <span className="text-sm">退出系统</span></button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3"><div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">精</div><span className="font-black text-lg tracking-tight text-slate-900">精诚智管</span></div>
        <div className="p-4 border-b border-slate-50 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${isHQ ? 'bg-amber-100 text-amber-600 shadow-sm' : 'bg-blue-100 text-blue-600'}`}>
              {isHQ ? <Globe size={20}/> : loggedInUser.name[0]}
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm truncate">{loggedInUser.name}</p>
              <div className="flex items-center gap-1">
                {isHQ && <span className="text-[8px] bg-amber-500 text-white px-1 rounded">PRO</span>}
                <p className="text-[10px] text-blue-600 font-bold uppercase">{ROLE_LABELS[loggedInUser.role]}</p>
              </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 flex flex-col"><NavItems /></nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between z-30 shadow-sm">
          <div className="flex items-center gap-4">
             <div className="hidden md:relative md:block md:w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="搜索车牌或车主..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-1.5 bg-slate-100 border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
             
             {isHQ && (
               <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg ml-2">
                 <Filter size={14} className="text-slate-400" />
                 <select 
                   value={selectedShopFilter} 
                   onChange={(e) => setSelectedShopFilter(e.target.value)}
                   className="bg-transparent border-none text-xs font-black text-slate-600 outline-none"
                 >
                   <option value="ALL">全部门店数据</option>
                   {allShops.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
               </div>
             )}
          </div>

          <div className="flex items-center gap-2">
            {hasFullAccess && <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 md:px-5 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-bold shadow-sm active:scale-95 transition-all"><Plus size={16} /> <span>接车登记</span></button>}
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-slate-100 rounded-lg md:hidden text-slate-600"><Menu size={20} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
          {isLoading && <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-2" /><p className="text-xs font-bold text-slate-400">正在同步全网运营数据...</p></div>}
          {!isLoading && (
            <>
              {view === 'DASHBOARD' && hasFullAccess && <ManagerDashboard tasks={filteredTasks} role={loggedInUser.role} onToggleParts={(id) => updateTaskOnCloud(id, { isSparePartsReady: !tasks.find(t=>t.id===id)?.isSparePartsReady })} onUpdateRemarks={(id, r) => updateTaskOnCloud(id, { remarks: r })} />}
              {view === 'WORKER' && <WorkerDashboard tasks={filteredTasks} role={loggedInUser.role} onComplete={advanceTask} onToggleParts={(id) => updateTaskOnCloud(id, { isSparePartsReady: !tasks.find(t=>t.id===id)?.isSparePartsReady })} onUpdateRemarks={(id, r) => updateTaskOnCloud(id, { remarks: r })} />}
              {view === 'MAINTENANCE' && hasFullAccess && <MaintenanceView tasks={tasks} currentUser={loggedInUser} />}
            </>
          )}
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300 my-auto">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="text-blue-600" size={20} />
                <h3 className="text-lg font-black text-slate-800">事故车辆 · 进厂登记</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <form className="p-6 sm:p-8 space-y-5" onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              addTask({
                shopId: fd.get('shopId') as string,
                licensePlate: fd.get('plate') as string,
                contactPerson: fd.get('contact') as string,
                insuranceCompany: fd.get('insurance') as string,
                assessmentAmount: Number(fd.get('amount') || 0),
                expectedDeliveryTime: new Date(fd.get('expected') as string).getTime(),
                remarks: fd.get('remarks') as string
              });
            }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">所属分店</label>
                  {isHQ ? (
                    <select name="shopId" className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer">
                      {allShops.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <div className="px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-blue-600 flex items-center gap-2">
                      <Building2 size={16} /> {loggedInUser.shopId}
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">车牌号码</label>
                  <input required name="plate" defaultValue="粤A·" className="w-full px-4 py-3.5 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 font-black text-2xl uppercase tracking-tighter shadow-inner bg-slate-50/50" />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">联系人姓名</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input required name="contact" className="w-full pl-10 pr-4 py-3 border-2 border-slate-100 rounded-xl outline-none font-bold focus:border-blue-500" placeholder="例如：王先生" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">承保公司</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input required name="insurance" className="w-full pl-10 pr-4 py-3 border-2 border-slate-100 rounded-xl outline-none font-bold focus:border-blue-500" placeholder="例如：中国平安" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">预估定损金额</label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input required type="number" name="amount" className="w-full pl-10 pr-4 py-3 border-2 border-slate-100 rounded-xl outline-none font-bold focus:border-blue-500" placeholder="0.00" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">承诺交车时间</label>
                  <input required type="datetime-local" name="expected" defaultValue={getTomorrowDefaultTime()} className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold focus:border-blue-500" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">车损备注 (选填)</label>
                  <textarea name="remarks" className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none font-medium text-sm focus:border-blue-500 min-h-[80px] resize-none" placeholder="描述受损部位或备件特殊需求..." />
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full text-white font-black py-4.5 rounded-2xl mt-4 shadow-xl shadow-blue-200 bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <><Plus size={20} /> 完成登记并同步云端</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
