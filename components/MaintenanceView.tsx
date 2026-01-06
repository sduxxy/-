
import React, { useState, useEffect, useMemo } from 'react';
import { Staff, RepairTask, Role, ROLE_LABELS } from '../types';
import { 
  User, Shield, Plus, X, Loader2, Key, RefreshCw, FileText, Upload, 
  CheckCircle2, AlertCircle, Building2, Save, Users, Table, Search, 
  Lock, Globe, Unlock, Trash2, ChevronLeft, ChevronRight, AlertTriangle, Info,
  ExternalLink, ArrowRight
} from 'lucide-react';

interface Props {
  tasks: RepairTask[];
  currentUser: Staff;
}

interface BatchUser {
  username: string;
  name: string;
  password: string;
  role: Role;
  shopId: string;
  status: 'PENDING' | 'SYNCING' | 'SUCCESS' | 'ERROR';
  errorMsg?: string;
}

const MaintenanceView: React.FC<Props> = ({ tasks, currentUser }) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMode, setActiveMode] = useState<'NONE' | 'SINGLE' | 'BATCH'>('NONE');
  const [isSyncing, setIsSyncing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);
  
  const [selectedShopView, setSelectedShopView] = useState<string | null>(null);

  const isHQ = currentUser.role === 'HQ_OPERATOR';

  const [newStaff, setNewStaff] = useState({
    username: '', name: '', role: 'METALWORKER' as Role, password: '', shopId: currentUser.shopId
  });
  
  const [batchData, setBatchData] = useState<BatchUser[]>([]);
  const [rawText, setRawText] = useState('');

  const getAV = () => (window as any).AV;

  useEffect(() => {
    if (selectedShopView) {
      setNewStaff(prev => ({ ...prev, shopId: selectedShopView }));
    } else {
      setNewStaff(prev => ({ ...prev, shopId: currentUser.shopId }));
    }
  }, [selectedShopView, currentUser.shopId]);

  const fetchStaff = async (isInitial = false) => {
    const AV = getAV();
    if (!AV) return;
    if (isInitial) setIsLoading(true);
    setFetchError(null);
    
    try {
      const query = new AV.Query('_User');
      if (!isHQ) {
        query.equalTo('shopId', currentUser.shopId);
      }
      query.descending('createdAt');
      query.limit(1000); 
      
      const results = await query.find();
      const mapped = results.map((u: any) => {
        const userData = u.toJSON();
        return {
          id: u.id,
          name: u.get('name') || userData.name || '(未授权读取姓名)',
          role: u.get('role') || userData.role || '(未授权)',
          username: u.get('username') || userData.username,
          shopId: u.get('shopId') || userData.shopId
        };
      });

      const hasPermissionIssue = mapped.some(s => !s.shopId && s.username !== currentUser.username);
      if (hasPermissionIssue) setShowPermissionGuide(true);

      setStaff(mapped);
    } catch (err: any) {
      console.error('获取名册失败:', err);
      setFetchError(err.message || '网络查询异常');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    if (currentUser) fetchStaff(true); 
  }, [currentUser.shopId, currentUser.role]);

  const handleParseBatch = () => {
    if (!rawText.trim()) return;
    const lines = rawText.trim().split('\n');
    
    const parsed: BatchUser[] = lines.map(line => {
      const cols = line.split(/[,\t，]/).map(c => c?.trim()).filter(c => c !== "");
      const count = cols.length;

      let username = '', name = '', password = '123456', roleStr = '', shopId = '';

      if (count === 2) [username, name] = cols;
      else if (count === 3) [username, name, roleStr] = cols;
      else if (count === 4) [username, name, roleStr, shopId] = cols;
      else if (count >= 5) [username, name, password, roleStr, shopId] = cols;

      let role: Role = 'METALWORKER';
      if (roleStr) {
        if (/运营|总部|HQ|管理员/.test(roleStr)) role = 'HQ_OPERATOR';
        else if (/理赔|顾问|客服/.test(roleStr)) role = 'CONSULTANT';
        else if (/喷漆/.test(roleStr)) role = 'PAINTER';
        else if (/备件|库管/.test(roleStr)) role = 'SPARE_PARTS';
        else if (/总监|经理|店长/.test(roleStr)) role = 'MANAGER';
      }

      const finalShopId = shopId || selectedShopView || currentUser.shopId;

      return {
        username, name, password, role, shopId: finalShopId, status: 'PENDING'
      } as BatchUser;
    }).filter(u => u.username && u.name);

    setBatchData(parsed);
  };

  const executeBatchImport = async () => {
    const AV = getAV();
    if (!AV || batchData.length === 0) return;

    setIsSyncing(true);
    const adminToken = AV.User.current()?.getSessionToken();
    const updatedData = [...batchData];

    for (let i = 0; i < updatedData.length; i++) {
      if (updatedData[i].status === 'SUCCESS') continue;
      updatedData[i].status = 'SYNCING';
      setBatchData([...updatedData]);

      try {
        const user = new AV.User();
        user.setUsername(updatedData[i].username);
        user.setPassword(updatedData[i].password);
        user.set('name', updatedData[i].name);
        user.set('role', updatedData[i].role);
        user.set('shopId', updatedData[i].shopId);

        await user.signUp();
        if (adminToken) await AV.User.become(adminToken);
        updatedData[i].status = 'SUCCESS';
      } catch (err: any) {
        updatedData[i].status = 'ERROR';
        updatedData[i].errorMsg = err.code === 202 ? '工号已存在' : err.message;
        if (adminToken) try { await AV.User.become(adminToken); } catch(e) {}
      }
      setBatchData([...updatedData]);
    }

    setIsSyncing(false);
    alert('批量导入完成');
    await fetchStaff();
  };

  const shopStats = useMemo(() => {
    const stats: Record<string, number> = {};
    staff.forEach(s => {
      const sid = s.shopId || '权限受限(不可见)';
      stats[sid] = (stats[sid] || 0) + 1;
    });
    return Object.entries(stats).map(([name, count]) => ({ name, count }));
  }, [staff]);

  const currentViewStaff = useMemo(() => {
    if (!isHQ || !selectedShopView) return staff;
    return staff.filter(s => s.shopId === selectedShopView);
  }, [staff, isHQ, selectedShopView]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* 核心排错引导 */}
      {showPermissionGuide && (
        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[32px] animate-in slide-in-from-top-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-amber-200"><Shield size={24} /></div>
            <div className="flex-1">
              <h4 className="font-black text-amber-900 text-lg">检测到数据读取受阻</h4>
              <p className="text-amber-800 text-sm font-bold mt-1">云端数据存在但前端无法显示门店名称。请前往 LeanCloud 控制台配置 _User 表权限。</p>
            </div>
            <button onClick={() => setShowPermissionGuide(false)} className="text-amber-400 hover:text-amber-600"><X size={20}/></button>
          </div>
        </div>
      )}

      {isHQ && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-[32px] text-white flex flex-col md:flex-row md:items-center justify-between shadow-2xl gap-4 border border-white/10">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20"><Globe size={24} /></div>
              <div>
                <h4 className="font-black text-lg uppercase tracking-wider">主机厂全网管理后台</h4>
                <p className="text-xs font-bold text-slate-400">已探测到 {shopStats.length} 个门店单元</p>
              </div>
           </div>
           <button onClick={() => fetchStaff(true)} className="bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 border border-white/5">
             <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> 强制同步云端
           </button>
        </div>
      )}

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            {isHQ && selectedShopView && (
              <button onClick={() => setSelectedShopView(null)} className="flex items-center gap-2 text-blue-600 font-black text-sm mb-2 group">
                <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 返回门店列表
              </button>
            )}
            <h3 className="font-black text-2xl text-slate-800 tracking-tight">
              {isHQ ? (selectedShopView ? `门店管理：${selectedShopView}` : '全网门店概览') : '本分店组织架构'}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
               {selectedShopView ? '查看与管理分店员工' : '实时监控全网各分店运营规模'}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
             <button onClick={() => setActiveMode(activeMode === 'BATCH' ? 'NONE' : 'BATCH')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all ${activeMode === 'BATCH' ? 'bg-slate-100 text-slate-600' : 'bg-slate-900 text-white shadow-xl'}`}>
               <Table size={18} /> 批量录入
             </button>
             <button onClick={() => setActiveMode(activeMode === 'SINGLE' ? 'NONE' : 'SINGLE')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all ${activeMode === 'SINGLE' ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white shadow-xl'}`}>
               {activeMode === 'SINGLE' ? <X size={18} /> : <Plus size={18} />} {activeMode === 'SINGLE' ? '取消' : '单员录入'}
             </button>
          </div>
        </div>

        {activeMode === 'BATCH' && (
          <div className="mb-8 p-6 md:p-8 bg-slate-50 rounded-[32px] border border-slate-200 animate-in slide-in-from-top-4">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg"><FileText size={24} /></div>
               <div className="flex-1">
                  <h4 className="font-black text-slate-800">批量数据精准匹配</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    支持格式：工号, 姓名, 岗位, 门店 (例如：S101, 王五, 钣金, 杭州分店)
                  </p>
               </div>
            </div>
            {batchData.length === 0 ? (
              <div className="space-y-4">
                <textarea 
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="工号, 姓名, 岗位, 门店名称 (支持从Excel直接粘贴)\n示例：\nS001, 张三, 理赔, 杭州分店\nS002, 李四, 钣金, 上海分店"
                  className="w-full h-48 p-5 rounded-2xl border-2 border-dashed border-slate-200 focus:border-blue-500 bg-white outline-none font-mono text-sm shadow-inner"
                />
                <button onClick={handleParseBatch} disabled={!rawText.trim()} className="bg-slate-900 text-white px-10 py-3.5 rounded-xl font-black flex items-center gap-2 disabled:opacity-30">
                  <Search size={18} /> 立即校验预览
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">工号</th>
                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">姓名</th>
                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">解析岗位</th>
                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">分配门店</th>
                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchData.map((u, i) => (
                        <tr key={i} className="border-b last:border-none">
                          <td className="px-5 py-4 font-mono font-bold text-slate-600 text-sm">{u.username}</td>
                          <td className="px-5 py-4 font-black text-slate-800 text-sm">{u.name}</td>
                          <td className="px-5 py-4 text-xs font-bold text-slate-500">{ROLE_LABELS[u.role]}</td>
                          <td className="px-5 py-4"><span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full flex items-center w-fit gap-1"><Building2 size={12}/> {u.shopId}</span></td>
                          <td className="px-5 py-4">
                            {u.status === 'PENDING' && <span className="text-slate-300 text-[10px] font-black">等待执行</span>}
                            {u.status === 'SYNCING' && <Loader2 className="animate-spin text-blue-500" size={14} />}
                            {u.status === 'SUCCESS' && <CheckCircle2 className="text-emerald-500" size={14} />}
                            {u.status === 'ERROR' && (
                              <span title={u.errorMsg}>
                                <AlertCircle className="text-rose-500" size={14} />
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-4">
                  <button onClick={executeBatchImport} disabled={isSyncing} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-black shadow-xl flex items-center justify-center gap-3">
                    {isSyncing ? <Loader2 className="animate-spin" /> : <Upload size={20} />} 确认识别无误，开始同步云端
                  </button>
                  <button onClick={() => { setBatchData([]); setRawText(''); }} disabled={isSyncing} className="px-8 py-4 rounded-xl border-2 text-slate-500 font-black">放弃重填</button>
                </div>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="py-32 text-center flex flex-col items-center gap-4"><Loader2 className="animate-spin text-blue-600" size={48} /><p className="text-slate-400 font-bold text-sm tracking-widest uppercase animate-pulse">正在穿透云端数据库...</p></div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {isHQ && !selectedShopView ? (
              /* --- 重构后的门店列表表格 --- */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b-2">
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">门店名称</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">在册人数</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">状态</th>
                      <th className="px-6 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {shopStats.map(shop => (
                      <tr key={shop.name} onClick={() => setSelectedShopView(shop.name)} className="group cursor-pointer hover:bg-slate-50/80 transition-all">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                              <Building2 size={20} />
                            </div>
                            <div>
                               <p className="font-black text-slate-800 group-hover:text-blue-600 transition-colors">{shop.name}</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase">Shop Unit</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 font-black text-xs">
                            {shop.count} 人
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                             <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operational</span>
                             {shop.name.includes('权限受限') && (
                               <div className="ml-2 flex items-center gap-1 text-amber-500" title="该门店数据由于权限原因无法完整显示">
                                 <AlertTriangle size={14} />
                               </div>
                             )}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all">
                            进入管理 <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {shopStats.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-24 text-center">
                          <div className="flex flex-col items-center gap-3 text-slate-300">
                             <Search size={48} className="opacity-10" />
                             <p className="font-black uppercase tracking-widest text-sm">暂未发现任何注册门店</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* --- 员工名册表格 --- */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b-2">
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">员工工号</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">真实姓名</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">所属岗位</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">所属单位</th>
                      <th className="px-6 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {currentViewStaff.map(s => (
                      <tr key={s.id} className="group hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-5"><span className="font-bold text-slate-600 font-mono tracking-tight">{s.username}</span></td>
                        <td className="px-6 py-5"><span className="font-black text-slate-800">{s.name}</span></td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${s.role === 'HQ_OPERATOR' ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>
                            {s.role === 'HQ_OPERATOR' ? <Globe size={10} /> : <User size={10} />} {ROLE_LABELS[s.role] || s.role}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className={`flex items-center gap-2 text-xs font-bold ${s.shopId ? 'text-slate-400' : 'text-amber-500'}`}>
                            <Building2 size={14} /> {s.shopId || '权限受阻(无法公开读取)'}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Key size={16} /></button>
                            {isHQ && s.id !== currentUser.id && (
                              <button onClick={() => fetchStaff(true)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="删除员工账户">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {currentViewStaff.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-3 text-slate-300">
                             <Users size={48} className="opacity-10" />
                             <p className="font-black uppercase tracking-widest text-sm">该分店暂无在册员工</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceView;
