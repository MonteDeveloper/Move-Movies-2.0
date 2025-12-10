
import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
`;

const ModalCard = styled.div`
  background: ${({ theme }) => theme.backgroundLight};
  padding: 24px;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  border: 1px solid #333;
`;

const Title = styled.h3`
  font-size: 18px;
  margin-bottom: 12px;
  color: ${({ theme }) => theme.text};
`;

const Message = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.textSecondary};
  margin-bottom: 24px;
  line-height: 1.5;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  background: ${props => 
    props.$variant === 'danger' ? '#d63031' : 
    props.$variant === 'primary' ? props.theme.primary : 
    '#333'};
  color: white;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }
`;

interface Props {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  hideCancel?: boolean;
}

const ConfirmationModal: React.FC<Props> = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText,
  cancelText,
  isDanger = false,
  hideCancel = false
}) => {
  const { t } = useTranslation();
  
  if (!isOpen) return null;

  return (
    <Overlay onClick={onCancel}>
      <ModalCard onClick={e => e.stopPropagation()}>
        {title && <Title>{title}</Title>}
        <Message>{message}</Message>
        <ButtonRow>
          {!hideCancel && (
            <Button $variant="secondary" onClick={onCancel}>
              {cancelText || t('cancel')}
            </Button>
          )}
          <Button $variant={isDanger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmText || t('confirm')}
          </Button>
        </ButtonRow>
      </ModalCard>
    </Overlay>
  );
};

export default ConfirmationModal;