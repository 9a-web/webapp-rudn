/**
 * Контекст для Telegram WebApp
 * Предоставляет доступ к данным пользователя Telegram и функциям WebApp API
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

const TelegramContext = createContext(null);

export const useTelegram = () => {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within TelegramProvider');
  }
  return context;
};

export const TelegramProvider = ({ children }) => {
  const [webApp, setWebApp] = useState(null);
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Инициализация Telegram WebApp
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Настройка для полноэкранного режима
      tg.ready();
      
      // Расширяем WebApp на весь экран
      tg.expand();
      
      // Отключаем вертикальные свайпы (для лучшего UX)
      if (tg.disableVerticalSwipes) {
        tg.disableVerticalSwipes();
      }
      
      // Включаем закрытие по свайпу вниз (если поддерживается)
      if (tg.enableClosingConfirmation) {
        tg.enableClosingConfirmation();
      }
      
      // Устанавливаем цвета темы для нативного вида
      if (tg.setHeaderColor) {
        tg.setHeaderColor('#1C1C1E');
      }
      if (tg.setBackgroundColor) {
        tg.setBackgroundColor('#1C1C1E');
      }
      
      // Устанавливаем цвет bottom bar (если поддерживается)
      if (tg.setBottomBarColor) {
        tg.setBottomBarColor('#1C1C1E');
      }
      
      // Получаем данные пользователя
      const userData = tg.initDataUnsafe?.user;
      
      setWebApp(tg);
      
      // Если пользователь есть - используем его, иначе mock данные
      if (userData) {
        setUser(userData);
      } else {
        // Mock данные для разработки вне Telegram
        console.warn('Telegram user not found. Using mock data for development.');
        setUser({
          id: 123456789,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser',
        });
      }
      
      setIsReady(true);

      console.log('Telegram WebApp initialized:', {
        platform: tg.platform,
        version: tg.version,
        user: userData || 'mock',
      });
    } else {
      // Для разработки вне Telegram - используем mock данные
      console.warn('Telegram WebApp не доступен. Используются mock данные для разработки.');
      setUser({
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
      });
      setIsReady(true);
    }
  }, []);

  const showAlert = (message) => {
    if (webApp) {
      webApp.showAlert(message);
    } else {
      alert(message);
    }
  };

  const showConfirm = (message) => {
    return new Promise((resolve) => {
      if (webApp) {
        webApp.showConfirm(message, resolve);
      } else {
        resolve(window.confirm(message));
      }
    });
  };

  const showPopup = (params) => {
    return new Promise((resolve) => {
      if (webApp) {
        webApp.showPopup(params, resolve);
      } else {
        alert(params.message);
        resolve(null);
      }
    });
  };

  const close = () => {
    if (webApp) {
      webApp.close();
    }
  };

  const sendData = (data) => {
    if (webApp) {
      webApp.sendData(JSON.stringify(data));
    }
  };

  const openLink = (url, options = {}) => {
    if (webApp) {
      webApp.openLink(url, options);
    } else {
      window.open(url, '_blank');
    }
  };

  const hapticFeedback = (type = 'impact', style = 'medium') => {
    if (webApp?.HapticFeedback) {
      if (type === 'impact') {
        webApp.HapticFeedback.impactOccurred(style);
      } else if (type === 'notification') {
        webApp.HapticFeedback.notificationOccurred(style);
      } else if (type === 'selection') {
        webApp.HapticFeedback.selectionChanged();
      }
    }
  };

  const value = {
    webApp,
    user,
    isReady,
    showAlert,
    showConfirm,
    showPopup,
    close,
    sendData,
    openLink,
    hapticFeedback,
  };

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
};

export default TelegramContext;
