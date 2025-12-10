import React from 'react';
import styled from 'styled-components';

const Container = styled.div<{ $visible: boolean }>`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(50, 50, 50, 0.95);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  z-index: 2000;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.3s ease-in-out;
  pointer-events: none;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
`;

interface Props {
  message: string;
  isVisible: boolean;
}

const Snackbar: React.FC<Props> = ({ message, isVisible }) => {
  return (
    <Container $visible={isVisible}>
      {message}
    </Container>
  );
};

export default Snackbar;