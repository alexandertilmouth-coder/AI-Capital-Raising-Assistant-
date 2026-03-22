import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

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

  return (
    <button
      onClick={handleCopy}
      disabled={isCopied}
      className={`flex items-center text-sm px-3 py-1.5 rounded-lg transition-colors duration-200 ${
        isCopied
          ? 'bg-green-100 text-green-700 cursor-default'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
      }`}
    >
      {isCopied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
      {isCopied ? 'Copied!' : 'Copy'}
    </button>
  );
};

export default CopyButton;
