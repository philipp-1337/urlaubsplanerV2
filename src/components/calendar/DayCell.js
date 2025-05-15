import React from 'react';

const DayCell = ({ 
  day, 
  status, 
  isWeekend, 
  onClick, 
  view = 'monthly' // monthly or calendar
}) => {
  let cellClass = '';
  let cellContent = '';
  
  if (isWeekend) {
    cellClass = view === 'calendar' 
      ? "p-2 bg-gray-300 rounded" 
      : "p-2 text-center border min-w-[50px] bg-gray-200";
  } else {
    if (view === 'calendar') {
      cellClass = "p-2 rounded cursor-pointer";
      
      if (status === 'urlaub') {
        cellClass += " bg-blue-500 text-white";
      } else if (status === 'durchfuehrung') {
        cellClass += " bg-green-500 text-white";
      } else {
        cellClass += " bg-white border border-gray-300 hover:bg-gray-100";
      }
    } else {
      cellClass = "p-2 text-center border min-w-[50px] cursor-pointer hover:bg-black-50";
      
      if (status === 'urlaub') {
        cellClass += " bg-blue-500 text-white hover:bg-blue-600";
        cellContent = "U";
      } else if (status === 'durchfuehrung') {
        cellClass += " bg-green-500 text-white hover:bg-green-600";
        cellContent = "D";
      }
    }
  }
  
  const handleClick = () => {
    if (!isWeekend && onClick) {
      onClick();
    }
  };
  
  return (
    <div className={cellClass} onClick={handleClick}>
      {view === 'calendar' ? day.tag : cellContent}
    </div>
  );
};

export default DayCell;