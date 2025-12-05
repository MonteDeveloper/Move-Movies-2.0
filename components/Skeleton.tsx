import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

export const SkeletonPulse = styled.div<{ width?: string; height?: string; radius?: string }>`
  width: ${({ width }) => width || '100%'};
  height: ${({ height }) => height || '100%'};
  border-radius: ${({ radius }) => radius || '8px'};
  background: linear-gradient(90deg, #1f1f1f 25%, #2a2a2a 50%, #1f1f1f 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;