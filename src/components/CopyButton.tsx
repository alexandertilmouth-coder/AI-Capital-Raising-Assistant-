import React, { useState } from 'react';

interface CopyButtonProps {
  textToCopy: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }, (err) => {
      console.error('Failed to copy: ', err);
    });
  };
  
  const Icon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );

  return (
    <button
      onClick={handleCopy}
      disabled={isCopied}
      className={`flex items-center text-sm px-3 py-1 rounded-md transition-colors duration-200 ${
        isCopied
          ? 'bg-green-700 text-white cursor-default'
          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
      }`}
    >
      <Icon />
      {isCopied ? 'Copied!' : 'Copy'}
    </button>
  );
};

export default CopyButton;
