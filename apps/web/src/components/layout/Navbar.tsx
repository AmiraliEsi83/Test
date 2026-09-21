import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Cpu,
  Radio,
  Briefcase,
  ListOrdered,
  History,
  BarChart3,
  FlaskConical,
  Building2,
  Workflow,
  Calendar,
  Settings,
  FileText,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const navItems = [
    { to: '/dashboard', label: 'Terminal', icon: LayoutDashboard },
    { to: '/strategies', label: 'Strategies', icon: Cpu },
    { to: '/signals', label: 'Signals', icon: Radio },
    { to: '/positions', label: 'Positions', icon: Briefcase },
    { to: '/orders', label: 'Orders', icon: ListOrdered },
    { to: '/history', label: 'History', icon: History },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/backtest', label: 'Backtest', icon: FlaskConical },
    { to: '/brokers', label: 'Brokers', icon: Building2 },
    { to: '/automation', label: 'Automation', icon: Workflow },
    { to: '/calendar', label: 'Calendar', icon: Calendar },
    { to: '/settings', label: 'Settings', icon: Settings },
    { to: '/audit', label: 'Audit Log', icon: FileText },
  ];

  return (
    <nav className="bg-[#0e131d] border-b border-[#1e2638] px-4 flex items-center gap-1 overflow-x-auto scrollbar-none">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                isActive
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#141a27]'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
