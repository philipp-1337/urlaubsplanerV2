import React from 'react';

const LoadingIndicator = ({ message = "Laden..." }) => {
  return (
    <div className="p-4 text-center text-gray-700">
      <p>{message}</p>
    </div>
  );
};

export default LoadingIndicator;