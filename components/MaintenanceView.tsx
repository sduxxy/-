
import React, { useState } from 'react';
import { Staff, InsuranceCompany, RepairTask, Role, Vehicle } from '../types';
import { User, Shield, Briefcase, Car, Plus, Trash2, Building2, Save, X, Search, ChevronRight } from 'lucide-react';

interface Props {
  staff: Staff[];
  insurers: InsuranceCompany[];
  vehicles: Vehicle[];
  tasks: RepairTask[];
  onUpdateStaff: (staff: Staff[]) => void;
  onUpdateInsurers: (insurers: InsuranceCompany[]) => void;
  onUpdateVehicles: (vehicles: Vehicle[]) => void;
}

const MaintenanceView: React.FC<Props> = ({ staff, insurers, vehicles, tasks, onUpdateStaff, onUpdateInsurers, onUpdateVehicles }) => {
  const [activeTab, setActiveTab] = useState<'STAFF' | 'INSURERS' | 'VEHICLES'>('STAFF');
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  // Fix: changed 'WORKER' to 'METALWORKER' as 'WORKER' is not a valid Role type in types.ts
  const [newStaff, setNewStaff] = useState<{name: string, role: Role}>({name: '', role: 'METALWORKER'});
  const [newInsurerName, setNewInsurerName] = useState('');
  const [newVehicle, setNewVehicle] = useState({plate: '', owner: ''});

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name) return;
    onUpdateStaff([...staff, { id: Date.now().toString(), name: newStaff.name, role: newStaff.role }]);
    // Fix: changed 'WORKER' to 'METALWORKER' as 'WORKER' is not a valid Role type in types.ts
    setNewStaff({name: '', role: 'METALWORKER'});
    setIsAdding(false);
  };

  const handleAddInsurer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInsurerName) return;
    onUpdateInsurers([...insurers, { id: Date.now().toString(), name: newInsurerName }]);
    setNewInsurerName('');
    setIsAdding(false);
  };

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.plate) return;
    onUpdateVehicles([...vehicles, { id: Date.now().toString(), licensePlate: newVehicle.plate, ownerName: newVehicle.owner }]);
    setNewVehicle({plate: '', owner: ''});
    setIsAdding(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-1 flex gap-1">
        <button 
          onClick={() => { setActiveTab('STAFF'); setIsAdding(false); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'STAFF' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <User size={18} /> 人员管理
        </button>
        <button 
          onClick={() => { setActiveTab('INSURERS'); setIsAdding(false); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'INSURERS' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Building2 size={18} /> 保司维护
        </button>
        <button 
          onClick={() => { setActiveTab('VEHICLES'); setIsAdding(false); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'VEHICLES' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Car size={18} /> 车辆档案
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
        {activeTab === 'STAFF' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-slate-800">在职员工</h3>
                <p className="text-xs text-slate-400 mt-0.5">管理员可定义顾问与技师的系统权限</p>
              </div>
              <button 
                onClick={() => setIsAdding(!isAdding)} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isAdding ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white'}`}
              >
                {isAdding ? <X size={16} /> : <Plus size={16} />}
                {isAdding ? '取消' : '新增人员'}
              </button>
            </div>

            {isAdding && (
              <form onSubmit={handleAddStaff} className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap gap-4 items-end animate-in slide-in-from-top-2 duration-300">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">姓名</label>
                  <input autoFocus required value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" placeholder="员工真实姓名" />
                </div>
                <div className="w-48">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">系统角色</label>
                  <select value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value as Role})} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500">
                    {/* Fix: replaced invalid 'WORKER' values with correct Role options */}
                    <option value="METALWORKER">钣金技师</option>
                    <option value="PAINTER">喷漆技师</option>
                    <option value="CONSULTANT">理赔顾问</option>
                    <option value="SPARE_PARTS">备件中心</option>
                    <option value="MANAGER">超级管理</option>
                  </select>
                </div>
                <button type="submit" className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 transition-colors"><Save size={18} /></button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {staff.map(s => (
                <div key={s.id} className="p-4 border border-slate-100 rounded-2xl flex items-center gap-4 hover:border-blue-200 hover:bg-blue-50/10 transition-all group">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${s.role === 'MANAGER' ? 'bg-purple-100 text-purple-600' : s.role === 'CONSULTANT' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                    {s.role === 'MANAGER' ? <Shield size={20} /> : <User size={20} />}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{s.name}</p>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      {s.role}
                    </div>
                  </div>
                  <button onClick={() => onUpdateStaff(staff.filter(x => x.id !== s.id))} className="text-slate-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'INSURERS' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-slate-800">合作保司白名单</h3>
                <p className="text-xs text-slate-400 mt-0.5">登记任务时可快速从此处选择</p>
              </div>
              <button 
                onClick={() => setIsAdding(!isAdding)} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isAdding ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white'}`}
              >
                {isAdding ? <X size={16} /> : <Plus size={16} />}
                {isAdding ? '取消' : '新增保司'}
              </button>
            </div>

            {isAdding && (
              <form onSubmit={handleAddInsurer} className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 flex gap-4 items-end animate-in slide-in-from-top-2 duration-300">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">保险公司全称</label>
                  <input autoFocus required value={newInsurerName} onChange={e => setNewInsurerName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" placeholder="例如：中国人寿" />
                </div>
                <button type="submit" className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 transition-colors"><Save size={18} /></button>
              </form>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {insurers.map(i => (
                <div key={i.id} className="p-4 bg-slate-50 border border-transparent rounded-2xl flex justify-between items-center group hover:bg-white hover:border-slate-200 transition-all">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-slate-400" />
                    <span className="font-medium text-slate-700">{i.name}</span>
                  </div>
                  <button onClick={() => onUpdateInsurers(insurers.filter(x => x.id !== i.id))} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'VEHICLES' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-slate-800">车辆资产档案</h3>
                <p className="text-xs text-slate-400 mt-0.5">历史进场车辆信息，新建任务时输入车牌可自动联想</p>
              </div>
              <button 
                onClick={() => setIsAdding(!isAdding)} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isAdding ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white'}`}
              >
                {isAdding ? <X size={16} /> : <Plus size={16} />}
                {isAdding ? '取消' : '手动录入'}
              </button>
            </div>

            {isAdding && (
              <form onSubmit={handleAddVehicle} className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap gap-4 items-end animate-in slide-in-from-top-2 duration-300">
                <div className="w-48">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">车牌号码</label>
                  <input autoFocus required value={newVehicle.plate} onChange={e => setNewVehicle({...newVehicle, plate: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="京A·88888" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">车主姓名</label>
                  <input required value={newVehicle.owner} onChange={e => setNewVehicle({...newVehicle, owner: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" placeholder="登记联系人" />
                </div>
                <button type="submit" className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 transition-colors"><Save size={18} /></button>
              </form>
            )}

            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-4">车牌号码</th>
                    <th className="px-6 py-4">车主</th>
                    <th className="px-6 py-4">曾修记录</th>
                    <th className="px-6 py-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {vehicles.length === 0 ? (
                    <tr><td colSpan={4} className="py-20 text-center text-slate-300">暂无档案数据</td></tr>
                  ) : (
                    vehicles.map(v => (
                      <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-4">
                           <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-md font-bold text-base inline-block border border-blue-100">
                              {v.licensePlate}
                           </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">{v.ownerName}</td>
                        <td className="px-6 py-4">
                           <span className="text-xs text-slate-400">
                              进场 {tasks.filter(t => t.licensePlate === v.licensePlate).length} 次
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => onUpdateVehicles(vehicles.filter(x => x.id !== v.id))} className="text-slate-300 hover:text-red-500 p-2 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceView;
