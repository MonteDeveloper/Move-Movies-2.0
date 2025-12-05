
import React from 'react';
import styled from 'styled-components';

const SearchContainer = styled.div`
  position: relative;
  width: 100%;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 40px 12px 15px;
  border-radius: 8px;
  border: 1px solid #333;
  background-color: ${({ theme }) => theme.backgroundLight};
  color: white;
  font-size: 16px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.primary};
  }
`;

const IconWrapper = styled.div`
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    color: #888;
    pointer-events: none;
`;

const ClearButton = styled.button`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  color: #888;
  font-size: 16px;
  padding: 5px;
  cursor: pointer;

  &:hover {
      color: white;
  }
`;

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<Props> = ({ value, onChange, placeholder }) => {
  return (
    <SearchContainer>
      <Input 
        type="text" 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder}
      />
      {value ? (
        <ClearButton onClick={() => onChange('')}>
           <i className="fa-solid fa-times"></i>
        </ClearButton>
      ) : (
        <IconWrapper>
           <i className="fa-solid fa-search"></i>
        </IconWrapper>
      )}
    </SearchContainer>
  );
};

export default SearchBar;
