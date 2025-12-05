import React, { useEffect } from 'react';
import { useModal } from '../contexts/ModalContext';
import DetailPage from '../pages/DetailPage';

const ModalRenderer: React.FC = () => {
  const { stack, closeDetail, closeAll } = useModal();

  // 1) Lock body scroll when any modal is open
  useEffect(() => {
    if (stack.length > 0) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [stack.length]);

  if (stack.length === 0) return null;

  return (
    <>
      {stack.map((item, index) => (
        <DetailPage
          key={`${item.type}-${item.id}-${index}`}
          id={item.id}
          type={item.type}
          zIndex={2000 + index}
          onClose={closeDetail}
          onCloseAll={closeAll}
        />
      ))}
    </>
  );
};

export default ModalRenderer;