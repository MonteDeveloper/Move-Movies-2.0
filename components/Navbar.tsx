

import React from 'react';
import styled from 'styled-components';
import { NavLink } from 'react-router-dom';

const NavContainer = styled.nav`
  position: fixed;
  bottom: 0;
  width: 100%;
  height: 80px;
  background-color: #141414;
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-top: 1px solid #222;
  z-index: 1000;
  overflow: visible;
  padding-bottom: 15px;

  @media (min-width: 768px) {
    top: 0;
    bottom: auto;
    border-top: none;
    border-bottom: 1px solid #222;
  }
`;

const NavItem = styled(NavLink)`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 60px;
  height: 60px;
  color: #888;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  i {
    font-size: 24px;
    z-index: 2;
  }

  &.active {
    color: white;
    transform: translateY(-20px);
    
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 60px;
      height: 60px;
      background: ${({ theme }) => theme.primary};
      border-radius: 16px;
      box-shadow: 0 10px 20px rgba(229, 9, 20, 0.4);
      z-index: 1;
    }
  }

  &:not(.active):hover {
    color: #fff;
  }
`;

const Navbar: React.FC = () => {
  return (
    <NavContainer>
      <NavItem to="/">
        <i className="fa-solid fa-house"></i>
      </NavItem>
      <NavItem to="/discover">
        <i className="fa-solid fa-compass"></i>
      </NavItem>
      <NavItem to="/profile">
        <i className="fa-solid fa-user"></i>
      </NavItem>
    </NavContainer>
  );
};

export default Navbar;