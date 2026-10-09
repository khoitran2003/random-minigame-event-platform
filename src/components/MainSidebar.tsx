import React from 'react';
import { Dices, Brain, PanelLeftClose, PanelLeftOpen, Languages } from 'lucide-react';
import { MainTab } from '../types';
import { useLanguage } from '../LanguageContext';

interface MainSidebarProps {
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function MainSidebar({ activeTab, onChangeTab, collapsed, onToggleCollapse }: MainSidebarProps) {
  const { t, lang, setLang } = useLanguage();

  const items: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'RANDOM_GAMES', label: t('sidebar.randomGames'), icon: <Dices className="w-5 h-5 shrink-0" /> },
    { id: 'KAHUT', label: t('sidebar.kahut'), icon: <Brain className="w-5 h-5 shrink-0" /> },
  ];

  const itemClass = (active: boolean) =>
    `flex items-center gap-3 w-full h-11 px-3.5 rounded-2xl font-bold border transition-all overflow-hidden whitespace-nowrap ${
      active
        ? 'bg-white/10 border-white/20 text-brand-gold'
        : 'bg-transparent border-transparent text-white/80 hover:bg-white/5 hover:border-white/10'
    }`;

  return (
    <aside
      className={`relative z-20 shrink-0 h-screen flex flex-col gap-2 p-3 liquid-glass-dark border-r border-white/10 transition-[width] duration-300 ease-in-out ${
        collapsed ? 'w-[72px]' : 'w-60'
      }`}
    >
      <button
        onClick={onToggleCollapse}
        title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        className={itemClass(false)}
      >
        {collapsed ? <PanelLeftOpen className="w-5 h-5 shrink-0" /> : <PanelLeftClose className="w-5 h-5 shrink-0" />}
        {!collapsed && <span>{t('sidebar.collapse')}</span>}
      </button>

      <nav className="flex flex-col gap-2 mt-2">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onChangeTab(item.id)}
            title={item.label}
            aria-current={activeTab === item.id ? 'page' : undefined}
            className={itemClass(activeTab === item.id)}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <button
        onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
        title={t('sidebar.language')}
        className={`${itemClass(false)} mt-auto`}
      >
        <Languages className="w-5 h-5 shrink-0" />
        {!collapsed && <span>{lang === 'en' ? 'English' : 'Tiếng Việt'}</span>}
      </button>
    </aside>
  );
}
