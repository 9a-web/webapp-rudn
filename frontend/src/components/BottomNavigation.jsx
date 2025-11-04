import React from 'react';
import { Home, ClipboardList, FileCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export const BottomNavigation = ({ activeTab = 'home', onTabChange, hapticFeedback }) => {
  const { t } = useTranslation();

  const tabs = [
    {
      id: 'home',
      icon: Home,
      label: t('bottomNav.home', 'Главный экран'),
      gradient: 'from-green-400 to-cyan-400'
    },
    {
      id: 'tasks',
      icon: ClipboardList,
      label: t('bottomNav.tasks', 'Список дел'),
      gradient: 'from-yellow-400 to-orange-400'
    },
    {
      id: 'journal',
      icon: FileCheck,
      label: t('bottomNav.journal', 'Журнал'),
      gradient: 'from-purple-400 to-pink-400'
    }
  ];

  const handleTabClick = (tabId) => {
    if (hapticFeedback?.impactOccurred) {
      try {
        hapticFeedback.impactOccurred('light');
      } catch (e) {
        // Haptic feedback not available
      }
    }
    onTabChange?.(tabId);
  };

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
      style={{ width: '370px', height: '75px' }}
    >
      {/* Main navigation with rounded corners */}
      <div className="relative h-full">
        {/* Background with blur and border */}
        <div 
          className="absolute inset-0 bg-[#1C1C1E]/95 backdrop-blur-xl border border-white/10"
          style={{ borderRadius: '80px' }}
        />
        
        {/* Content container */}
        <div className="relative h-full px-4 py-2">
          <div className="flex items-center justify-around gap-2 h-full">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    whileTap={{ scale: 0.92 }}
                    className="relative flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-300 touch-manipulation"
                    style={{
                      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent'
                    }}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 rounded-2xl bg-white/5"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}

                    {/* Icon with gradient */}
                    <div className="relative">
                      {isActive ? (
                        <div className={`bg-gradient-to-br ${tab.gradient} p-0.5 rounded-xl`}>
                          <div className="bg-[#1C1C1E] rounded-xl p-1.5">
                            <Icon 
                              className="w-5 h-5 text-white relative z-10" 
                              strokeWidth={2.5}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="p-2">
                          <Icon 
                            className="w-5 h-5 text-[#999999] transition-colors duration-300" 
                            strokeWidth={2}
                          />
                        </div>
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className={`
                        mt-1 text-[10px] font-medium transition-all duration-300 relative z-10
                        ${isActive 
                          ? 'text-white' 
                          : 'text-[#999999]'
                        }
                      `}
                    >
                      {tab.label}
                    </span>

                    {/* Active glow effect */}
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`absolute inset-0 bg-gradient-to-br ${tab.gradient} opacity-10 blur-xl rounded-2xl`}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};
