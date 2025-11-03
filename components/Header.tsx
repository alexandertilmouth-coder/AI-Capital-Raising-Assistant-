import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-800/30 backdrop-blur-md p-4 sticky top-0 z-10 border-b border-gray-700 shadow-lg">
      <div className="container mx-auto text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-cyan-400 tracking-wide">
          Capital Raising Agent
        </h1>
        <p className="text-gray-400 mt-1">
          Accelerate Your Fundraising Workflow
        </p>
      </div>
    </header>
  );
};

export default Header;