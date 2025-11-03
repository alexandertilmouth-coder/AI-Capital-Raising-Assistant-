import React from 'react';

interface CardProps {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, icon, actions, children }) => {
  return (
    <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
      <div className="bg-gray-800/50 p-4 border-b border-gray-700 flex justify-between items-center">
        <h3 className="text-xl font-bold text-cyan-400 flex items-center">
          {icon}
          {title}
        </h3>
        <div>{actions}</div>
      </div>
      <div className="p-6 text-gray-300 leading-relaxed">
        {children}
      </div>
    </div>
  );
};

export default Card;
