import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface ModalItem {
  id: number;
  type: 'movie' | 'tv';
}

interface ModalContextType {
  openDetail: (id: number, type: 'movie' | 'tv') => void;
  closeDetail: () => void;
  closeAll: () => void;
  stack: ModalItem[];
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stack, setStack] = useState<ModalItem[]>([]);

  const openDetail = (id: number, type: 'movie' | 'tv') => {
    setStack(prev => [...prev, { id, type }]);
  };

  const closeDetail = () => {
    setStack(prev => prev.slice(0, -1));
  };

  const closeAll = () => {
    setStack([]);
  };

  return (
    <ModalContext.Provider value={{ openDetail, closeDetail, closeAll, stack }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModal must be used within ModalProvider');
  return context;
};
